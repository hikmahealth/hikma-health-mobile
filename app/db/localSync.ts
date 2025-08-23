import * as EncryptedStorage from "expo-secure-store"
import { Collection, Database, Model, Q, TableName, TableSchema } from "@nozbe/watermelondb"
import { RecordId, SyncStatus } from "@nozbe/watermelondb/Model"
import { DirtyRaw, sanitizedRaw } from "@nozbe/watermelondb/RawRecord"
import { SyncDatabaseChangeSet, SyncTableChangeSet } from "@nozbe/watermelondb/sync"
import * as Sentry from "@sentry/react-native"
import { Option } from "effect"
import { chunk } from "es-toolkit/compat"

import Sync from "@/models/Sync"

import { countRecordsInChanges } from "./sync"

import database from "."

global.Buffer = require("buffer").Buffer

/**
 * Sync the local database with another device via local network - this emulates the watermelondb sync process
 * Starts with getting changes from the local server since the lastPulledAt timestamp for the local server
 * Then pushes local changes to the local server
 * @param {Object} options Sync options
 * @param {boolean} options.hasLocalChangesToPush Whether there are local changes to push
 * @param {() => void} options.setSyncStart Callback to notify sync has started
 * @param {(records: number) => void} options.setSyncResolution Callback when sync resolution begins
 * @param {(pushed: number) => void} options.setPushStart Callback when push begins
 * @param {(stats: { fetched: number; pushed: number }) => void} options.updateSyncStatistic Update sync statistics
 * @param {(error: string) => void} options.onSyncError Callback when sync error occurs
 * @param {() => void} options.onSyncCompleted Callback when sync completes successfully
 */
export async function localSyncDB(options: {
  hasLocalChangesToPush: boolean
  setSyncStart: () => void
  setSyncResolution: (records: number) => void
  setPushStart: (pushed: number) => void
  updateSyncStatistic: (stats: { fetched: number; pushed: number }) => void
  onSyncError: (error: string) => void
  onSyncCompleted: () => void
}) {
  const { hasLocalChangesToPush, setSyncStart } = options
  const email = await EncryptedStorage.getItem("provider_email")
  const password = await EncryptedStorage.getItem("provider_password")

  const buffer = Buffer.from(`${email}:${password}`)
  const encodedUsernameAndPassword = buffer.toString("base64")

  const headers = new Headers()
  headers.append("Authorization", "Basic " + encodedUsernameAndPassword)

  console.log("Local sync started")

  setSyncStart()

  const localServer = await Sync.Server.getByType("local")
  if (!Option.isSome(localServer)) {
    Sentry.captureException(new Error("Local server not found"))
    throw new Error("Local server not found")
  }

  // Get the last time we pulled from the local server
  const localServerLastPulledAt = Sync.Server.getLastPullTimestamp("local") || 0

  // ask the local server for data that was updated or deleted since the last pull
  const res = await fetch(`${localServer.value.url}/sync?lastPulledAt=${localServerLastPulledAt}`, {
    method: "GET",
    headers,
  })

  if (!res.ok) {
    console.error(res.status)
    console.error(res)
    throw new Error("Failed to fetch changes from local server")
  }

  // Temporarily hold all the ids of data pulled, filter them from all the data posted.
  let idsNotToPush: RecordId[] = []

  let changes: SyncDatabaseChangeSet
  let serverTimestamp: number
  try {
    const syncResult = await res.json()
    changes = syncResult.changes
    serverTimestamp = syncResult.timestamp

    // TODO: ensure that the data incoming is valid. Must have created, updated, and deleted arrays

    // Print out all the tables that are inside the changes
    console.log("Tables in received changes:", Object.keys(changes))

    const getChangesCount = countRecordsInChanges(changes)
    options.setSyncResolution(getChangesCount)
    idsNotToPush = await applyRemoteChanges(changes, serverTimestamp)

    // If no errors, set the last pull timestamp for the local server
    // purposely allowing a failure to local timestamp sync to be a critical error. If this happens, it needs to be resolved - otherwise we will keep sending too much data on each sync
    await Sync.Server.setLastPullTimestamp("local", serverTimestamp)
    console.log("Received: ", getChangesCount)
    console.log("Local server last pulled at: ", localServerLastPulledAt, " -> ", serverTimestamp)
  } catch (error) {
    console.error("Error parsing response from local server:", error)
    throw new Error("Failed to parse response from local server")
  }

  /////////////////////////
  //// POST STARTS HERE ////
  /////////////////////////

  try {
    // Get all the data that changed since the last sync time
    const localChanges = await getLocalChangesSince(localServerLastPulledAt, idsNotToPush)
    const postChangesCount = countRecordsInChanges(localChanges)
    options.setPushStart(postChangesCount)
    console.log(`Pushing ${Object.keys(localChanges).length} tables of local changes to server.`)
    console.log(`Sending: ${postChangesCount}`)

    // Create a new headers object with content-type for the POST request
    const postHeaders = new Headers(headers)
    postHeaders.set("Content-Type", "application/json")

    const postRes = await fetch(
      `${localServer.value.url}/sync?lastPulledAt=${localServerLastPulledAt}`,
      {
        method: "POST",
        headers: postHeaders,
        body: JSON.stringify(localChanges),
      },
    )

    if (!postRes.ok) {
      const errorText = await postRes.text().catch(() => "Unknown error")
      console.error(`Server responded with status ${postRes.status}: ${errorText}`)
      throw new Error(
        `Failed to push changes to local server: ${postRes.status} ${postRes.statusText}`,
      )
    }

    console.log("Successfully pushed local changes to server")
  } catch (error) {
    console.error("Error during local sync push operation:", error)
    options.onSyncError(String(error))
    throw error
  }

  options.onSyncCompleted()
}

