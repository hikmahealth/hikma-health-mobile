/**
 * Local sync module for hub peers.
 *
 * Reimplements WatermelonDB's sync phases for use with encrypted RPC transport:
 *   - applyRemoteChanges: pulls from hub → applies to local DB (sets _status = "synced")
 *   - fetchLocalChanges: gathers locally-changed records by _status for hub push
 *   - markLocalChangesAsSynced: confirms pushed records as synced
 *   - getLocalChangesSince: timestamp-based query for force sync (upload)
 *
 * Normal sync uses _status/_changed (WatermelonDB-native).
 * Force sync uses timestamps (independent of _status).
 */

import { Collection, Database, Model, Q, TableSchema } from "@nozbe/watermelondb"
import { RecordId } from "@nozbe/watermelondb/Model"
import { DirtyRaw, sanitizedRaw } from "@nozbe/watermelondb/RawRecord"
import { SyncDatabaseChangeSet, SyncTableChangeSet } from "@nozbe/watermelondb/sync"
import { chunk } from "es-toolkit/compat"

import database from "."

// ── Constants ─────────────────────────────────────────────────────────

const BATCH_SIZE = 300

/** All tables that participate in sync. Device-local tables (event_logs, peers) are excluded. */
const SYNCABLE_TABLES = [
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
  "patient_vitals",
  "patient_problems",
  "clinic_departments",
  "drug_catalogue",
  "clinic_inventory",
  "prescription_items",
  "dispensing_records",
  // "user_clinic_permissions",
  // "app_config",
] as const

// ── Pure helpers ──────────────────────────────────────────────────────

/** Mark a raw record as synced — it came from the server, no local changes pending. */
const markAsSynced = (record: DirtyRaw): DirtyRaw => ({
  ...record,
  _status: "synced",
  _changed: "",
})

/**
 * Per-column conflict resolution, mirroring WatermelonDB's resolveConflict.
 *
 * Starts with remote data, then restores local values for any columns
 * listed in local._changed. This preserves local edits while accepting
 * all other server updates.
 *
 * If the local record is deleted, returns it unchanged (don't resurrect).
 */
export const resolveConflict = (local: DirtyRaw, remote: DirtyRaw): DirtyRaw => {
  if (local._status === "deleted") return local

  const resolved: DirtyRaw = {
    ...local,
    ...remote,
    id: local.id,
    _status: local._status,
    _changed: local._changed,
  }

  const changedColumns =
    typeof local._changed === "string" ? local._changed.split(",").filter(Boolean) : []

  for (const col of changedColumns) {
    if (col in local) {
      resolved[col] = local[col]
    }
  }

  return resolved
}

// ── Apply remote changes (pull phase) ─────────────────────────────────

/**
 * Apply remote changes to the local database.
 *
 * All incoming records are marked _status = "synced", _changed = "".
 * When a record already exists locally with pending changes (_changed non-empty),
 * per-column conflict resolution preserves the local edits.
 */
