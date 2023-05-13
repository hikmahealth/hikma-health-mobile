import { hasUnsyncedChanges, synchronize } from "@nozbe/watermelondb/sync"
import database from "."
import { HIKMA_API } from "@env"
import { Alert } from "react-native"
import { interpret } from "xstate"
import { syncMachine } from "../components/state_machines/sync"

const SYNC_API = `${HIKMA_API}/api/v2/sync`

const syncServiceT = interpret(syncMachine)

export async function syncDB(syncService: typeof syncServiceT, hasLocalChangesToPush: boolean) {
  await synchronize({
    database,
    sendCreatedAsUpdated: false,
    pullChanges: async ({ lastPulledAt, schemaVersion, migration }) => {
      // const hasRecordsToUpload = await hasUnsyncedChanges({database});
      // console.warn({hasRecordsToUpload});
      const urlParams = `last_pulled_at=${lastPulledAt}&schema_version=${schemaVersion}&migration=${encodeURIComponent(
        JSON.stringify(migration),
      )}`
      syncService.send("FETCH")
      const response = await fetch(`${SYNC_API}?${urlParams}`)
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
      changes.events?.created.forEach((event) => {
        event.created_at = new Date(event.created_at).getTime()
        event.updated_at = new Date(event.updated_at).getTime()
      })
      changes.events?.updated.forEach((event) => {
        event.created_at = new Date(event.created_at).getTime()
        event.updated_at = new Date(event.updated_at).getTime()
      })

      // do the same for the visits
      changes.visits?.created.forEach((visit) => {
        visit.created_at = new Date(visit.created_at).getTime()
        visit.updated_at = new Date(visit.updated_at).getTime()
      })
      changes.visits?.updated.forEach((visit) => {
        visit.created_at = new Date(visit.created_at).getTime()
        visit.updated_at = new Date(visit.updated_at).getTime()
      })

      // do the same for the patients
      changes.patients?.created.forEach((patient) => {
        patient.created_at = new Date(patient.created_at).getTime()
        patient.updated_at = new Date(patient.updated_at).getTime()
      })
      changes.visits?.updated.forEach((patient) => {
        patient.created_at = new Date(patient.created_at).getTime()
        patient.updated_at = new Date(patient.updated_at).getTime()
      })

      // do the same for event_forms
      changes.event_forms?.created.forEach((eventForm) => {
        eventForm.created_at = new Date(eventForm.created_at).getTime()
        eventForm.updated_at = new Date(eventForm.updated_at).getTime()
        if (eventForm.metadata && typeof eventForm.metadata !== "string") {
          eventForm.metadata = JSON.stringify(eventForm.metadata)
        }
      })
      changes.event_forms?.updated.forEach((eventForm) => {
        eventForm.created_at = new Date(eventForm.created_at).getTime()
        eventForm.updated_at = new Date(eventForm.updated_at).getTime()
      })

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

      // console.log({FORMS: JSON.stringify(changes.event_forms.created, null, 2)})

      // Remove the last

      // const datedChanges = changes
      // console.warn({changes, timestamp});
      return { changes, timestamp }
    },
    pushChanges: async ({ changes, lastPulledAt }) => {
      // record timestamp at begining of push
      const timestamp = Date.now()
      syncService.send({
        type: "UPLOAD",
        uploadedRecords: countRecordsInChanges(changes),
      })
      const response = await fetch(`${SYNC_API}?last_pulled_at=${lastPulledAt}`, {
        method: "POST",
        body: JSON.stringify(changes),
        headers: {
          "Content-Type": "application/json",
        },
      })

      // calculate how long it took to push
      const timeToPush = (Date.now() - timestamp) / 1000
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


const countRecordsInChanges = (changes: { [key: string]: [] }) =>
  Object.values(changes)
    .flatMap((b) => Object.values(b))
    .flat().length
