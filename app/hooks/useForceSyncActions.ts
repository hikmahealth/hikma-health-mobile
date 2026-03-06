/**
 * React hook for force sync upload/download actions.
 *
 * Wraps forceSyncService for use in the Sync Settings UI.
 * Provides loading states and result feedback.
 */

import { useCallback, useState } from "react"
import Toast from "react-native-root-toast"

import {
  forceUpload,
  forceDownload,
  type ForceSyncResult,
} from "@/services/forceSyncService"

type ForceSyncState = {
  isUploading: boolean
  isDownloading: boolean
  lastResult: ForceSyncResult | null
}

const initialState: ForceSyncState = {
  isUploading: false,
  isDownloading: false,
  lastResult: null,
}

export function useForceSyncActions(peerId: string) {
  const [state, setState] = useState<ForceSyncState>(initialState)

  const upload = useCallback(
    async (sinceTimestamp: number) => {
      setState((s) => ({ ...s, isUploading: true, lastResult: null }))
      try {
        const result = await forceUpload(peerId, sinceTimestamp)
        setState((s) => ({ ...s, isUploading: false, lastResult: result }))

        if (result.ok) {
          Toast.show(`Uploaded ${result.recordCount} records`, {
            position: Toast.positions.BOTTOM,
            duration: Toast.durations.LONG,
            containerStyle: { marginBottom: 100 },
          })
        } else {
          Toast.show(`Upload failed: ${result.error}`, {
            position: Toast.positions.BOTTOM,
            duration: Toast.durations.LONG,
            containerStyle: { marginBottom: 100 },
          })
        }
      } catch (error) {
        const result: ForceSyncResult = { ok: false, error: String(error) }
        setState((s) => ({ ...s, isUploading: false, lastResult: result }))
      }
    },
    [peerId],
  )

  const download = useCallback(
    async (sinceTimestamp: number) => {
      setState((s) => ({ ...s, isDownloading: true, lastResult: null }))
      try {
        const result = await forceDownload(peerId, sinceTimestamp)
        setState((s) => ({ ...s, isDownloading: false, lastResult: result }))

        if (result.ok) {
          Toast.show(`Downloaded ${result.recordCount} records`, {
            position: Toast.positions.BOTTOM,
            duration: Toast.durations.LONG,
            containerStyle: { marginBottom: 100 },
          })
        } else {
          Toast.show(`Download failed: ${result.error}`, {
            position: Toast.positions.BOTTOM,
            duration: Toast.durations.LONG,
            containerStyle: { marginBottom: 100 },
          })
        }
      } catch (error) {
        const result: ForceSyncResult = { ok: false, error: String(error) }
        setState((s) => ({ ...s, isDownloading: false, lastResult: result }))
      }
    },
    [peerId],
  )

  return { state, upload, download }
}
