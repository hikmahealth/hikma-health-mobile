import { createStore } from "@xstate/store"
import { Option } from "effect"

import Sync from "@/models/Sync"

export const syncStore = createStore({
  context: {
    state: Sync.State.IDLE,
    stats: {
      fetched: 0,
      pushed: 0,
    },
    error: Option.none<string>(),
  } as {
    state: Sync.StateT
    stats: {
      fetched: number
      pushed: number
    }
    error: Option.Option<string>
  },
  on: {
    start_sync: (context) => ({
      ...context,
      state: Sync.State.FETCHING,
    }),

    start_resolve: (context, event: { fetched: number }) => {
      if (context.state !== Sync.State.FETCHING) {
        console.error("Sync is not in fetching state")
        return { ...context }
      }
      return {
        ...context,
        state: Sync.State.RESOLVING,
        stats: { fetched: event.fetched, pushed: 0 },
      }
    },

    start_push: (context, event: { pushed: number }) => {
      if (context.state !== Sync.State.RESOLVING) {
        console.error("Sync is not in resolving state")
        return { ...context }
      }
      return {
        ...context,
        state: Sync.State.PUSHING,
        stats: { fetched: 0, pushed: event.pushed },
      }
    },

    finish_sync: (context) => {
      // NOTE: Should we actually check this?? we should allow a finish at any time right?
      if (
        context.state !== Sync.State.PUSHING &&
        context.state !== Sync.State.RESOLVING &&
        context.state !== Sync.State.ERROR
      ) {
        console.error("Sync is not in pushing state")
        return { ...context }
      }
      return {
        ...context,
        state: Sync.State.IDLE,
        stats: { fetched: 0, pushed: 0 },
      }
    },

    error_sync: (context, event: { error: string }) => {
      // TOMBSTONE: Nov 11 2025 - do we really need to check what state we are in? errors can occur at any time/state
      // if (context.state !== Sync.State.PUSHING && context.state !== Sync.State.RESOLVING) {
      //   console.error("Sync is not in pushing or resolving state")
      //   return { ...context }
      // }
      return {
        ...context,
        state: Sync.State.ERROR,
        error: Option.some(event.error),
      }
    },

    clear_error: (context) => {
      if (context.state !== Sync.State.ERROR) {
        console.error("Sync is not in error state")
        return { ...context }
      }
      return {
        ...context,
        state: Sync.State.IDLE,
        error: Option.none<string>(),
      }
    },

    force_reset: () => {
      return {
        state: Sync.State.IDLE,
        stats: { fetched: 0, pushed: 0 },
        error: Option.none<string>(),
      }
    },
  },
})
