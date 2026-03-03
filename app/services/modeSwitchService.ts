/**
 * Service for switching between offline and online operation modes.
 *
 * Checks for unsynced changes before allowing a switch to online mode.
 * The check strategy depends on the active peer type:
 *   - cloud_server: WatermelonDB's built-in hasUnsyncedChanges
 *   - sync_hub: timestamp-based getLocalChangesSince (peer.lastSyncedAt)
 *
 * Persists the user preference to MMKV.
 */

import { hasUnsyncedChanges } from "@nozbe/watermelondb/sync"

import database from "@/db"
import { getLocalChangesSince } from "@/db/localSync"
import { countRecordsInChanges } from "@/db/peerSync"
import { MODE_PREFERENCE_KEY } from "@/hooks/useOperationModeInit"
import Peer from "@/models/Peer"
import { operationModeStore } from "@/store/operationMode"
import { saveString } from "@/utils/storage"

export type SwitchResult =
  | { ok: true }
  | { ok: false; reason: "unsynced_changes" | "already_in_mode" | "error"; message: string }

/**
 * Check whether there are local changes not yet synced to the given peer.
 *
 * Strategy varies by peer type because the two sync mechanisms track
 * changes differently:
 *   cloud_server → WatermelonDB sync metadata (_changed, _status columns)
 *   sync_hub     → timestamp comparison via getLocalChangesSince
 *
 * Returns false when no peer is provided (nothing to lose data to).
 */
export const checkUnsyncedChanges = async (peer: Peer.T | null): Promise<boolean> => {
  if (!peer) return false

  switch (peer.peerType) {
    case "cloud_server":
      return hasUnsyncedChanges({ database })

    case "sync_hub": {
      const since = peer.lastSyncedAt ?? 0
      const changes = await getLocalChangesSince(since, [])
      return countRecordsInChanges(changes) > 0
    }

    default:
      return false
  }
}

/**
 * Switch to online mode.
 * Fails if there are unsynced local changes that would be lost.
 */
export async function switchToOnlineMode(): Promise<SwitchResult> {
  const { mode } = operationModeStore.getSnapshot().context
  console.log("[ModeSwitch] switchToOnlineMode called, current mode:", mode)
  if (mode === "online") return { ok: false, reason: "already_in_mode", message: "Already online" }

  try {
    operationModeStore.send({ type: "start_transition" })

    const activePeer = await Peer.DB.resolveActive()
    const hasChanges = await checkUnsyncedChanges(activePeer)
    console.log("[ModeSwitch] hasUnsyncedChanges:", hasChanges, "peerType:", activePeer?.peerType)

    if (hasChanges) {
      operationModeStore.send({ type: "end_transition", mode: "offline" })
      return {
        ok: false,
        reason: "unsynced_changes",
        message: "Sync local changes before switching to online mode",
      }
    }

    saveString(MODE_PREFERENCE_KEY, "online")
    operationModeStore.send({ type: "end_transition", mode: "online" })
    console.log("[ModeSwitch] Successfully switched to online")
    return { ok: true }
  } catch (e) {
    console.error("[ModeSwitch] Error switching to online:", e)
    operationModeStore.send({ type: "end_transition", mode: "offline" })
    return { ok: false, reason: "error", message: String(e) }
  }
}

/**
 * Switch to offline mode. Always succeeds.
 */
export async function switchToOfflineMode(): Promise<SwitchResult> {
  const { mode } = operationModeStore.getSnapshot().context
  if (mode === "offline")
    return { ok: false, reason: "already_in_mode", message: "Already offline" }

  operationModeStore.send({ type: "start_transition" })
  saveString(MODE_PREFERENCE_KEY, "offline")
  operationModeStore.send({ type: "end_transition", mode: "offline" })
  return { ok: true }
}
