import { hasUnsyncedChanges, synchronize } from "@nozbe/watermelondb/sync"
import database from "."
import { HIKMA_API } from "@env"
import { Alert } from "react-native"
import { interpret } from "xstate"
import { syncMachine } from "../components/state_machines/sync"
import EncryptedStorage from "react-native-encrypted-storage"

global.Buffer = require('buffer').Buffer;


const SYNC_API = `${HIKMA_API}/api/v2/sync`

const syncServiceT = interpret(syncMachine)

export async function syncDB(syncService: typeof syncServiceT, hasLocalChangesToPush: boolean) {
  const email = await EncryptedStorage.getItem("provider_email");
  const password = await EncryptedStorage.getItem("provider_password");

  console.log(email, password)

  const buffer = Buffer.from(`${email}:${password}`);
  const encodedUsernameAndPassword = buffer.toString('base64');

  const headers = new Headers();
  headers.append('Authorization', 'Basic ' + encodedUsernameAndPassword);
  console.log('Basic ' + encodedUsernameAndPassword);

  await synchronize({
    database,
    sendCreatedAsUpdated: false,
    pullChanges: async ({ lastPulledAt, schemaVersion, migration }) => {
      // const hasRecordsToUpload = await hasUnsyncedChanges({database});
      // console.warn({hasRecordsToUpload});
      const urlParams = `last_pulled_at=${lastPulledAt}&schema_version=${schemaVersion}&migration=${encodeURIComponent(
        JSON.stringify(migration),
      )}`

      // Update the global state tracking sync progression
      syncService.send("FETCH")

      const response = await fetch(`${SYNC_API}?${urlParams}`, {
        // Headers include the username and password in base64 encoded string
        headers: headers
      })

      console.log({ response: response })

      if (!response.ok) {
        syncService.send("COMPLETED")
        throw new Error(await response.text())
      }

      // changes: {
      //   events: {
      //     created: [{id: "", created_at: "", updatedAt: ""}],
      //     updated: [],
      //     deleted: []
      //   }
      // }

      const { changes, timestamp } = await response.json()
      // loop through the changes object and for every event convert the string date into a js Date object
      // changes.events?.created.forEach((event) => {
      //   event.created_at = new Date(event.created_at).getTime()
      //   event.updated_at = new Date(event.updated_at).getTime()
      // })
      // changes.events?.updated.forEach((event) => {
      //   event.created_at = new Date(event.created_at).getTime()
      //   event.updated_at = new Date(event.updated_at).getTime()
      // })

      // // do the same for the visits
      // changes.visits?.created.forEach((visit) => {
      //   visit.created_at = new Date(visit.created_at).getTime()
      //   visit.updated_at = new Date(visit.updated_at).getTime()
      // })
      // changes.visits?.updated.forEach((visit) => {
      //   visit.created_at = new Date(visit.created_at).getTime()
      //   visit.updated_at = new Date(visit.updated_at).getTime()
      // })

      // // do the same for the patients
      // changes.patients?.created.forEach((patient) => {
      //   patient.created_at = new Date(patient.created_at).getTime()
      //   patient.updated_at = new Date(patient.updated_at).getTime()
      // })
      // changes.visits?.updated.forEach((patient) => {
      //   patient.created_at = new Date(patient.created_at).getTime()
      //   patient.updated_at = new Date(patient.updated_at).getTime()
      // })

      // // do the same for event_forms
      // changes.event_forms?.created.forEach((eventForm) => {
      //   eventForm.created_at = new Date(eventForm.created_at).getTime()
      //   eventForm.updated_at = new Date(eventForm.updated_at).getTime()
      //   if (eventForm.metadata && typeof eventForm.metadata !== "string") {
      //     eventForm.metadata = JSON.stringify(eventForm.metadata)
      //   }
      // })
      // changes.event_forms?.updated.forEach((eventForm) => {
      //   eventForm.created_at = new Date(eventForm.created_at).getTime()
      //   eventForm.updated_at = new Date(eventForm.updated_at).getTime()
      // })
      updateDates(changes)
      console.log(JSON.stringify(changes, null, 2))


      const newRecordsToChange = countRecordsInChanges(changes)
      syncService.send({
        type: "RESOLVE_CONFLICTS",
        downloadedRecords: newRecordsToChange,
      })
      // syncService.send({
      //   type: 'downloaded records loaded',
      //   downloadedRecords: newRecordsToChange.length,
      // });
      // syncService.send('COMPLETED');

      if (!hasLocalChangesToPush) {
        setTimeout(
          () =>
            syncService.send({
              type: "COMPLETED",
              downloadedRecords: newRecordsToChange,
            }),
          2_500,
        )
      }

      console.log("after")
      // console.log({FORMS: JSON.stringify(changes.event_forms.created, null, 2)})

      // Remove the last

      // const datedChanges = changes
      // console.warn({changes, timestamp});
      return { changes, timestamp }
    },
    pushChanges: async ({ changes, lastPulledAt }) => {
      // record timestamp at begining of push
      // const timestamp = Date.now()
      syncService.send({
        type: "UPLOAD",
        uploadedRecords: countRecordsInChanges(changes),
      })
      const response = await fetch(`${SYNC_API}?last_pulled_at=${lastPulledAt}`, {
        method: "POST",
        body: JSON.stringify(changes),
        headers: {
          "Content-Type": "application/json",
          'Authorization': 'Basic ' + encodedUsernameAndPassword
        },
      })

      // calculate how long it took to push
      // const timeToPush = (Date.now() - timestamp) / 1000
      syncService.send({ type: "COMPLETED" })
      if (!response.ok) {
        throw new Error(await response.text())
      }
    },
    migrationsEnabledAtVersion: 1,
  })
}


const formatRecordDateToTime = (item: { [key: string]: string }) => {
  return {
    ...item,
    created_at: new Date(item.created_at).getTime(),
    updated_at: new Date(item.updated_at).getTime()
  }
}


function updateDates(changes) {
  const defaultDate = new Date()
  for (const type of Object.keys(changes)) {
    for (const action of ['created', 'updated', 'deleted']) {
      if (changes[type][action]) {
        changes[type][action].forEach(record => {
          record.created_at = new Date(record.created_at || defaultDate).getTime();
          record.updated_at = new Date(record.updated_at || defaultDate).getTime();
          if (record.deleted_at) {
            record.deleted_at = new Date(record.deleted_at || defaultDate).getTime();
          }
          // set up metadata
          if (record.metadata) {
            record.metadata = JSON.stringify(record.metadata)
          }
          /** visits have a checkin timestamp */
          if (record.check_in_timestamp) {
            record.check_in_timestamp = new Date(record.check_in_timestamp || defaultDate).getTime();
          }
          // if (record.image_timestamp && record.image_timestamp === null) {
          record.image_timestamp = 0
          // }
        });
      }
    }
  }
}


function processChanges(createdItems, updatedItems, deletedItems) {
  const processItem = (item) => {
    item.created_at = new Date(item.created_at).getTime();
    item.updated_at = new Date(item.updated_at).getTime();
    if (item.deleted_at) {
      item.deleted_at = new Date(item.deleted_at).getTime();
    }
  };

  if (createdItems) {
    createdItems.forEach(processItem);
  }

  if (updatedItems) {
    updatedItems.forEach(processItem);
  }

  if (deletedItems) {
    deletedItems.forEach(processItem)
  }
}


const countRecordsInChanges = (changes: { [key: string]: [] }) =>
  Object.values(changes)
    .flatMap((b) => Object.values(b))
    .flat().length
