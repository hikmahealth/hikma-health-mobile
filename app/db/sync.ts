// @depreated File - DO NOT USE.
// Transitioning into peerSync for aunified sync story
//
// @ts-check
import * as EncryptedStorage from "expo-secure-store"
import {
  SyncDatabaseChangeSet,
  synchronize,
  SyncTableChangeSet,
  Timestamp,
} from "@nozbe/watermelondb/sync"
import * as Sentry from "@sentry/react-native"
import { Exit, Option } from "effect"

import Sync from "@/models/Sync"
import User from "@/models/User"
import { safeStringify } from "@/utils/parsers"
import Peer from "@/models/Peer"

import database from "."
import { Platform } from "react-native"
import { toDateSafe } from "@/utils/date"

global.Buffer = require("buffer").Buffer

// const HIKMA_API = Config.HIKMA_API

// const SYNC_API = `${HIKMA_API}/api/v2/sync`

/**
 * Critical tables that must be checked to determine if database is empty.
 * These are the core tables that would contain data after the first sync.
 */
const CRITICAL_TABLES_FOR_EMPTY_CHECK = [
  "patients",
  "visits",
  "events",
  "users",
  "clinics",
  "appointments",
  "prescriptions",
  "patient_additional_attributes",
  "drug_catalogue",
  "clinic_inventory",
] as const

/**
 * Checks if a specific table is empty in the database
 * @param tableName The name of the table to check
 * @returns Promise<boolean> True if the table is empty, false otherwise
 */
async function isTableEmpty(tableName: string): Promise<boolean> {
  try {
    const collection = database.get(tableName)
    const count = await collection.query().fetchCount()
    return count === 0
  } catch (error) {
    console.error(`Error checking if table ${tableName} is empty:`, error)
    Sentry.captureException(error, {
      tags: { component: "turbo-sync", operation: "table-empty-check" },
      extra: { tableName },
    })
    // If we can't determine, assume not empty to be safe
    return false
  }
}

/**
 * Checks if the database is completely empty by verifying all critical tables.
 * This is a safety check to determine if turbo sync can be used.
 *
 * IMPORTANT: Turbo sync should ONLY be used when the database is completely empty.
 * Using turbo sync on a non-empty database is a serious programmer error.
 *
 * @returns Promise<boolean> True if database is completely empty and safe for turbo sync
 */
export async function isDatabaseEmpty(): Promise<boolean> {
  const startTime = Date.now()

  try {
    console.log("[Turbo Sync Check] Starting database empty check...")

    // Check the last pull timestamp - should be 0 for first sync
    const lastPullTimestamp = Sync.Server.getLastPullTimestamp("cloud")
    console.log(`[Turbo Sync Check] Last pull timestamp: ${lastPullTimestamp}`)

    // If we have a non-zero timestamp, database is not empty (we've synced before)
    if (typeof lastPullTimestamp === "number" && lastPullTimestamp > 0) {
      console.log(
        "[Turbo Sync Check] Database not empty - lastPullTimestamp indicates previous sync",
      )
      return false
    }

    // Check all critical tables
    const tableChecks = await Promise.all(
      CRITICAL_TABLES_FOR_EMPTY_CHECK.map(async (tableName) => {
        const isEmpty = await isTableEmpty(tableName)
        console.log(`[Turbo Sync Check] Table '${tableName}': ${isEmpty ? "EMPTY" : "HAS DATA"}`)
        return { tableName, isEmpty }
      }),
    )

    // Find any tables that have data
    const tablesWithData = tableChecks.filter((check) => !check.isEmpty)

    const isCompletelyEmpty = tablesWithData.length === 0
    const duration = Date.now() - startTime

    if (isCompletelyEmpty) {
      console.log(
        `[Turbo Sync Check] ✅ Database is EMPTY and safe for turbo sync (checked in ${duration}ms)`,
      )
    } else {
      console.log(
        `[Turbo Sync Check] ❌ Database is NOT EMPTY - ${tablesWithData.length} table(s) have data:`,
        tablesWithData.map((t) => t.tableName).join(", "),
      )
    }

    // Log to Sentry for monitoring
    Sentry.addBreadcrumb({
      category: "turbo-sync",
      message: `Database empty check: ${isCompletelyEmpty ? "EMPTY" : "NOT EMPTY"}`,
      level: "info",
      data: {
        isCompletelyEmpty,
        lastPullTimestamp,
        tablesWithData: tablesWithData.map((t) => t.tableName),
        durationMs: duration,
      },
    })

    return isCompletelyEmpty
  } catch (error) {
    const duration = Date.now() - startTime
    console.error(
      `[Turbo Sync Check] Error during database empty check (after ${duration}ms):`,
      error,
    )
    Sentry.captureException(error, {
      tags: { component: "turbo-sync", operation: "database-empty-check" },
      extra: { durationMs: duration },
    })

    // If we can't determine, return false to be safe (don't use turbo sync)
    return false
  }
}