export async function applyRemoteChanges(changes: SyncDatabaseChangeSet): Promise<void> {
  if (!changes || Object.keys(changes).length === 0) {
    console.log("[localSync] No changes to apply")
    return
  }

  console.log("[localSync] Applying remote changes to local database")

  await database.write(async () => {
    for (const [tableName, tableChanges] of Object.entries(changes)) {
      const collection = database.get(tableName)
      const { created, updated, deleted } = tableChanges as SyncTableChangeSet

      // ── Created records ──────────────────────────────────────────
      if (created && created.length > 0) {
        for (const currentChunk of chunk(created, BATCH_SIZE)) {
          const existingMap = await fetchExistingRecordsAsMap(
            collection,
            currentChunk,
            collection.schema,
          )

          const batch: Model[] = []

          for (const dirtyRecord of currentChunk) {
            const sanitized = sanitizedRaw(markAsSynced(dirtyRecord), collection.schema)
            const existing = existingMap.get(sanitized.id)

            if (existing) {
              // Record exists locally — conflict resolution
              const localRaw = existing._raw as DirtyRaw
              const hasLocalChanges =
                typeof localRaw._changed === "string" && localRaw._changed.length > 0
              const mergedRaw = hasLocalChanges ? resolveConflict(localRaw, sanitized) : sanitized

              batch.push(
                existing.prepareUpdate((record) => {
                  record._raw = mergedRaw as any
                }),
              )
            } else {
              batch.push(
                collection.prepareCreate((record) => {
                  record._raw = sanitized as any
                }),
              )
            }
          }

          if (batch.length > 0) {
            await database.batch(batch)
          }
        }
      }

      // ── Updated records ──────────────────────────────────────────
      if (updated && updated.length > 0) {
        for (const currentChunk of chunk(updated, BATCH_SIZE)) {
          const existingMap = await fetchExistingRecordsAsMap(
            collection,
            currentChunk,
            collection.schema,
          )

          const batch: Model[] = []

          for (const dirtyRecord of currentChunk) {
            const sanitized = sanitizedRaw(markAsSynced(dirtyRecord), collection.schema)
            const existing = existingMap.get(sanitized.id)

            if (existing) {
              const localRaw = existing._raw as DirtyRaw
              const hasLocalChanges =
                typeof localRaw._changed === "string" && localRaw._changed.length > 0
              const mergedRaw = hasLocalChanges ? resolveConflict(localRaw, sanitized) : sanitized

              batch.push(
                existing.prepareUpdate((record) => {
                  record._raw = mergedRaw as any
                }),
              )
            }
            // If record doesn't exist locally, skip — server sent an update for
            // something we never had. This can happen after a partial sync failure.
          }

          if (batch.length > 0) {
            await database.batch(batch)
          }
        }
      }

      // ── Deleted records ──────────────────────────────────────────
      if (deleted && deleted.length > 0) {
        for (const currentChunk of chunk(deleted, BATCH_SIZE)) {
          const existingMap = await fetchExistingRecordsAsMap(
            collection,
            currentChunk,
            collection.schema,
          )

          const batch: Model[] = []

          for (const dirtyRecord of currentChunk) {
            const sanitized = sanitizedRaw(markAsSynced(dirtyRecord), collection.schema)
            const existing = existingMap.get(sanitized.id)
            if (existing) {
              batch.push(existing.prepareMarkAsDeleted())
            }
          }

          if (batch.length > 0) {
            await database.batch(batch)
          }
        }
      }
    }
  })

  console.log("[localSync] Successfully applied all remote changes")
}

// ── Fetch local changes (_status-based, for normal hub push) ──────────

/**
 * Gather all locally-changed records using WatermelonDB's _status tracking.
 *
 * Returns a changeset with:
 *   created: records with _status = "created"
 *   updated: records with _status = "updated"
 *   deleted: records with _status = "deleted" (IDs only in WatermelonDB,
 *            but we return full raws for hub RPC compatibility)
 */
export async function fetchLocalChanges(): Promise<SyncDatabaseChangeSet> {
  const changes: SyncDatabaseChangeSet = {}

  for (const tableName of SYNCABLE_TABLES) {
    try {
      const collection = database.get(tableName)

      const [createdRecords, updatedRecords, deletedRecords] = await Promise.all([
        collection.query(Q.where("_status", "created")).fetch(),
        collection.query(Q.where("_status", "updated")).fetch(),
        collection.query(Q.where("_status", "deleted")).fetch(),
      ])

      if (createdRecords.length > 0 || updatedRecords.length > 0 || deletedRecords.length > 0) {
        ;(changes as any)[tableName] = {
          created: createdRecords.map((r) => ({ ...r._raw })),
          updated: updatedRecords.map((r) => ({ ...r._raw })),
          deleted: deletedRecords.map((r) => ({ ...r._raw })),
        } as SyncTableChangeSet
      }
    } catch (error) {
      console.error(`[localSync] Error fetching changes for ${tableName}:`, error)
    }
  }

  return changes
}

/**
 * Mark all records in a changeset as synced after a successful hub push.
 * Sets _status = "synced" and _changed = "" on created and updated records.
 * Permanently destroys deleted records.
 */
