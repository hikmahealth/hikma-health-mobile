/**
 * Force sync service — explicit user-triggered upload/download operations.
 *
 * Unlike normal sync (which uses _status/_changed), force sync uses
 * timestamp-based queries and is designed for recovery/backfill:
 *
 *   forceUpload:   push all local records changed since a timestamp to a peer
 *   forceDownload: pull all records from a peer since a timestamp
 *
 * These never modify _status/_changed, so they don't interfere with normal sync.
 */

import * as SecureStore from "expo-secure-store"
import * as Sentry from "@sentry/react-native"
import { SyncDatabaseChangeSet } from "@nozbe/watermelondb/sync"
import { applyRemoteChanges, getLocalChangesSince } from "@/db/localSync"
import { countRecordsInChanges, updateDates } from "@/db/peerSync"
import Peer from "@/models/Peer"
import { createCloudTransport, type RpcTransport } from "@/rpc/transport"

// ── Types ─────────────────────────────────────────────────────────────

export type ForceSyncResult =
  | { ok: true; recordCount: number }
  | { ok: false; error: string }

type SyncPullResponse = {
  changes: SyncDatabaseChangeSet
  timestamp: number
}

// ── Transport resolution ──────────────────────────────────────────────

/**
 * Get the appropriate RpcTransport for a peer.
 * Hub peers use encrypted transport; cloud peers use plain JSON over HTTPS.
 */
const getTransportForPeer = async (peer: Peer.T): Promise<RpcTransport | null> => {
  switch (peer.peerType) {
    case "sync_hub":
      return Peer.Hub.getTransport()

    case "cloud_server": {
      const token = await SecureStore.getItemAsync("provider_token")
      const email = await SecureStore.getItemAsync("provider_email")
      const password = await SecureStore.getItemAsync("provider_password")

      let authHeader = ""
      if (token) {
        authHeader = `Bearer ${token}`
      } else if (email && password) {
        authHeader = `Basic ${btoa(`${email}:${password}`)}`
      }

      const baseUrl = Peer.getUrl(peer)
      if (!baseUrl) return null

      return createCloudTransport(baseUrl, () => authHeader)
    }

    default:
      return null
  }
}

// ── Force Upload ──────────────────────────────────────────────────────

/**
 * Upload all local records changed since `sinceTimestamp` to a specific peer.
 *
 * Uses timestamp-based queries — independent of _status/_changed.
 * Does NOT modify local sync metadata. Safe to call at any time.
 */
export const forceUpload = async (
  peerId: string,
  sinceTimestamp: number,
): Promise<ForceSyncResult> => {
  try {
    const peer = await Peer.DB.getById(peerId)
    const transport = await getTransportForPeer(peer)
    if (!transport) {
      return { ok: false, error: "Could not connect to peer" }
    }

    const changes = await getLocalChangesSince(sinceTimestamp, [])
    const recordCount = countRecordsInChanges(changes)

    if (recordCount === 0) {
      return { ok: true, recordCount: 0 }
    }

    updateDates(changes)

    const result = await transport.sendCommand("sync_push", {
      changes,
      lastPulledAt: sinceTimestamp,
    })

    if (!result.ok) {
      return { ok: false, error: result.error.message }
    }

    await Peer.DB.updateLastSyncedAt(peerId, Date.now())
    return { ok: true, recordCount }
  } catch (error) {
    Sentry.captureException(error, { tags: { component: "force-sync", action: "upload" } })
    return { ok: false, error: String(error) }
  }
}

// ── Force Download ────────────────────────────────────────────────────

/**
 * Download all records from a specific peer since `sinceTimestamp`.
 *
 * Applies them locally with _status = "synced" (via applyRemoteChanges).
 * Per-column conflict resolution preserves any local edits.
 */
export const forceDownload = async (
  peerId: string,
  sinceTimestamp: number,
): Promise<ForceSyncResult> => {
  try {
    const peer = await Peer.DB.getById(peerId)
    const transport = await getTransportForPeer(peer)
    if (!transport) {
      return { ok: false, error: "Could not connect to peer" }
    }

    const pullResult = await transport.sendQuery<SyncPullResponse>("sync_pull", {
      lastPulledAt: sinceTimestamp,
    })

    if (!pullResult.ok) {
      return { ok: false, error: pullResult.error.message }
    }

    const { changes, timestamp } = pullResult.data
    updateDates(changes)

    const recordCount = countRecordsInChanges(changes)
    await applyRemoteChanges(changes)

    await Peer.DB.updateLastSyncedAt(peerId, timestamp)
    return { ok: true, recordCount }
  } catch (error) {
    Sentry.captureException(error, { tags: { component: "force-sync", action: "download" } })
    return { ok: false, error: String(error) }
  }
}
