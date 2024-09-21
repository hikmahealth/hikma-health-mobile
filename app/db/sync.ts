// @ts-check
import {
  SyncDatabaseChangeSet,
  synchronize,
  SyncTableChangeSet,
  Timestamp,
} from "@nozbe/watermelondb/sync"
import database from "."
import Config from "react-native-config"
import EncryptedStorage from "react-native-encrypted-storage"
import { api } from "../services/api"

global.Buffer = require("buffer").Buffer

// const HIKMA_API = Config.HIKMA_API

// const SYNC_API = `${HIKMA_API}/api/v2/sync`

/**
 * Sync the local database with the remote database
 * @param {boolean} hasLocalChangesToPush
 * @param {any} setSyncStart
 * @param {any} setSyncResolution
 * @param {any} setPushStart
 * @param {any} updateSyncStatistic
 * @param {any} onSyncError
 * @param {any} onSyncCompleted
 */
export async function syncDB(
  hasLocalChangesToPush: boolean,
  setSyncStart: () => void,
  setSyncResolution: (records: number) => void,
  setPushStart: (pushed: number) => void,
  updateSyncStatistic: (stats: { fetched: number; pushed: number }) => void,
  onSyncError: (error: string) => void,
  onSyncCompleted: () => void,
) {
  const email = await EncryptedStorage.getItem("provider_email")
  const password = await EncryptedStorage.getItem("provider_password")

  const buffer = Buffer.from(`${email}:${password}`)
  const encodedUsernameAndPassword = buffer.toString("base64")

  const headers = new Headers()
  headers.append("Authorization", "Basic " + encodedUsernameAndPassword)

  setSyncStart()

  await synchronize({
    database,
    sendCreatedAsUpdated: false,
    pullChanges: async ({ lastPulledAt, schemaVersion, migration }) => {
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

      console.log("Pulling changes from the server")

      let changes: SyncDatabaseChangeSet = {}
      let timestamp: Timestamp = 0

      try {
        const res = await api.syncPull(lastPulledAt || 0, schemaVersion, migration, headers)
        if ("changes" in res) {
          changes = res.changes
          timestamp = res.timestamp
        }

        // console.log("Changes pulled from the server", JSON.stringify(changes, null, 2))

        // In place update and set dates
        updateDates(changes)

        const newRecordsToChange = countRecordsInChanges(changes)

        // trigger callback to update the number of records to change
        setSyncResolution(newRecordsToChange)

        /**
         * If there are some changes that need to be synced from the local database, wait
         * a bit so that the alert modal is still showing the user giving them time to see the number of
         * changes before the modal disappears
         * ALTERNATIVE: track this and react to it somewhere outside the sync functions
         */
        if (!hasLocalChangesToPush) {
          setTimeout(() => {
            onSyncCompleted()
          }, 2_500)
        }
      } catch (error) {
        console.error("Error pulling changes from the server")
        console.error(error)
        onSyncError(String(error))
      } finally {
        return { changes, timestamp }
      }
    },
    pushChanges: async ({ changes, lastPulledAt }) => {
      setPushStart(countRecordsInChanges(changes))

      // add content type to the header
      headers.append("Content-Type", "application/json")

      try {
        const res = await api.syncPush(lastPulledAt || 0, changes, headers)
        onSyncCompleted()

        // There are ids that were rejected
        if (res?.experimentalRejectedIds) {
          console.error("Sync rejected ids", res.experimentalRejectedIds)
          // TODO: handle rejected ids
        }
      } catch (error) {
        console.error(error)
        onSyncError(String(error))

        throw new Error("Error pushing changes to the server")
      }
    },
    migrationsEnabledAtVersion: 1,
  })
}

function updateDates(changes: SyncDatabaseChangeSet) {
  const defaultDate = new Date()
  const changeType = ["created", "updated", "deleted"] as unknown as (keyof SyncTableChangeSet)[]
  for (const type of Object.keys(changes)) {
    for (const action of changeType) {
      if (changes[type][action]) {
        changes[type][action].forEach((record) => {
          record.created_at = new Date(record.created_at || defaultDate).getTime()
          record.updated_at = new Date(record.updated_at || defaultDate).getTime()
          if (record.deleted_at) {
            record.deleted_at = new Date(record.deleted_at || defaultDate).getTime()
          }
          if (record.timestamp) {
            record.timestamp = new Date(record.timestamp || defaultDate).getTime()
          }
          // set up metadata
          if (record.metadata && typeof record.metadata !== "string") {
            record.metadata = JSON.stringify(record.metadata)
          }
          if (record.form_fields && typeof record.form_fields !== "string") {
            // console.log("")
            // console.log({ form: record.form_fields })
            // console.log("")
            record.form_fields = JSON.stringify(record.form_fields)
          }
          if (record.form_data && typeof record.form_data !== "string") {
            record.form_data = JSON.stringify(record.form_data)
          }
          if (record.fields && typeof record.fields !== "string") {
            record.fields = JSON.stringify(record.fields)
          }

          // if there is a date_of_birth field, format it to "YYYY-MM-DD"
          if (record.date_of_birth) {
            record.date_of_birth = new Date(record.date_of_birth || defaultDate)
              .toISOString()
              .split("T")[0]
          }

          /** visits have a checkin timestamp */
          if (record.check_in_timestamp) {
            record.check_in_timestamp = new Date(record.check_in_timestamp || defaultDate).getTime()
          }
          // if (record.image_timestamp && record.image_timestamp === null) {
          record.image_timestamp = 0
          // }
        })
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
  let result = 0
  for (const tableName in changes) {
    const { created, updated, deleted } = changes[tableName]
    result = result + created.length + updated.length + deleted.length
  }
  return result
}