export async function markLocalChangesAsSynced(changes: SyncDatabaseChangeSet): Promise<void> {
  await database.write(async () => {
    for (const [tableName, tableChanges] of Object.entries(changes)) {
      const collection = database.get(tableName)
      const { created = [], updated = [], deleted = [] } = tableChanges as SyncTableChangeSet

      const batch: Model[] = []

      // Mark created and updated records as synced
      const idsToSync = [...created, ...updated]
        .map((raw: any) => (typeof raw === "string" ? raw : raw?.id))
        .filter(Boolean) as string[]

      if (idsToSync.length > 0) {
        const records = await collection.query(Q.where("id", Q.oneOf(idsToSync))).fetch()
        for (const record of records) {
          batch.push(
            record.prepareUpdate((r) => {
              ;(r._raw as any)._status = "synced"
              ;(r._raw as any)._changed = ""
            }),
          )
        }
      }

      if (batch.length > 0) {
        await database.batch(batch)
      }

      // Permanently destroy deleted records
      const deletedIds = deleted
        .map((raw: any) => (typeof raw === "string" ? raw : raw?.id))
        .filter(Boolean) as string[]

      if (deletedIds.length > 0) {
        await database.adapter.destroyDeletedRecords(tableName, deletedIds)
      }
    }
  })
}

// ── Timestamp-based local changes (for force sync upload) ─────────────

/**
 * Get all local records changed since a given timestamp.
 * Uses updated_at/created_at timestamps — independent of _status.
 *
 * This is used exclusively for force sync (explicit user-triggered upload).
 * Normal hub sync uses fetchLocalChanges() which queries by _status.
 */
export async function getLocalChangesSince(
  timestamp: number,
  idsToExclude: RecordId[],
): Promise<SyncDatabaseChangeSet> {
  const tableResults = await Promise.all(
    SYNCABLE_TABLES.map((tableName) =>
      getTableChangesSince(database, tableName, timestamp, idsToExclude),
    ),
  )

  return tableResults.reduce<SyncDatabaseChangeSet>((acc, tableChange) => {
    if (
      tableChange.tableName &&
      (tableChange.created.length > 0 ||
        tableChange.updated.length > 0 ||
        tableChange.deleted.length > 0)
    ) {
      ;(acc as any)[tableChange.tableName] = {
        created: tableChange.created,
        updated: tableChange.updated,
        deleted: tableChange.deleted,
      }
    }
    return acc
  }, {} as SyncDatabaseChangeSet)
}

/**
 * Get timestamp-based changes for a specific table.
 * Uses > (strictly greater) for both query and classification.
 */
async function getTableChangesSince(
  db: Database,
  tableName: string,
  timestamp: number,
  idsToExclude: RecordId[],
): Promise<{ tableName: string; created: DirtyRaw[]; updated: DirtyRaw[]; deleted: DirtyRaw[] }> {
  try {
    const collection = db.get(tableName)

    const changedRecords = await collection
      .query(
        Q.and(
          Q.or(Q.where("updated_at", Q.gt(timestamp)), Q.where("created_at", Q.gt(timestamp))),
          Q.where("id", Q.notIn(idsToExclude)),
        ),
      )
      .fetch()

    // Deleted: records with is_deleted=true OR _status="deleted", both with timestamp filter
    const deletedRecords = await collection
      .query(
        Q.and(
          Q.or(
            Q.and(Q.where("is_deleted", Q.eq(true)), Q.where("updated_at", Q.gt(timestamp))),
            Q.and(Q.where("_status", Q.eq("deleted")), Q.where("updated_at", Q.gt(timestamp))),
          ),
          Q.where("id", Q.notIn(idsToExclude)),
        ),
      )
      .fetch()

    const created = changedRecords
      .filter((record) => (record._raw as any).created_at > timestamp)
      .map((record) => record._raw)

    const updated = changedRecords
      .filter(
        (record) =>
          (record._raw as any).created_at <= timestamp &&
          (record._raw as any).updated_at > timestamp,
      )
      .map((record) => record._raw)

    const deleted = deletedRecords.map((record) => record._raw)

    return { tableName, created, updated, deleted }
  } catch (error) {
    console.error(`[localSync] Error getting changes for table ${tableName}:`, error)
    return { tableName, created: [], updated: [], deleted: [] }
  }
}

// ── Internal helpers ──────────────────────────────────────────────────

/**
 * Fetch existing records from a collection by their IDs and return them as a Map.
 */
async function fetchExistingRecordsAsMap(
  collection: Collection<Model>,
  dirtyRecords: any[],
  schema: TableSchema,
): Promise<Map<string, Model>> {
  const ids = dirtyRecords.map((record) => sanitizedRaw(record, schema).id)
  if (ids.length === 0) return new Map()

  const existingRecords = await collection.query(Q.where("id", Q.oneOf(ids))).fetch()
  return new Map(existingRecords.map((record) => [record.id, record]))
}