/**
 * Determines if turbo sync should be used for the current sync operation.
 * Turbo sync is only safe for the first sync when the database is completely empty.
 *
 * @returns Promise<{useTurbo: boolean, reason: string}> Decision and reason
 */
export async function shouldUseTurboSync(): Promise<{ useTurbo: boolean; reason: string }> {
  try {
    // Check if database is empty
    const isEmpty = await isDatabaseEmpty()

    if (!isEmpty) {
      return {
        useTurbo: false,
        reason: "Database is not empty - turbo sync only allowed for first sync",
      }
    }

    // Platform check - turbo sync requires JSI which doesn't work on web
    // or when Chrome Remote Debugging is enabled
    const isWeb = Platform.OS === "web"
    // setting hasJSI to false manually, this will disable turbo sync for now.
    // TODO: Come back and fix this later
    const hasJSI = false
    // false ||
    // (database.adapter.constructor.name === "SQLiteAdapter" &&
    //   (global as any).__waterlonJSI !== undefined)
    if (isWeb || !hasJSI) {
      console.warn(
        "[Turbo Sync Check] JSI not available - turbo sync not supported in this environment",
      )
      return {
        useTurbo: false,
        reason: "JSI not available (web platform or debugger attached)",
      }
    }

    // All checks passed
    console.log("[Turbo Sync Check] ✅ ALL CHECKS PASSED - Turbo sync will be used")
    return {
      useTurbo: true,
      reason: "Database empty and JSI available",
    }
  } catch (error) {
    console.error("[Turbo Sync Check] Error in shouldUseTurboSync:", error)
    Sentry.captureException(error, {
      tags: { component: "turbo-sync", operation: "should-use-turbo-check" },
    })

    // Default to safe mode (no turbo) if any error occurs
    return {
      useTurbo: false,
      reason: `Error during check: ${error}`,
    }
  }
}

/**
 * Validates that a raw JSON string is safe for turbo sync.
 * Turbo sync will FAIL if there are any deleted records in the response.
 * This is the pure validation logic, separated for testability.
 *
 * @param rawJson - The raw JSON response from the server
 * @returns {valid: boolean, reason: string} - Whether response is valid for turbo
 */
export function validateTurboResponsePayload(rawJson: string): {
  valid: boolean
  reason: string
} {
  try {
    const parsed = JSON.parse(rawJson)

    if (!parsed.changes || typeof parsed.changes !== "object") {
      return { valid: false, reason: "Response missing 'changes' object" }
    }

    const changes = parsed.changes

    for (const tableName of Object.keys(changes)) {
      const tableChanges = changes[tableName]

      if (tableChanges && Array.isArray(tableChanges.deleted) && tableChanges.deleted.length > 0) {
        return {
          valid: false,
          reason: `Table '${tableName}' has deleted records (turbo sync requires empty deleted arrays)`,
        }
      }
    }

    return { valid: true, reason: "No deleted records in response" }
  } catch (error) {
    return { valid: false, reason: `Failed to parse response: ${error}` }
  }
}

function validateTurboResponse(rawJson: string): { valid: boolean; reason: string } {
  // Bypass the check of the JSON, since thats the whole point of turbo sync
  return {
    valid: true,
    reason: "Turbo sync bypassed",
  }
  // When re-enabling validation, use:
  // return validateTurboResponsePayload(rawJson)
}

/**
 * PHASE 5: Tracks turbo sync fallback attempts to prevent infinite loops
 */
let turboFallbackAttempted = false

/**
 * PHASE 5: Resets the turbo fallback flag (call this at the start of each sync)
 */
function resetTurboFallback() {
  turboFallbackAttempted = false
}

/**
 * PHASE 5: Checks if we can attempt a fallback to standard sync
 */
function canAttemptTurboFallback(): boolean {
  return !turboFallbackAttempted
}

/**
 * PHASE 5: Marks that we've attempted a turbo fallback
 */
