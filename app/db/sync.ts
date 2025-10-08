// @ts-check
import * as EncryptedStorage from "expo-secure-store"
import {
  SyncDatabaseChangeSet,
  synchronize,
  SyncTableChangeSet,
  Timestamp,
} from "@nozbe/watermelondb/sync"
import { Exit, Option } from "effect"

import Sync from "@/models/Sync"

import database from "."

global.Buffer = require("buffer").Buffer

// const HIKMA_API = Config.HIKMA_API

// const SYNC_API = `${HIKMA_API}/api/v2/sync`

/**
 * Sync the local database with the remote database
 * @param {boolean} hasLocalChangesToPush
 * @param {() => void} setSyncStart
 * @param {(records: number) => void} setSyncResolution
 * @param {(pushed: number) => void} setPushStart
 * @param {(stats: { fetched: number; pushed: number }) => void} updateSyncStatistic
 * @param {(error: string) => void} onSyncError
 * @param {() => void} onSyncCompleted
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
        const res = await Sync.syncPull(lastPulledAt || 0, schemaVersion, migration, headers)

        Exit.match(res, {
          onSuccess: (value) => {
            const changesAndTimestamp = Sync.getChangesAndTimestamp(value)
            if (Option.isSome(changesAndTimestamp)) {
              changes = changesAndTimestamp.value.changes
              timestamp = changesAndTimestamp.value.timestamp
            } else {
              changes = {}
              timestamp = 0
            }
          },
          onFailure: (error) => {
            console.error("Error getting changes and timestamp", error)
            changes = {}
            timestamp = 0
          },
        })

        // console.log("Changes pulled from the server", JSON.stringify(changes, null, 2))

        // In place update and set dates
        updateDates(changes)

        // console.log(changes)

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
        const res = await Sync.syncPush(lastPulledAt || 0, changes, headers)
        onSyncCompleted()

        // TODO: handle rejected ids - this is experimental, wait until the api is stable
        Exit.match(res, {
          onSuccess: (value) => {
            console.log("Sync successful", value)
          },
          onFailure: (error) => {
            console.error("Sync rejected ids", error)
            // onSyncError(String(error))
          },
        })

        // If there are no errors, update the last pull timestamp for the cloud server
        Sync.Server.setLastPullTimestamp("cloud", lastPulledAt).catch((error) => {
          console.error(
            "Failed to set last pull timestamp. This could be an issue, although unlikely to be serious since watermelondb tracks its own timestamps for this internally.",
            error,
          )
        })
      } catch (error) {
        console.error(error)
        onSyncError(String(error))

        throw new Error("Error pushing changes to the server")
      }
    },
    migrationsEnabledAtVersion: 1,
  })
}

// FIXME: Needs documentation & tests
// TODO: need to notify users that any new json fields should be added here
export function updateDates(changes: SyncDatabaseChangeSet) {
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

          // Make sure all "timestamps" are number times
          if (record.timestamp) {
            record.timestamp = new Date(record.timestamp || defaultDate).getTime()
          }
          // handle prescription and appointment timestamps
          if (record.prescribed_at) {
            record.prescribed_at = new Date(record.prescribed_at || defaultDate).getTime()
          }
          if (record.filled_at) {
            record.filled_at = new Date(record.filled_at || defaultDate).getTime()
          }

          if (record.expiration_date) {
            record.expiration_date = new Date(record.expiration_date || defaultDate).getTime()
          }

          // cast all jsonb "departments" into strings for local
          if (record.departments && typeof record.departments !== "string") {
            record.departments = JSON.stringify(record.departments)
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
export const countRecordsInChanges = (changes: SyncDatabaseChangeSet): number => {
  let result = 0
  for (const tableName in changes) {
    const { created, updated, deleted } = changes[tableName]
    result = result + created.length + updated.length + deleted.length
  }
  return result
}

/**
 * A mapping of table names to lists of record ids
 */
type LocalSyncRecords = {
  [tableName: string]: string[]
}

/**
 * Given a SyncDatabaseChangeSet, and a list of ids for records that were already synced using the offline sync,
 * return the a SyncDatabaseChangeSet where the records with the given ids are moved to the updated set
 * @param {SyncDatabaseChangeSet} changes
 * @param {LocalSyncRecords} ids
 * @returns {SyncDatabaseChangeSet} a SyncDatabaseChangeSet where the records with the given ids are moved to the updated set
 */
//   export function moveToUpdated(
//     changes: SyncDatabaseChangeSet,
//     ids: LocalSyncRecords,
//   ): SyncDatabaseChangeSet {
//     // Handle edge case of empty inputs
//     if (!changes || Object.keys(changes).length === 0) {
//       return changes
//     }

//     if (!ids || Object.keys(ids).length === 0) {
//       return changes
//     }

//     // Create a deep copy of the changes to avoid modifying the original object
//     const result: SyncDatabaseChangeSet = JSON.parse(JSON.stringify(changes))

//     // Track statistics for logging
//     const stats: Record<string, { created: number; deleted: number }> = {}

//     // Iterate through each table in the changes
//     for (const tableName in result) {
//       // Initialize stats for this table
//       stats[tableName] = { created: 0, deleted: 0 }

//       // Skip if this table doesn't have any synced records in the ids object
//       if (!ids[tableName] || !Array.isArray(ids[tableName]) || ids[tableName].length === 0) {
//         continue
//       }

//       // Create a Set for faster lookups
//       const syncedIds = new Set(ids[tableName])

//       // Process created records
//       if (result[tableName].created && result[tableName].created.length > 0) {
//         // Find records that were already synced
//         const alreadySynced = result[tableName].created.filter((record) => syncedIds.has(record.id))
//         stats[tableName].created = alreadySynced.length

//         // Remove these records from created
//         result[tableName].created = result[tableName].created.filter(
//           (record) => !syncedIds.has(record.id),
//         )

//         // Add them to updated (ensure updated array exists)
//         if (!result[tableName].updated) {
//           result[tableName].updated = []
//         }

//         // Add them to updated
//         result[tableName].updated = [...result[tableName].updated, ...alreadySynced]
//       }

//       // Process deleted records
//       if (result[tableName].deleted && result[tableName].deleted.length > 0) {
//         // Find records that were already synced
//         const alreadySynced = result[tableName].deleted.filter((record) => syncedIds.has(record.id))
//         stats[tableName].deleted = alreadySynced.length

//         // Remove these records from deleted
//         result[tableName].deleted = result[tableName].deleted.filter(
//           (record) => !syncedIds.has(record.id),
//         )

//         // Add them to updated (ensure updated array exists)
//         if (!result[tableName].updated) {
//           result[tableName].updated = []
//         }

//         // Add them to updated
//         result[tableName].updated = [...result[tableName].updated, ...alreadySynced]
//       }
//     }

//     // Log statistics about moved records
//     for (const tableName in stats) {
//       const tableStats = stats[tableName]
//       if (tableStats.created > 0 || tableStats.deleted > 0) {
//         console.log(
//           `Moved records for table ${tableName}: ${tableStats.created} from created, ${tableStats.deleted} from deleted to updated`,
//         )
//       }
//     }

//     return result
//   }
