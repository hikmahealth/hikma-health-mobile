import { useCallback, useMemo } from "react"
import { useSelector } from "@xstate/react"
import { Option } from "effect"

import Sync from "@/models/Sync"
import { startSync as startSyncService, isSyncAvailable } from "@/services/syncService"
import { providerStore } from "@/store/provider"
import { syncStore } from "@/store/sync"

export interface UseSyncReturn {
  /**
   * Current sync state
   */
  state: string
  /**
   * Whether a sync operation is currently in progress
   */
  isSyncing: boolean
  /**
   * Whether the sync is currently fetching data
   */
  isFetching: boolean
  /**
   * Whether the sync is currently resolving data
   */
  isResolving: boolean
  /**
   * Whether the sync is currently pushing data
   */
  isPushing: boolean
  /**
   * Whether the sync is idle
   */
  isIdle: boolean
  /**
   * Whether there was an error during sync
   */
  hasError: boolean
  /**
   * Error message if sync failed
   */
  error?: string
  /**
   * Number of records fetched
   */
  fetched?: number
  /**
   * Number of records pushed
   */
  pushed?: number
  /**
   * Trigger a sync operation
   */
  startSync: () => Promise<void>
  /**
   * Force reset sync operation
   */
  forceReset: () => Promise<void>
  /**
   * Check if sync is available (app is activated)
   */
  checkSyncAvailability: () => Promise<boolean>
}

/**
 * Hook for managing sync operations in components
 *
 * @example
 * ```tsx
 * const { isSyncing, startSync, state } = useSync()
 *
 * const handleSync = async () => {
 *   try {
 *     await startSync()
 *     console.log('Sync completed')
 *   } catch (error) {
 *     console.error('Sync failed:', error)
 *   }
 * }
 * ```
 */
export const useSync = (): UseSyncReturn => {
  const syncContext = useSelector(syncStore, (state) => state.context)
  const provider = useSelector(providerStore, (state) => state.context)

  const isSyncing = useMemo(() => {
    return syncContext.state !== Sync.State.IDLE
  }, [syncContext.state])

  const isFetching = useMemo(() => {
    return syncContext.state === Sync.State.FETCHING
  }, [syncContext.state])

  const isResolving = useMemo(() => {
    return syncContext.state === Sync.State.RESOLVING
  }, [syncContext.state])

  const isPushing = useMemo(() => {
    return syncContext.state === Sync.State.PUSHING
  }, [syncContext.state])

  const isIdle = useMemo(() => {
    return syncContext.state === Sync.State.IDLE
  }, [syncContext.state])

  const hasError = useMemo(() => {
    return syncContext.state === Sync.State.ERROR
  }, [syncContext.state])

  const startSync = useCallback(async () => {
    return startSyncService(provider.email)
  }, [provider.email])

  const forceReset = useCallback(async () => {
    return syncStore.trigger.force_reset()
  }, [provider.email])

  const checkSyncAvailability = useCallback(async () => {
    return isSyncAvailable()
  }, [])

  return {
    state: syncContext.state,
    isSyncing,
    isFetching,
    isResolving,
    isPushing,
    isIdle,
    hasError,
    error: Option.isSome(syncContext.error) ? syncContext.error.value : undefined,
    fetched: syncContext.stats.fetched,
    pushed: syncContext.stats.pushed,
    startSync,
    forceReset,
    checkSyncAvailability,
  }
}
