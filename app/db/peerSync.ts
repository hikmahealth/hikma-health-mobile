/**
 * Unified peer sync module.
 *
 * Treats every sync target — cloud server or local hub — as a peer
 * in the `peers` table. Dispatches to the appropriate sync strategy
 * based on `peer.peerType`:
 *
 *   cloud_server → WatermelonDB synchronize() over HTTPS
 *   sync_hub     → encrypted RPC + manual change application
 */

import * as EncryptedStorage from "expo-secure-store"
import {
  SyncDatabaseChangeSet,
  SyncTableChangeSet,
  synchronize,
  Timestamp,
} from "@nozbe/watermelondb/sync"
import * as Sentry from "@sentry/react-native"

import { getResultData } from "../../types/data"

import type { PeerType } from "@/db/model/Peer"
import Peer from "@/models/Peer"
import User from "@/models/User"
import { toDateSafe } from "@/utils/date"
import { logger } from "@/utils/logger"
import { safeStringify } from "@/utils/parsers"

import { applyRemoteChanges, fetchLocalChanges, markLocalChangesAsSynced } from "./localSync"

import database from "."

global.Buffer = require("buffer").Buffer

// ── Types ────────────────────────────────────────────────────────────

export type SyncCallbacks = {
  hasLocalChangesToPush: boolean
  setSyncStart: () => void
  setSyncResolution: (records: number) => void
  setPushStart: (pushed: number) => void
  updateSyncStatistic: (stats: { fetched: number; pushed: number }) => void
  onSyncError: (error: string) => void
  onSyncCompleted: () => void
}

type SyncPullResponse = {
  changes: SyncDatabaseChangeSet
  timestamp: number
}

// ── Helpers ──────────────────────────────────────────────────────────

/**
 * Count the number of records inside a changeset.
 */
export const countRecordsInChanges = (changes: SyncDatabaseChangeSet): number => {
  let result = 0
  const c = changes as Record<string, SyncTableChangeSet>
  for (const tableName in c) {
    const table = c[tableName]
    if (!table || typeof table !== "object") continue
    const { created = [], updated = [], deleted = [] } = table
    result += created.length + updated.length + deleted.length
  }
  return result
}

/**
 * Converts a date value to a Unix timestamp (milliseconds).
 * Returns the fallback when the value is falsy, non-finite, or unparseable.
 *
 * Every fallback path reports to Sentry so silent data corruption is surfaced.
 */
export const convertToTimestamp = (
  value: unknown,
  fallback: Date,
  fieldName: string,
  recordId?: string,
): number => {
  const id = recordId ?? "unknown"

  if (!value && value !== 0) {
    Sentry.captureMessage(`Date fallback: missing ${fieldName} for record ${id}`, {
      level: "warning",
      tags: { component: "convertToTimestamp", fieldName },
      extra: { recordId: id, value },
    })
    return fallback.getTime()
  }

  if (typeof value === "boolean" || (typeof value === "object" && !(value instanceof Date))) {
    Sentry.captureMessage(`Date fallback: invalid type for ${fieldName} on record ${id}`, {
      level: "warning",
      tags: { component: "convertToTimestamp", fieldName },
      extra: { recordId: id, value, valueType: typeof value },
    })
    return fallback.getTime()
  }

  if (typeof value === "number" && !isFinite(value)) {
    Sentry.captureMessage(`Date fallback: non-finite ${fieldName} for record ${id}`, {
      level: "warning",
      tags: { component: "convertToTimestamp", fieldName },
      extra: { recordId: id, value },
    })
    return fallback.getTime()
  }

  try {
    const ts = new Date(value as string | number | Date).getTime()
    if (isNaN(ts)) {
      Sentry.captureMessage(`Date fallback: unparseable ${fieldName} for record ${id}: ${value}`, {
        level: "warning",
        tags: { component: "convertToTimestamp", fieldName },
        extra: { recordId: id, value },
      })
      return fallback.getTime()
    }
    return ts
  } catch (error) {
    Sentry.captureMessage(`Date fallback: exception parsing ${fieldName} for record ${id}`, {
      level: "warning",
      tags: { component: "convertToTimestamp", fieldName },
      extra: { recordId: id, value, error: String(error) },
    })
    return fallback.getTime()
  }
}

/**
 * In-place conversion of date strings → timestamps and JSON objects → stringified JSON
 * across all records in a WatermelonDB changeset.
 */
