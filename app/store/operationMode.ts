/**
 * Operation mode store — controls whether the app uses offline (WatermelonDB)
 * or online (HTTP) data access.
 *
 * Mode is determined by:
 * 1. Server AppConfig ("offline" | "online" | "user_choice")
 * 2. Local user preference (MMKV) when server allows "user_choice"
 * Defaults to "offline" until initialized.
 */

import { createStore } from "@xstate/store"

export type OperationMode = "offline" | "online"

/** Admin-configured mode from AppConfig */
export type ModeConfig = "offline" | "online" | "user_choice"

type ModeContext = {
  mode: OperationMode
  configSource: "local" | "server"
  serverConfig: ModeConfig
  isTransitioning: boolean
}

const initialContext: ModeContext = {
  mode: "offline",
  configSource: "local",
  serverConfig: "user_choice",
  isTransitioning: false,
}

export const operationModeStore = createStore({
  context: initialContext,
  on: {
    set_mode: (context, event: { mode: OperationMode }) => ({
      ...context,
      mode: event.mode,
      isTransitioning: false,
    }),

    set_server_config: (context, event: { config: ModeConfig }) => ({
      ...context,
      serverConfig: event.config,
      configSource: "server" as const,
      ...(event.config !== "user_choice" ? { mode: event.config } : {}),
    }),

    start_transition: (context) => ({
      ...context,
      isTransitioning: true,
    }),

    end_transition: (context, event: { mode: OperationMode }) => ({
      ...context,
      mode: event.mode,
      isTransitioning: false,
    }),

    reset: () => ({ ...initialContext }),
  },
})
