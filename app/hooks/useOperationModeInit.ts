/**
 * Initializes the operation mode from AppConfig on app startup.
 *
 * Reads the server-configured mode ("offline" | "online" | "user_choice")
 * from the app_config table. When "user_choice", falls back to the
 * user's persisted preference in MMKV (defaults to "offline").
 *
 * Should be called once in app.tsx.
 */

import { useEffect } from "react"
import AppConfig from "@/models/AppConfig"
import { operationModeStore, type ModeConfig, type OperationMode } from "@/store/operationMode"
import { loadString, saveString } from "@/utils/storage"

/** MMKV key for the user's preferred operation mode */
export const MODE_PREFERENCE_KEY = "operation_mode_preference"

const VALID_MODES: ModeConfig[] = ["offline", "online", "user_choice"]

export function useOperationModeInit() {
  useEffect(() => {
    async function init() {
      try {
        const raw = await AppConfig.DB.getValue(AppConfig.Namespaces.SYSTEM, "operation_mode")
        const serverConfig: ModeConfig =
          typeof raw === "string" && VALID_MODES.includes(raw as ModeConfig)
            ? (raw as ModeConfig)
            : "offline"

        operationModeStore.send({ type: "set_server_config", config: serverConfig })

        if (serverConfig === "user_choice") {
          const stored = loadString(MODE_PREFERENCE_KEY)
          // Backward compat: "sync_hub" was a conflated mode in earlier versions.
          // Map it to "offline" — the hub peer still exists for sync resolution.
          if (stored === "sync_hub") {
            saveString(MODE_PREFERENCE_KEY, "offline")
          }
          const mode: OperationMode = stored === "online" ? "online" : "offline"
          operationModeStore.send({ type: "set_mode", mode })
        }
      } catch {
        // On any failure, stay in offline mode (the default)
        operationModeStore.send({ type: "set_server_config", config: "offline" })
      }
    }

    init()
  }, [])
}