export const updateDates = (changes: SyncDatabaseChangeSet): void => {
  const defaultDate = new Date()
  const actions = ["created", "updated", "deleted"] as unknown as (keyof SyncTableChangeSet)[]
  const c = changes as Record<string, SyncTableChangeSet>

  for (const type of Object.keys(c)) {
    for (const action of actions) {
      if (!c[type][action]) continue
      ;(c[type][action] as any[]).forEach((record: any) => {
        // deleted arrays contain string IDs, not record objects — skip them
        if (typeof record === "string") return

        const recordId = record.id || "unknown"

        // ── Timestamps ──────────────────────────────────────────────
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
        if (record.deleted_at)
          record.deleted_at = convertToTimestamp(
            record.deleted_at,
            defaultDate,
            "deleted_at",
            recordId,
          )
        if (record.timestamp)
          record.timestamp = convertToTimestamp(
            record.timestamp,
            defaultDate,
            "timestamp",
            recordId,
          )
        if (record.prescribed_at)
          record.prescribed_at = convertToTimestamp(
            record.prescribed_at,
            defaultDate,
            "prescribed_at",
            recordId,
          )
        if (record.filled_at)
          record.filled_at = convertToTimestamp(
            record.filled_at,
            defaultDate,
            "filled_at",
            recordId,
          )
        if (record.expiration_date)
          record.expiration_date = convertToTimestamp(
            record.expiration_date,
            defaultDate,
            "expiration_date",
            recordId,
          )
        if (record.batch_expiry_date)
          record.batch_expiry_date = convertToTimestamp(
            record.batch_expiry_date,
            defaultDate,
            "batch_expiry_date",
            recordId,
          )
        if (record.check_in_timestamp)
          record.check_in_timestamp = convertToTimestamp(
            record.check_in_timestamp,
            defaultDate,
            "check_in_timestamp",
            recordId,
          )

        record.image_timestamp = 0

        // ── JSON fields (JSONB → string for WatermelonDB) ───────────
        if (record.departments) record.departments = safeStringify(record.departments, "[]")
        if (record.metadata) record.metadata = safeStringify(record.metadata, "{}")
        if (record.form_fields) record.form_fields = safeStringify(record.form_fields, "[]")
        if (record.translations) record.translations = safeStringify(record.translations, "[]")
        if (record.clinic_ids) record.clinic_ids = safeStringify(record.clinic_ids, "[]")
        if (record.form_data) record.form_data = safeStringify(record.form_data, "[]")
        if (record.fields) record.fields = safeStringify(record.fields, "[]")

        // ── date_of_birth (stored as "YYYY-MM-DD" string, not timestamp) ─
        if (record.date_of_birth !== undefined && record.date_of_birth !== null) {
          try {
            const dob = record.date_of_birth
            if (typeof dob === "string" && dob.trim() === "") {
              record.date_of_birth = null
            } else if (typeof dob === "string" && /^\d{4}-\d{2}-\d{2}$/.test(dob)) {
              const [y, m, d] = dob.split("-").map(Number)
              record.date_of_birth = y === 0 && m === 0 && d === 0 ? null : dob
            } else {
              const date = toDateSafe(dob, new Date())
              if (isNaN(date.getTime())) {
                record.date_of_birth = null
              } else {
                const year = date.getUTCFullYear()
                const month = String(date.getUTCMonth() + 1).padStart(2, "0")
                const day = String(date.getUTCDate()).padStart(2, "0")
                record.date_of_birth = `${year}-${month}-${day}`
              }
            }
          } catch {
            record.date_of_birth = null
          }
        }
      })
    }
  }
}

// ── Auth helpers ─────────────────────────────────────────────────────

const getCredentials = async (): Promise<{ email: string; password: string }> => {
  const email = await EncryptedStorage.getItem("provider_email")
  const password = await EncryptedStorage.getItem("provider_password")
  if (!email || !password) throw new Error("No credentials found. Please sign in.")
  return { email, password }
}

const buildBasicAuthHeaders = (email: string, password: string): Headers => {
  const encoded = Buffer.from(`${email}:${password}`).toString("base64")
  const headers = new Headers()
  headers.append("Authorization", `Basic ${encoded}`)
  return headers
}

const getSyncApiUrl = async (): Promise<string> => {
  const url = await Peer.getActiveUrl()
  if (!url) throw new Error("HH API URL not found")
  return `${url}/api/v2/sync`
}

// ── Strategy: Cloud ──────────────────────────────────────────────────

