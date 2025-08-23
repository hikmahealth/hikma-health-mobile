import { createStore } from "@xstate/store"
import { Option } from "effect"

const LOCK_TIMEOUT = 1000 * 60 * 5 // 5 minutes

export const appStateStore = createStore({
  context: {
    notificationsEnabled: false,
    lockWhenIdle: false,
    lastActiveTime: Option.none<Date>(),
    hersEnabled: false,
  },
  on: {
    RESET: (context) => ({
      notificationsEnabled: false,
      lockWhenIdle: false,
      lastActiveTime: Option.none(),
      hersEnabled: false,
    }),
    SET_NOTIFICATIONS_ENABLED: (context, event: { notificationsEnabled: boolean }) => ({
      ...context,
      notificationsEnabled: event.notificationsEnabled,
    }),
    SET_LOCK_WHEN_IDLE: (context, event: { lockWhenIdle: boolean }) => ({
      ...context,
      lockWhenIdle: event.lockWhenIdle,
    }),
    SET_HERS_ENABLED: (context, event: { hersEnabled: boolean }) => ({
      ...context,
      hersEnabled: event.hersEnabled,
    }),
    SET_LAST_ACTIVE_TIME: (context, event: { lastActiveTime: Date | null }) => ({
      ...context,
      lastActiveTime: Option.fromNullable(event.lastActiveTime),
    }),
  },
})

// TODO: add implementation for determining whether or not the screen is locked