// Assuming each record is between 10 and 13 kb (probably overestimate) this is a safe batch size to load into memory and process.
// TODO: Test with batch size of 1 for initial testing to make sure chunks work
const APPLY_REMOTE_CHANGES_BATCH_SIZE = 300

/**
 * Apply remote changes to the local database
 * @param {SyncDatabaseChangeSet} changes The changes to apply
 * @param {number} serverTimestamp The timestamp of the server
 * @returns {Promise<RecordId[]>} A promise that resolves when the changes are applied
 */
export async function applyRemoteChanges(
  changes: SyncDatabaseChangeSet,
  serverTimestamp: number,
): Promise<RecordId[]> {
  const idsNotToPush: RecordId[] = []
  if (!changes || Object.keys(changes).length === 0) {
    console.log("No changes to apply")
    return idsNotToPush
  }

  // TODO: Consider how partial updates are going to work. What if there is an interupt in the middle of a large bulk update?

  console.log("Applying remote changes to local database")

  await database.write(async () => {
    // Process each table in the changes sequentially
    for (const [tableName, tableChanges] of Object.entries(changes)) {
      const collection = database.get(tableName)
      const { created, updated, deleted } = tableChanges as SyncTableChangeSet

      if (created && created.length > 0) {
        const createdChunks = chunk(created, APPLY_REMOTE_CHANGES_BATCH_SIZE)

        for (const currentChunk of createdChunks) {
          // Fetch existing records in bulk
          const existingRecordsMap = await fetchExistingRecordsAsMap(
            collection,
            currentChunk,
            collection.schema,
          )

          const recordsToCreate: Model[] = []

          // Check if any records already exist locally (conflict resolution)
          for (const dirtyRecord of currentChunk) {
            const sanitized = sanitizedRaw(setSyncStatus(dirtyRecord, "created"), collection.schema)
            const existingRecord = existingRecordsMap.get(sanitized.id)
            if (existingRecord) {
              // Handle conflict - record exists but was sent as "create"
              const preparedUpdate = existingRecord.prepareUpdate((record) => {
                record._raw = sanitized
              })
              recordsToCreate.push(preparedUpdate)
              // if the local record is not newer, than remote record, mark as not to be updated;
              if (existingRecord._raw.updated_at <= sanitized.updated_at) {
                idsNotToPush.push(sanitized.id)
              }
            } else {
              // Normal create case
              const preparedCreate = collection.prepareCreate((record) => {
                record._raw = sanitized
              })
              recordsToCreate.push(preparedCreate)
              // all created records are not to be pushed back ... since they are new
              idsNotToPush.push(sanitized.id)
            }
          }

          if (recordsToCreate.length > 0) {
            await database.batch(recordsToCreate)
          }
        }
      }

      // Handle updated records
      if (updated && updated.length > 0) {
        const updatedChunks = chunk(updated, APPLY_REMOTE_CHANGES_BATCH_SIZE)
        for (const currentChunk of updatedChunks) {
          // Fetch existing records in bulk
          const existingRecordsMap = await fetchExistingRecordsAsMap(
            collection,
            currentChunk,
            collection.schema,
          )
          const recordsToUpdate: Model[] = []
          for (const dirtyRecord of currentChunk) {
            const sanitized = sanitizedRaw(setSyncStatus(dirtyRecord, "updated"), collection.schema)
            const existingRecord = existingRecordsMap.get(sanitized.id)
            if (existingRecord) {
              const preparedUpdate = existingRecord.prepareUpdate((record) => {
                record._raw = sanitized
              })

              // if the local record is not newer, than remote record, mark as not to be updated;
              if (existingRecord._raw.updated_at <= sanitized.updated_at) {
                idsNotToPush.push(sanitized.id)
              }
              // console.log("Sanitized record: ", sanitized)
              // console.log(
              //   "differences in time: ",
              //   tableName,
              //   existingRecord._raw.updated_at,
              //   sanitized.updated_at,
              // )
              recordsToUpdate.push(preparedUpdate)
            }
            // If record doesnt exist, we could either skip it or create it ... ???
          }
          if (recordsToUpdate.length > 0) {
            await database.batch(recordsToUpdate)
          }
        }
      }

      // Handle deleted records
      if (deleted && deleted.length > 0) {
        const deletedChunks = chunk(deleted, APPLY_REMOTE_CHANGES_BATCH_SIZE)
        for (const currentChunk of deletedChunks) {
          // Fetch existing records in bulk
          const existingRecordsMap = await fetchExistingRecordsAsMap(
            collection,
            currentChunk,
            collection.schema,
          )
          const recordsToDelete: Model[] = []
          for (const dirtyRecord of currentChunk) {
            const sanitized = sanitizedRaw(setSyncStatus(dirtyRecord, "deleted"), collection.schema)
            const existingRecord = existingRecordsMap.get(sanitized.id)
            if (existingRecord) {
              const preparedDelete = existingRecord.prepareMarkAsDeleted()
              recordsToDelete.push(preparedDelete)
            }
          }
          if (recordsToDelete.length > 0) {
            await database.batch(recordsToDelete)
          }
        }
      }
    }
  })

  console.log("Successfully applied all remote changes to local database")
  return idsNotToPush
}

