import { createStore } from "@xstate/store"
import * as SecureStore from "expo-secure-store"
import { Option } from "effect"

const LOCK_TIMEOUT = 1000 * 60 * 5 // 5 minutes
const STORAGE_KEY = "appStateStore"

type PersistedAppState = {
  notificationsEnabled: boolean
  lockWhenIdle: boolean
  hersEnabled: boolean
  activeSyncPeerId: string | null
}

const persist = (context: PersistedAppState) => {
  SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify(context))
}

export const appStateStore = createStore({
  context: {
    notificationsEnabled: false,
    lockWhenIdle: false,
    lastActiveTime: Option.none<Date>(),
    hersEnabled: false,
    /** When set, sync targets this peer instead of using the default hub>cloud priority. */
    activeSyncPeerId: null as string | null,
  },
  emits: {
    state_changed: (payload: PersistedAppState) => persist(payload),
  },
  on: {
    RESET: (_context, _event, enqueue) => {
      const next = {
        notificationsEnabled: false,
        lockWhenIdle: false,
        lastActiveTime: Option.none<Date>(),
        hersEnabled: false,
        activeSyncPeerId: null as string | null,
      }
      enqueue.emit.state_changed({
        notificationsEnabled: next.notificationsEnabled,
        lockWhenIdle: next.lockWhenIdle,
        hersEnabled: next.hersEnabled,
        activeSyncPeerId: next.activeSyncPeerId,
      })
      return next
    },
    SET_NOTIFICATIONS_ENABLED: (context, event: { notificationsEnabled: boolean }, enqueue) => {
      const next = { ...context, notificationsEnabled: event.notificationsEnabled }
      enqueue.emit.state_changed({
        notificationsEnabled: next.notificationsEnabled,
        lockWhenIdle: next.lockWhenIdle,
        hersEnabled: next.hersEnabled,
        activeSyncPeerId: next.activeSyncPeerId,
      })
      return next
    },
    SET_LOCK_WHEN_IDLE: (context, event: { lockWhenIdle: boolean }, enqueue) => {
      const next = { ...context, lockWhenIdle: event.lockWhenIdle }
      enqueue.emit.state_changed({
        notificationsEnabled: next.notificationsEnabled,
        lockWhenIdle: next.lockWhenIdle,
        hersEnabled: next.hersEnabled,
        activeSyncPeerId: next.activeSyncPeerId,
      })
      return next
    },
    SET_HERS_ENABLED: (context, event: { hersEnabled: boolean }, enqueue) => {
      const next = { ...context, hersEnabled: event.hersEnabled }
      enqueue.emit.state_changed({
        notificationsEnabled: next.notificationsEnabled,
        lockWhenIdle: next.lockWhenIdle,
        hersEnabled: next.hersEnabled,
        activeSyncPeerId: next.activeSyncPeerId,
      })
      return next
    },
    SET_LAST_ACTIVE_TIME: (context, event: { lastActiveTime: Date | null }) => ({
      ...context,
      lastActiveTime: Option.fromNullable(event.lastActiveTime),
    }),
    SET_ACTIVE_SYNC_PEER: (context, event: { peerId: string | null }, enqueue) => {
      const next = { ...context, activeSyncPeerId: event.peerId }
      enqueue.emit.state_changed({
        notificationsEnabled: next.notificationsEnabled,
        lockWhenIdle: next.lockWhenIdle,
        hersEnabled: next.hersEnabled,
        activeSyncPeerId: next.activeSyncPeerId,
      })
      return next
    },
  },
})

/** Hydrate appStateStore from SecureStore. Call once on cold start. */
export async function hydrateAppState(): Promise<void> {
  try {
    const raw = await SecureStore.getItemAsync(STORAGE_KEY)
    if (!raw) return
    const stored: PersistedAppState = JSON.parse(raw)
    appStateStore.send({
      type: "SET_NOTIFICATIONS_ENABLED",
      notificationsEnabled: stored.notificationsEnabled ?? false,
    })
    appStateStore.send({
      type: "SET_LOCK_WHEN_IDLE",
      lockWhenIdle: stored.lockWhenIdle ?? false,
    })
    appStateStore.send({
      type: "SET_HERS_ENABLED",
      hersEnabled: stored.hersEnabled ?? false,
    })
    appStateStore.send({
      type: "SET_ACTIVE_SYNC_PEER",
      peerId: stored.activeSyncPeerId ?? null,
    })
  } catch {
    // On failure, keep defaults
  }
}

// TODO: add implementation for determining whether or not the screen is locked