const syncCloud = async (peer: Peer.T, callbacks: SyncCallbacks): Promise<void> => {
  const { email, password } = await getCredentials()

  // Refresh user info (clinic, roles, etc.) before syncing
  await User.signIn(email, password)

  const headers = buildBasicAuthHeaders(email, password)
  const SYNC_API = await getSyncApiUrl()

  callbacks.setSyncStart()

  await synchronize({
    database,
    sendCreatedAsUpdated: false,
    pullChanges: async ({ lastPulledAt, schemaVersion, migration }) => {
      const pullStart = Date.now()
      const urlParams = `last_pulled_at=${lastPulledAt || 0}&schema_version=${schemaVersion}&migration=${encodeURIComponent(JSON.stringify(migration))}`

      const response = await fetch(`${SYNC_API}?${urlParams}`, { headers })
      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Cloud sync pull failed (${response.status}): ${errorText}`)
      }

      const { changes, timestamp }: { changes: SyncDatabaseChangeSet; timestamp: Timestamp } =
        await response.json()

      updateDates(changes)

      const fetched = countRecordsInChanges(changes)
      console.log(`[Cloud Sync] Pulled ${fetched} records (${Date.now() - pullStart}ms)`)
      callbacks.setSyncResolution(fetched)

      if (!callbacks.hasLocalChangesToPush) {
        setTimeout(() => callbacks.onSyncCompleted(), 2_500)
      }

      return { changes, timestamp }
    },
    pushChanges: async ({ changes, lastPulledAt }) => {
      callbacks.setPushStart(countRecordsInChanges(changes))

      const pushHeaders = new Headers(headers)
      pushHeaders.set("Content-Type", "application/json")

      const response = await fetch(`${SYNC_API}?last_pulled_at=${lastPulledAt || 0}`, {
        method: "POST",
        headers: pushHeaders,
        body: JSON.stringify(changes),
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Cloud sync push failed (${response.status}): ${errorText}`)
      }

      callbacks.onSyncCompleted()
    },
    migrationsEnabledAtVersion: 1,
  })

  await Peer.DB.updateLastSyncedAt(peer.id, Date.now())
}

// ── Strategy: Hub (encrypted RPC) ────────────────────────────────────

const syncHub = async (peer: Peer.T, callbacks: SyncCallbacks): Promise<void> => {
  callbacks.setSyncStart()

  const transport = await Peer.Hub.getTransport()
  if (!transport) {
    throw new Error("Hub not connected — pair with a hub first")
  }

  const lastPulledAt = peer.lastSyncedAt ?? 0
  const token_res = await Peer.Session.getTokenByPeerId(peer.peerId)
  const token = getResultData(token_res, undefined)
  // () => {
  //   if (token_res.ok) {
  //     return token_res.data
  //   } else {
  //     return undefined
  //   }
  // }
  logger.log("[HUB SYNC]", { lastPulledAt, peer: JSON.stringify(peer, null, 2), token })

  // ── Pull ─────────────────────────────────────────────────────────
  const pullResult = await transport.sendQuery<SyncPullResponse>(
    "sync_pull",
    { lastPulledAt },
    token,
  )
  logger.log("[Sync] After pullResult: ", pullResult)
  if (!pullResult.ok) {
    throw new Error(`sync_pull failed: ${pullResult.error.message}`)
  }

  const { changes, timestamp } = pullResult.data
  const fetchedCount = countRecordsInChanges(changes)
  console.log("[Sync] fetched count: ", fetchedCount)
  callbacks.setSyncResolution(fetchedCount)

  await applyRemoteChanges(changes)

  // ── Push ─────────────────────────────────────────────────────────
  const localChanges = await fetchLocalChanges()
  const pushCount = countRecordsInChanges(localChanges)
  callbacks.setPushStart(pushCount)

  if (pushCount > 0) {
    const pushResult = await transport.sendCommand("sync_push", {
      changes: localChanges,
      lastPulledAt,
    })
    if (!pushResult.ok) {
      throw new Error(`sync_push failed: ${pushResult.error.message}`)
    }

    await markLocalChangesAsSynced(localChanges)
  }

  // ── Persist timestamp ────────────────────────────────────────────
  await Peer.DB.updateLastSyncedAt(peer.id, timestamp)
  callbacks.onSyncCompleted()
}

// ── Strategy dispatch ────────────────────────────────────────────────

const strategies: Record<PeerType, (peer: Peer.T, cb: SyncCallbacks) => Promise<void>> = {
  cloud_server: syncCloud,
  sync_hub: syncHub,
  mobile_app: () => {
    throw new Error("Cannot sync with a mobile_app peer directly")
  },
}

// ── Public API ───────────────────────────────────────────────────────

/**
 * Sync the local database with a specific peer.
 *
 * @param peerId  WatermelonDB record ID of the peer in the `peers` table
 * @param callbacks  UI / state callbacks for progress reporting
 */
export const syncDB = async (peerId: string, callbacks: SyncCallbacks): Promise<void> => {
  const peer = await Peer.DB.getById(peerId)

  const strategy = strategies[peer.peerType]
  if (!strategy) {
    throw new Error(`Unknown peer type: ${peer.peerType}`)
  }

  Sentry.addBreadcrumb({
    category: "peer-sync",
    message: `Starting sync with ${peer.peerType} peer`,
    level: "info",
    data: { peerId: peer.peerId, peerType: peer.peerType },
  })

  try {
    await strategy(peer, callbacks)
  } catch (error) {
    Sentry.captureException(error, {
      tags: { component: "peer-sync", peerType: peer.peerType },
    })
    callbacks.onSyncError(String(error))
    throw error
  }
}
