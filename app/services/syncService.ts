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
import { Option } from "effect"
import Toast from "react-native-root-toast"

import database from "@/db"
import { localSyncDB } from "@/db/localSync"
import { syncDB } from "@/db/sync"
import { translate } from "@/i18n/translate"
import Sync from "@/models/Sync"
import { syncStore } from "@/store/sync"
import { getHHApiUrl } from "@/utils/storage"

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
    // Verify app activation
    const url = await getHHApiUrl()
    if (Option.isNone(url)) {
      Alert.alert("Please activate your app on the administrator portal to continue syncing")
      return Promise.reject(new Error("App not activated"))
    }

    const activeServer = await Sync.Server.getActive()
    const hasLocalChangesToPush = await hasUnsyncedChanges({ database })

    Toast.show(translate("common:syncStarted"), {
      position: Toast.positions.BOTTOM,
      containerStyle: {
        marginBottom: 100,
      },
    })

    // State management functions
    const startSyncState = () => syncStore.send({ type: "start_sync" })
    const startResolve = (fetched: number) => syncStore.send({ type: "start_resolve", fetched })
    const startPush = (pushed: number) => syncStore.send({ type: "start_push", pushed })
    const errorSync = (error: string) => syncStore.send({ type: "error_sync", error })
    const finishSync = () => syncStore.send({ type: "finish_sync" })

    // Determine sync type and execute
    if (Option.isSome(activeServer) && activeServer.value.type === Sync.ServerType.LOCAL) {
      // Local sync
      return localSyncDB({
        hasLocalChangesToPush,
        setSyncStart: startSyncState,
        setSyncResolution: startResolve,
        setPushStart: startPush,
        updateSyncStatistic: console.log,
        onSyncError: errorSync,
        onSyncCompleted: finishSync,
      }).catch((err) => {
        finishSync()
        console.error("Local sync error:", err)
        Toast.show(
          "❌ Error syncing locally. Please make sure you are on the same network and Wi-Fi is enabled.",
          {
            position: Toast.positions.BOTTOM,
            containerStyle: {
              marginBottom: 100,
            },
            duration: Toast.durations.LONG,
          },
        )
        Sentry.captureException(err)
        throw err
      })
    } else {
      // Remote sync
      Sentry.addBreadcrumb({
        category: "sync",
        message: "Starting remote sync",
        level: "info",
        data: {
          hasLocalChangesToPush,
        },
      })

      return syncDB(
        hasLocalChangesToPush,
        startSyncState,
        startResolve,
        startPush,
        console.log,
        errorSync,
        finishSync,
      ).catch((err) => {
        let showToast = true
        try {
          if (String(err).includes("Concurrent synchronization")) {
            Sentry.addBreadcrumb({
              category: "sync",
              message: "Concurrent synchronization detected",
              level: "warning",
            })
            // no need to show any warnings
            showToast = false
          }
        } catch {
          // handle any other errors
          // fail silently
          Sentry.addBreadcrumb({
            category: "sync",
            message: "Error parsing sync error",
            level: "warning",
          })
        }
        finishSync()
        console.error("Remote sync error:", err)

        Sentry.addBreadcrumb({
          category: "sync",
          message: "Remote sync failed",
          level: "error",
          data: {
            errorMessage: String(err),
            showToast,
          },
        })

        if (showToast) {
          Toast.show(
            "❌ Error syncing. Please make sure you have internet or contact your administrator.",
            {
              position: Toast.positions.BOTTOM,
              containerStyle: {
                marginBottom: 100,
              },
              duration: Toast.durations.LONG,
            },
          )
        }
        Sentry.captureException(err)
        throw err
      })
    }
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
    const url = await getHHApiUrl()
    return Option.isSome(url)
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
