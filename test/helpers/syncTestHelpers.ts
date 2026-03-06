import type { SyncDatabaseChangeSet } from "@nozbe/watermelondb/sync"

/**
 * Build a minimal sync record with sensible defaults.
 * All fields can be overridden.
 */
export function makeRecord(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    id: "rec-1",
    created_at: "2024-01-15T10:00:00Z",
    updated_at: "2024-01-15T12:00:00Z",
    ...overrides,
  }
}

/**
 * Build a SyncDatabaseChangeSet from a simple table spec.
 *
 * Example:
 * ```ts
 * makeChangeset({
 *   patients: { created: [makeRecord()], updated: [], deleted: [] },
 * })
 * ```
 */
export function makeChangeset(
  tables: Record<
    string,
    { created?: any[]; updated?: any[]; deleted?: any[] }
  >,
): SyncDatabaseChangeSet {
  const result: Record<string, any> = {}
  for (const [name, changes] of Object.entries(tables)) {
    result[name] = {
      created: changes.created ?? [],
      updated: changes.updated ?? [],
      deleted: changes.deleted ?? [],
    }
  }
  return result as SyncDatabaseChangeSet
}
