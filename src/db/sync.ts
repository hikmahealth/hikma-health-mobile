import { hasUnsyncedChanges, SyncDatabaseChangeSet, synchronize, SyncTableChangeSet, Timestamp } from "@nozbe/watermelondb/sync"
import database from "."
import Config from "react-native-config";
import { Alert } from "react-native"
import { interpret } from "xstate"
import { syncMachine } from "../components/state_machines/sync"
import EncryptedStorage from "react-native-encrypted-storage"
import { cloneDeep } from "lodash"
import { symbolObservable } from "xstate/lib/utils"

global.Buffer = require('buffer').Buffer;

const HIKMA_API = Config.HIKMA_API

const SYNC_API = `${HIKMA_API}/api/v2/sync`

const syncServiceT = interpret(syncMachine)

export async function syncDB(syncService: typeof syncServiceT, hasLocalChangesToPush: boolean) {
  const email = await EncryptedStorage.getItem("provider_email");
  const password = await EncryptedStorage.getItem("provider_password");

  const buffer = Buffer.from(`${email}:${password}`);
  const encodedUsernameAndPassword = buffer.toString('base64');

  const headers = new Headers();
  headers.append('Authorization', 'Basic ' + encodedUsernameAndPassword);

  await synchronize({
    database,
    sendCreatedAsUpdated: false,
    pullChanges: async ({ lastPulledAt, schemaVersion, migration }) => {
      const urlParams = `last_pulled_at=${lastPulledAt}&schema_version=${schemaVersion}&migration=${encodeURIComponent(
        JSON.stringify(migration),
      )}`

      // Update the global state tracking sync progression
      syncService.send("FETCH")


      let changes: SyncDatabaseChangeSet = {};
      let timestamp: Timestamp = 0;

      try {
        const response = await fetch(`${SYNC_API}?${urlParams}`, {
          // Headers include the username and password in base64 encoded string
          headers: headers
        })

        console.log({ response: response })

        if (!response.ok) {
          syncService.send("COMPLETED")
          throw new Error(await response.text())
        }

        // changes object looks something like this
        // changes: {
        //   events: {
        //     created: [{id: "", created_at: "", updatedAt: ""}],
        //     updated: [],
        //     deleted: []
        //   }
        //   patients: { ... }
        //   ....
        // }
        const syncPullResult = await response.json() as { changes: SyncDatabaseChangeSet; timestamp: Timestamp }
        changes = syncPullResult.changes;
        timestamp = syncPullResult.timestamp;

        updateDates(changes)

        const newRecordsToChange = countRecordsInChanges(changes)
        syncService.send({
          type: "RESOLVE_CONFLICTS",
          downloadedRecords: newRecordsToChange,
        })


        /** 
         * If there are some changes that need to be synced from the local database, wait
         * a bit so that the alert modal is still showing the user giving them time to see the number of
         * changes before the modal disappears
         * ALTERNATIVE: track this and react to it somewhere outside the sync functions
        */
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
      } catch (error) {
        console.error(error)
        syncService.send({
          type: "ERROR",
          downloadedRecords: 0,
        })
      } finally {
        return { changes, timestamp }
      }
    },
    pushChanges: async ({ changes, lastPulledAt }) => {
      // record timestamp at begining of push (uncomment if tracking duration of pushing data to server)
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

      // calculate how long it took to push (uncomment if tracking duration of pushing data to the server)
      // const timeToPush = (Date.now() - timestamp) / 1000
      syncService.send({ type: "COMPLETED" })
      if (!response.ok) {
        throw new Error(await response.text())
      }
    },
    migrationsEnabledAtVersion: 1,
  })
}



function updateDates(changes: SyncDatabaseChangeSet) {
  const defaultDate = new Date()
  const changeType = ['created', 'updated', 'deleted'] as unknown as (keyof SyncTableChangeSet)[]
  for (const type of Object.keys(changes)) {
    for (const action of changeType) {
      if (changes[type][action]) {
        changes[type][action].forEach(record => {
          record.created_at = new Date(record.created_at || defaultDate).getTime();
          record.updated_at = new Date(record.updated_at || defaultDate).getTime();
          if (record.deleted_at) {
            record.deleted_at = new Date(record.deleted_at || defaultDate).getTime();
          }
          // set up metadata
          if (record.metadata && typeof record.metadata !== "string") {
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


/**
Count the number of records inside a changeset
@param {SyncDatabaseChangeSet} changes
@returns {number} count of records in changeset
*/
const countRecordsInChanges = (changes: SyncDatabaseChangeSet): number => {
  let result = 0;
  for (const tableName in changes) {
    const { created, updated, deleted } = changes[tableName]
    result = result + created.length + updated.length + deleted.length
  }
  return result
}