function markTurboFallbackAttempted() {
  turboFallbackAttempted = true
}

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

  // Attempt a sign-in to refresh user information (clinic, roles, etc.)
  // This must succeed before we can sync
  if (email && password) {
    try {
      await User.signIn(email, password)
      console.log("User info refreshed before sync")
    } catch (error) {
      console.error("Failed to refresh user info before sync:", error)
      onSyncError("Authentication failed. Please sign in again.")
      throw new Error("Authentication failed")
      // return // Exit early - don't proceed with sync if authentication fails
    }
  } else {
    // No credentials available
    onSyncError("No credentials found. Please sign in.")
    return
  }

  const buffer = Buffer.from(`${email}:${password}`)
  const encodedUsernameAndPassword = buffer.toString("base64")

  const headers = new Headers()
  headers.append("Authorization", "Basic " + encodedUsernameAndPassword)

  // ============================================================================
  // PHASE 2 & 3: Turbo Sync Detection
  // ============================================================================
  // Reset fallback tracking at the start of each sync
  resetTurboFallback()

  // Check if we should use turbo sync (only for first sync with empty database)
  const turboDecision = await shouldUseTurboSync()
  const useTurbo = turboDecision.useTurbo

  console.log(
    `[Sync] Turbo mode: ${useTurbo ? "ENABLED ✅" : "DISABLED ❌"} - Reason: ${turboDecision.reason}`,
  )

  // Log to Sentry for monitoring (PHASE 6)
  Sentry.addBreadcrumb({
    category: "sync",
    message: `Sync started with turbo mode: ${useTurbo}`,
    level: "info",
    data: {
      useTurbo,
      reason: turboDecision.reason,
    },
  })

  setSyncStart()

  try {
    await synchronize({
      database,
      sendCreatedAsUpdated: false,
      unsafeTurbo: useTurbo, // PHASE 3: Enable turbo sync flag
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

        console.log(`[Sync] Pulling changes from the server (Turbo: ${useTurbo})`)
        const pullStartTime = Date.now()

        // ============================================================================
        // PHASE 2: Conditional Turbo/Standard Mode Logic
        // ============================================================================
        if (useTurbo) {
          // TURBO MODE: Return raw JSON text without parsing
          console.log("[Sync Turbo] Using TURBO mode - fetching raw JSON")

          try {
            const urlParams = `last_pulled_at=${lastPulledAt || 0}&schema_version=${schemaVersion}&migration=${encodeURIComponent(JSON.stringify(migration))}`

            const HH_API = await Peer.getActiveUrl()
            if (!HH_API) {
              throw new Error("HH API URL not found")
            }
            const SYNC_API = `${HH_API}/api/v2/sync`

            const response = await fetch(`${SYNC_API}?${urlParams}`, {
              headers: headers,
            })

            if (!response.ok) {
              const errorText = await response.text()
              console.error("[Sync Turbo] Error fetching data from server:", errorText)

              // PHASE 6: Track error with Sentry
              Sentry.captureException(new Error(`Turbo sync fetch failed: ${response.status}`), {
                tags: { component: "sync", mode: "turbo", phase: "fetch" },
                extra: {
                  statusCode: response.status,
                  errorText,
                },
              })

              throw new Error(`Sync pull failed: ${errorText}`)
            }

            // Get raw JSON text (DO NOT parse)
            const rawJson = await response.text()
            const pullDuration = Date.now() - pullStartTime

            // PHASE 4: Validate backend response for turbo sync
            const validation = validateTurboResponse(rawJson)
            if (!validation.valid) {
              console.error(`[Sync Turbo] ❌ Response validation failed: ${validation.reason}`)

              // PHASE 6: Track validation failure with Sentry
              Sentry.captureMessage("Turbo sync validation failed", {
                level: "warning",
                tags: { component: "sync", mode: "turbo", phase: "validation" },
                extra: {
                  reason: validation.reason,
                  jsonSize: rawJson.length,
                },
              })

              throw new Error(`Turbo sync validation failed: ${validation.reason}`)
            }

            console.log(
              `[Sync Turbo] ✅ Successfully fetched and validated raw JSON (${rawJson.length} chars in ${pullDuration}ms)`,
            )

            // PHASE 6: Log performance metrics to Sentry
            Sentry.addBreadcrumb({
              category: "sync-turbo",
              message: "Turbo sync pull completed",
              level: "info",
              data: {
                jsonSize: rawJson.length,
                durationMs: pullDuration,
                validated: true,
              },
            })

            // Return raw JSON for turbo processing
            return { syncJson: rawJson }
          } catch (error) {
            const pullDuration = Date.now() - pullStartTime
            console.error(`[Sync Turbo] ❌ Error in turbo mode (after ${pullDuration}ms):`, error)

            // PHASE 6: Capture exception with detailed context
            Sentry.captureException(error, {
              tags: { component: "sync", mode: "turbo", phase: "pull" },
              extra: {
                durationMs: pullDuration,
                lastPulledAt,
                schemaVersion,
              },
            })

            // Re-throw to let synchronize handle the error
            throw error
          }
        } else {
          // STANDARD MODE: Parse JSON and process normally
          console.log("[Sync Standard] Using STANDARD mode - parsing JSON")

          let changes: SyncDatabaseChangeSet = {}
          let timestamp: Timestamp = lastPulledAt || 0

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
                  timestamp = lastPulledAt as number
                }
              },
              onFailure: (error) => {
                console.error("Error getting changes and timestamp", error)
                changes = {}
                timestamp = lastPulledAt as number
                Sentry.captureException(error)
              },
            })

            // In place update and set dates
            updateDates(changes)

            const newRecordsToChange = countRecordsInChanges(changes)
            const pullDuration = Date.now() - pullStartTime

            console.log(
              `[Sync Standard] ✅ Successfully pulled ${newRecordsToChange} records (${pullDuration}ms)`,
            )

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

            // PHASE 6: Log performance metrics to Sentry
            Sentry.addBreadcrumb({
              category: "sync-standard",
              message: "Standard sync pull completed",
              level: "info",
              data: {
                recordCount: newRecordsToChange,
                durationMs: pullDuration,
              },
            })

            return { changes, timestamp }
          } catch (error) {
            const pullDuration = Date.now() - pullStartTime
            console.error(`[Sync Standard] ❌ Error pulling changes (after ${pullDuration}ms)`)
            console.error(error)

            // PHASE 6: Capture exception with detailed context
            Sentry.captureException(error, {
              tags: { component: "sync", mode: "standard", phase: "pull" },
              extra: {
                durationMs: pullDuration,
                lastPulledAt,
                schemaVersion,
              },
            })

            timestamp = lastPulledAt as number
            onSyncError(String(error))
            return { changes, timestamp }
          }
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
              throw new Error("Error pushing changes to the server")
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
  } catch (error) {
    // ============================================================================
    // PHASE 5: Turbo Sync Fallback Mechanism
    // ============================================================================
    // If turbo sync fails and we haven't tried fallback yet, retry with standard sync
    if (useTurbo && canAttemptTurboFallback()) {
      console.warn("[Sync Fallback] ⚠️ Turbo sync failed, attempting fallback to standard sync...")

      // PHASE 6: Track fallback attempt with Sentry
      Sentry.captureMessage("Turbo sync failed, falling back to standard sync", {
        level: "warning",
        tags: { component: "sync", mode: "turbo", phase: "fallback" },
        extra: {
          error: String(error),
          fallbackAttempted: true,
        },
      })

      markTurboFallbackAttempted()

      // Retry the entire sync with standard mode
      // Recursively call syncDB with turbo disabled (fallback flag will prevent infinite loop)
      try {
        console.log("[Sync Fallback] Retrying sync in standard mode...")

        // The shouldUseTurboSync check will now return false due to the fallback flag
        // or we can just directly call with a modified flow
        await synchronize({
          database,
          sendCreatedAsUpdated: false,
          unsafeTurbo: false, // Force standard mode
          pullChanges: async ({ lastPulledAt, schemaVersion, migration }) => {
            console.log("[Sync Fallback] Pulling changes in standard mode")
            const pullStartTime = Date.now()

            let changes: SyncDatabaseChangeSet = {}
            let timestamp: Timestamp = lastPulledAt || 0

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
                    timestamp = lastPulledAt as number
                  }
                },
                onFailure: (error) => {
                  console.error("Error getting changes and timestamp", error)
                  changes = {}
                  timestamp = lastPulledAt as number
                  Sentry.captureException(error)
                },
              })

              updateDates(changes)
              const newRecordsToChange = countRecordsInChanges(changes)
              const pullDuration = Date.now() - pullStartTime

              console.log(
                `[Sync Fallback] ✅ Fallback successful - pulled ${newRecordsToChange} records (${pullDuration}ms)`,
              )

              setSyncResolution(newRecordsToChange)

              if (!hasLocalChangesToPush) {
                setTimeout(() => {
                  onSyncCompleted()
                }, 2_500)
              }

              // PHASE 6: Track successful fallback
              Sentry.addBreadcrumb({
                category: "sync-fallback",
                message: "Fallback to standard sync succeeded",
                level: "info",
                data: {
                  recordCount: newRecordsToChange,
                  durationMs: pullDuration,
                },
              })

              return { changes, timestamp }
            } catch (fallbackError) {
              console.error("[Sync Fallback] ❌ Fallback also failed:", fallbackError)

              // PHASE 6: Track failed fallback
              Sentry.captureException(fallbackError, {
                tags: { component: "sync", mode: "fallback", phase: "pull" },
                extra: { originalError: String(error) },
              })

              timestamp = lastPulledAt as number
              onSyncError(String(fallbackError))
              return { changes, timestamp }
            }
          },
          pushChanges: async ({ changes, lastPulledAt }) => {
            setPushStart(countRecordsInChanges(changes))
            headers.append("Content-Type", "application/json")

            try {
              const res = await Sync.syncPush(lastPulledAt || 0, changes, headers)
              onSyncCompleted()

              Exit.match(res, {
                onSuccess: (value) => {
                  console.log("[Sync Fallback] Push successful", value)
                },
                onFailure: (error) => {
                  console.error("[Sync Fallback] Push rejected ids", error)
                  throw new Error("Error pushing changes to the server")
                },
              })

              Sync.Server.setLastPullTimestamp("cloud", lastPulledAt).catch((error) => {
                console.error("Failed to set last pull timestamp.", error)
              })
            } catch (error) {
              console.error(error)
              onSyncError(String(error))
              throw new Error("Error pushing changes to the server")
            }
          },
          migrationsEnabledAtVersion: 1,
        })

        console.log("[Sync Fallback] ✅ Fallback sync completed successfully")

        // PHASE 6: Track successful complete fallback
        Sentry.captureMessage("Turbo sync fallback completed successfully", {
          level: "info",
          tags: { component: "sync", mode: "fallback", phase: "complete" },
        })
      } catch (fallbackError) {
        console.error("[Sync Fallback] ❌ Fallback sync failed:", fallbackError)

        // PHASE 6: Track complete fallback failure
        Sentry.captureException(fallbackError, {
          tags: { component: "sync", mode: "fallback", phase: "complete" },
          extra: {
            originalError: String(error),
            turboAttempted: true,
          },
        })

        onSyncError(String(fallbackError))
        throw fallbackError
      }
    } else {
      // Either not using turbo, or already attempted fallback - just propagate the error
      console.error("[Sync] ❌ Sync failed:", error)

      // PHASE 6: Track sync failure
      Sentry.captureException(error, {
        tags: { component: "sync", mode: useTurbo ? "turbo" : "standard", phase: "complete" },
        extra: {
          usedTurbo: useTurbo,
          fallbackAlreadyAttempted: turboFallbackAttempted,
        },
      })

      onSyncError(String(error))
      throw error
    }
  }
}

