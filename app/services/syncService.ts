/**
 * Sync Service Module
 *
 * This module provides a centralized interface for managing data synchronization
 * between the mobile app and the server (both local and cloud).
 *
 * Key features:
 * - Automatic detection of sync type (local vs cloud)
 * - State management through XState store
 * - Error handling and user notifications
 * - Prevention of concurrent sync operations
 *
 * @module services/syncService
 */

import { Alert } from "react-native"
import { hasUnsyncedChanges } from "@nozbe/watermelondb/sync"
import * as Sentry from "@sentry/react-native"
import Toast from "react-native-root-toast"

import database from "@/db"
import { syncDB } from "@/db/peerSync"
import { translate } from "@/i18n/translate"
import Peer from "@/models/Peer"
import Sync from "@/models/Sync"
import { appStateStore } from "@/store/appState"
import { operationModeStore } from "@/store/operationMode"
import { syncStore } from "@/store/sync"

/**
 * Find the active peer to sync with.
 * Uses the user-selected peer if set, otherwise falls back to
 * the default priority: active hub first, then active cloud.
 */
const resolveActivePeer = async (): Promise<Peer.T | null> => {
  const { activeSyncPeerId } = appStateStore.getSnapshot().context
  if (activeSyncPeerId) {
    try {
      const peer = await Peer.DB.getById(activeSyncPeerId)
      if (peer.status === "active" || peer.status === "untrusted") return peer
    } catch {
      // Peer no longer exists — fall through to default resolution
    }
  }
  return Peer.DB.resolveActive()
}

/**
 * Starts a sync operation with the configured server.
 * This function handles both local and remote sync scenarios.
 *
 * You can (probably should always) call startSync twice in a row.
 * The first sync does: PULL --> local data conflict resolution ---> PUSH
 * The second sync does: PULL ---> local data conflict resolution (no push since there are no changes)
 * The extra sync gets any updated counts in the server (like stock counts)
 *
 *
 * @param providerEmail - Optional email to check for test accounts
 * @returns Promise that resolves when sync is complete or rejects on error
 *
 * @example
 * ```typescript
 * // Basic usage
 * await startSync('user@example.com')
 *
 * // With error handling
 * try {
 *   await startSync(currentUser.email)
 *   console.log('Sync completed successfully')
 * } catch (error) {
 *   console.error('Sync failed:', error)
 * }
 * ```
 *
 * @throws {Error} When:
 * - Test account attempts to sync
 * - App is not activated
 * - Network connection fails
 * - Server returns an error
 */
export const startSync = async (providerEmail?: string): Promise<void> => {
  // Skip sync in online mode — data flows directly via RPC
  if (operationModeStore.getSnapshot().context.mode === "online") {
    console.log("Skipping sync: app is in online mode")
    return Promise.resolve()
  }

  // Check if test account
  if (providerEmail === "tester.g@gmail.com") {
    Alert.alert("Please sign in with your server to continue syncing")
    return Promise.reject(new Error("Test account cannot sync"))
  }

  // Check if already syncing
  const currentState = syncStore.getSnapshot().context.state
  if (currentState !== Sync.State.IDLE) {
    console.log("Sync already in progress, skipping...")
    return Promise.resolve()
  }

  try {
    // Find the active peer to sync with — prefer hub if available, fall back to cloud
    const activePeer = await resolveActivePeer()
    if (!activePeer) {
      Alert.alert("No sync peer configured. Please pair with a hub or register a cloud server.")
      return Promise.reject(new Error("No active sync peer"))
    }

    const hasLocalChangesToPush = await hasUnsyncedChanges({ database })

    Toast.show(translate("common:syncStarted"), {
      position: Toast.positions.BOTTOM,
      containerStyle: {
        marginBottom: 100,
      },
    })

    const finishSync = () => syncStore.send({ type: "finish_sync" })

    return syncDB(activePeer.id, {
      hasLocalChangesToPush,
      setSyncStart: () => syncStore.send({ type: "start_sync" }),
      setSyncResolution: (fetched: number) => syncStore.send({ type: "start_resolve", fetched }),
      setPushStart: (pushed: number) => syncStore.send({ type: "start_push", pushed }),
      updateSyncStatistic: console.log,
      onSyncError: (error: string) => syncStore.send({ type: "error_sync", error }),
      onSyncCompleted: finishSync,
    }).catch((err) => {
      finishSync()
      console.error("Sync error:", err)

      const isConcurrent = String(err).includes("Concurrent synchronization")
      if (!isConcurrent) {
        const isHub = activePeer.peerType === "sync_hub"
        Toast.show(
          isHub
            ? "Error syncing locally. Please make sure you are on the same network and Wi-Fi is enabled."
            : "Error syncing. Please make sure you have internet or contact your administrator.",
          {
            position: Toast.positions.BOTTOM,
            containerStyle: { marginBottom: 100 },
            duration: Toast.durations.LONG,
          },
        )
      }

      Sentry.captureException(err)
      throw err
    })
  } catch (error) {
    console.error("Sync initialization error:", error)
    Sentry.captureException(error)
    throw error
  }
}

/**
 * Checks if the app is properly configured for syncing.
 * Verifies that the app has been activated on the administrator portal.
 *
 * @returns Promise<boolean> - true if sync is available, false otherwise
 *
 * @example
 * ```typescript
 * const canSync = await isSyncAvailable()
 * if (!canSync) {
 *   showActivationPrompt()
 * }
 * ```
 */
export const isSyncAvailable = async (): Promise<boolean> => {
  try {
    const peer = await Peer.DB.resolveActive()
    return peer !== null
  } catch {
    return false
  }
}

/**
 * Gets the current sync state from the store.
 *
 * @returns Current sync state: 'idle' | 'fetching' | 'resolving' | 'pushing' | 'error'
 *
 * @example
 * ```typescript
 * const state = getSyncState()
 * if (state === 'idle') {
 *   // Safe to start a new sync
 * }
 * ```
 */
export const getSyncState = (): Sync.StateT => {
  return syncStore.getSnapshot().context.state
}

/**
 * Checks if a sync operation is currently in progress.
 *
 * @returns true if syncing, false if idle or in error state
 *
 * @example
 * ```typescript
 * if (isSyncing()) {
 *   disableSyncButton()
 * }
 * ```
 */
export const isSyncing = (): boolean => {
  return getSyncState() !== Sync.State.IDLE
}