/**
 * Given a timestamp, get all the local data that changed since that timestamp
 * @param {number} timestamp The timestamp to compare against
 * @param {RecordId[]} idsNotToPush Array of ids that should not be pushed
 * @returns {Promise<SyncDatabaseChangeSet>} The changes since the timestamp
 */
export async function getLocalChangesSince(
  timestamp: number,
  idsNotToPush: RecordId[],
): Promise<SyncDatabaseChangeSet> {
  const changes: SyncDatabaseChangeSet = {}

  // Define all tables to be included in sync
  // If a table is added to the database, it should be added here
  const tables = [
    "patients",
    "events",
    "visits",
    "clinics",
    "users",
    "event_forms",
    "registration_forms",
    "patient_additional_attributes",
    "appointments",
    "prescriptions",
  ]

  // Process each table and combine results
  const tableResults = await Promise.all(
    tables.map((tableName) => getTableChangesSince(database, tableName, timestamp, idsNotToPush)),
  )

  // Merge all table results into a single changes object
  return tableResults.reduce((changes, tableChange) => {
    // Only include tables with actual changes
    if (
      tableChange.tableName &&
      (tableChange.created.length > 0 ||
        tableChange.updated.length > 0 ||
        tableChange.deleted.length > 0)
    ) {
      changes[tableChange.tableName] = {
        created: tableChange.created,
        updated: tableChange.updated,
        deleted: tableChange.deleted,
      }
    }
    return changes
  }, {} as SyncDatabaseChangeSet)
}