/**
 * Converts a date value to a Unix timestamp (milliseconds)
 * @param value - The date value to convert (string, Date, number, etc.)
 * @param fallback - Fallback date to use if value is falsy
 * @param fieldName - Name of the field being converted (for logging)
 * @param recordId - ID of the record (for logging)
 * @returns Unix timestamp in milliseconds
 */
export function convertToTimestamp(
  value: unknown,
  fallback: Date,
  fieldName: string,
  recordId?: string,
): number {
  // Use fallback if value is falsy
  if (!value && value !== 0) {
    return fallback.getTime()
  }

  // Reject types that Date constructor accepts but are semantically wrong
  if (typeof value === "boolean" || (typeof value === "object" && !(value instanceof Date))) {
    return fallback.getTime()
  }

  // Reject non-finite numbers (NaN, Infinity, -Infinity)
  if (typeof value === "number" && !isFinite(value)) {
    return fallback.getTime()
  }

  try {
    const timestamp = new Date(value as string | number | Date).getTime()

    // Validate the timestamp is valid
    if (isNaN(timestamp)) {
      console.warn(
        `Invalid ${fieldName} for record ${recordId || "unknown"}: ${value}. Using fallback.`,
      )
      return fallback.getTime()
    }

    return timestamp
  } catch (error) {
    console.error(`Error converting ${fieldName} for record ${recordId || "unknown"}:`, error)
    return fallback.getTime()
  }
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
          // deleted arrays contain string IDs, not record objects — skip them
          if (typeof record === "string") return

          const recordId = record.id || "unknown"

          // --- Timestamps ---
          // Common timestamps present on most tables
          record.created_at = convertToTimestamp(
            record.created_at,
            defaultDate,
            "created_at",
            recordId,
          )
          record.updated_at = convertToTimestamp(
            record.updated_at,
            defaultDate,
            "updated_at",
            recordId,
          )
          if (record.deleted_at) {
            record.deleted_at = convertToTimestamp(
              record.deleted_at,
              defaultDate,
              "deleted_at",
              recordId,
            )
          }

          if (record.timestamp) {
            record.timestamp = convertToTimestamp(
              record.timestamp,
              defaultDate,
              "timestamp",
              recordId,
            )
          }

          // Prescription and appointment timestamps
          if (record.prescribed_at) {
            record.prescribed_at = convertToTimestamp(
              record.prescribed_at,
              defaultDate,
              "prescribed_at",
              recordId,
            )
          }
          if (record.filled_at) {
            record.filled_at = convertToTimestamp(
              record.filled_at,
              defaultDate,
              "filled_at",
              recordId,
            )
          }
          if (record.expiration_date) {
            record.expiration_date = convertToTimestamp(
              record.expiration_date,
              defaultDate,
              "expiration_date",
              recordId,
            )
          }
          if (record.batch_expiry_date) {
            record.batch_expiry_date = convertToTimestamp(
              record.batch_expiry_date,
              defaultDate,
              "batch_expiry_date",
              recordId,
            )
          }

          // Visit check-in timestamp
          if (record.check_in_timestamp) {
            record.check_in_timestamp = convertToTimestamp(
              record.check_in_timestamp,
              defaultDate,
              "check_in_timestamp",
              recordId,
            )
          }

          record.image_timestamp = 0

          // --- JSON fields ---
          // All JSONB columns from the server must be stringified for WatermelonDB storage
          if (record.departments) {
            record.departments = safeStringify(record.departments, "[]")
          }
          if (record.metadata) {
            record.metadata = safeStringify(record.metadata, "{}")
          }
          if (record.form_fields) {
            record.form_fields = safeStringify(record.form_fields, "[]")
          }
          if (record.translations) {
            record.translations = safeStringify(record.translations, "[]")
          }
          if (record.clinic_ids) {
            record.clinic_ids = safeStringify(record.clinic_ids, "[]")
          }
          if (record.form_data) {
            record.form_data = safeStringify(record.form_data, "[]")
          }
          if (record.fields) {
            record.fields = safeStringify(record.fields, "[]")
          }

          // --- Special fields ---
          // date_of_birth is stored as "YYYY-MM-DD" string, not a timestamp
          if (record.date_of_birth !== undefined && record.date_of_birth !== null) {
            try {
              const dob = record.date_of_birth

              // Empty or whitespace-only strings are not valid dates
              if (typeof dob === "string" && dob.trim() === "") {
                record.date_of_birth = null
              }
              // Case 1: Already a string in YYYY-MM-DD format - keep as-is
              // Reject clearly invalid dates like "0000-00-00"
              else if (typeof dob === "string" && /^\d{4}-\d{2}-\d{2}$/.test(dob)) {
                const [y, m, d] = dob.split("-").map(Number)
                if (y === 0 && m === 0 && d === 0) {
                  record.date_of_birth = null
                } else {
                  record.date_of_birth = dob
                }
              }
              // Case 2: String or Date object that needs conversion
              else {
                const date = toDateSafe(dob, new Date())

                if (isNaN(date.getTime())) {
                  console.warn(`Invalid date_of_birth for record ${recordId}: ${dob}`)
                  record.date_of_birth = null
                } else {
                  // Use UTC methods to avoid timezone shifting
                  const year = date.getUTCFullYear()
                  const month = String(date.getUTCMonth() + 1).padStart(2, "0")
                  const day = String(date.getUTCDate()).padStart(2, "0")
                  record.date_of_birth = `${year}-${month}-${day}`
                }
              }
            } catch (error) {
              console.error(`Error formatting date_of_birth for record ${recordId}:`, error)
              record.date_of_birth = null
            }
          }
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
    const table = changes[tableName]
    if (!table || typeof table !== "object") continue
    const { created = [], updated = [], deleted = [] } = table
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