/**
 * Get changes for a specific table since a timestamp
 * @param {string} tableName The name of the table to get changes for
 * @param {number} timestamp The timestamp to compare against
 * @param {RecordId[]} idsNotToPush Array of ids that should not be pushed
 * @returns {Promise<{tableName: string, created: DirtyRaw[], updated: DirtyRaw[], deleted: DirtyRaw[]}>}
 */
async function getTableChangesSince(
  database: Database,
  tableName: string,
  timestamp: number,
  idsNotToPush: RecordId[],
): Promise<{ tableName: string; created: DirtyRaw[]; updated: DirtyRaw[]; deleted: DirtyRaw[] }> {
  try {
    const collection = database.get(tableName)

    console.log("Timestamp: ", timestamp)

    // Get updated and created records
    const updatedRecords = await collection
      .query(
        Q.and(
          Q.or(Q.where("updated_at", Q.gt(timestamp)), Q.where("created_at", Q.gt(timestamp))),
          Q.where("id", Q.notIn(idsNotToPush)),
        ),
      )
      .fetch()

    // Get deleted records (those marked with _status = 'deleted')
    // Note: This assumes WatermelonDB's soft deletion is used
    const deletedRecords = await collection
      .query(
        Q.or(
          Q.where("is_deleted", Q.eq(true)),
          Q.and(Q.where("_status", Q.eq("deleted")), Q.where("updated_at", Q.gt(timestamp))),
        ),
        Q.where("id", Q.notIn(idsNotToPush)),
      )
      .fetch()

    // Separate records into created and updated
    const created = updatedRecords
      .filter((record) => record._raw.created_at >= timestamp)
      .map((record) => record._raw)

    const updated = updatedRecords
      .filter((record) => record._raw.created_at < timestamp && record._raw.updated_at >= timestamp)
      .map((record) => record._raw)

    console.log(
      "Updated times: ",
      updatedRecords.map((record) => record._raw.updated_at),
    )

    // Map deleted records
    const deleted = deletedRecords.map((record) => record._raw)

    console.log(
      `Table ${tableName}: ${created.length} created, ${updated.length} updated, ${deleted.length} deleted`,
    )

    return {
      tableName,
      created,
      updated,
      deleted,
    }
  } catch (error) {
    console.error(`Error getting changes for table ${tableName}:`, error)
    // Return empty results for this table rather than failing the entire sync
    return {
      tableName,
      created: [],
      updated: [],
      deleted: [],
    }
  }
}

/**
 * Fetch existing records from a collection by their IDs and return them as a Map
 * @param {Collection<Model>} collection The collection to fetch records from
 * @param {any[]} dirtyRecords The raw records containing IDs to look up
 * @param {TableSchema} schema The schema for the collection
 * @returns {Promise<Map<string, Model>>} A map of record IDs to record instances
 */
async function fetchExistingRecordsAsMap(
  collection: Collection<Model>,
  dirtyRecords: any[],
  schema: TableSchema,
): Promise<Map<string, Model>> {
  // Extract all IDs from the records
  const ids = dirtyRecords.map((record) => sanitizedRaw(record, schema).id)

  // Skip if no IDs to fetch
  if (ids.length === 0) {
    return new Map()
  }

  // Fetch all existing records with these IDs in a single query
  const existingRecords = await collection.query(Q.where("id", Q.oneOf(ids))).fetch()

  // Create a map for quick lookup
  return new Map(existingRecords.map((record) => [record.id, record]))
}

/**
 * Updates the updated_at field of a record with the current timestamp
 * @param {DirtyRaw} record The record to update
 * @param {number} serverTimestamp The timestamp of the server
 * @returns {DirtyRaw} The updated record
 */
function updateUpdatedAt(record: DirtyRaw, serverTimestamp?: number): DirtyRaw {
  return {
    ...record,
    updated_at: serverTimestamp ?? Date.now(),
  }
}

/**
 * Manually set a record's sync status
 * @param {DirtyRaw} record The record to update
 * @param {SyncStatus} status The status to set
 */
function setSyncStatus(record: DirtyRaw, status: SyncStatus): DirtyRaw {
  return {
    ...record,
    _status: status,
  }
}
