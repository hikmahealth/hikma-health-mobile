/**
 * Hook for managing peer registration from QR codes.
 *
 * Handles both hub (sync_hub) and cloud (cloud_server) peers:
 * - Hub QR: ECDH handshake → session persistence → Peer table upsert
 * - Cloud QR: URL validation → API URL storage → Peer table upsert
 *
 * Used by LoginScreen (initial registration) and SyncSettingsScreen (adding servers).
 */

import { useState, useCallback, useEffect } from "react"

import Peer from "@/models/Peer"
import type { HubSession } from "@/rpc/handshake"
import { parseQRCode, isHubQR } from "@/rpc/qrParser"

export type PeerConnectionType = "sync_hub" | "cloud"

export type PeerRegistrationResult =
  | { ok: true; type: "sync_hub"; hubSession: HubSession }
  | { ok: true; type: "cloud"; url: string }
  | { ok: false; error: string }

export function usePeerRegistration() {
  const [connectionType, setConnectionType] = useState<PeerConnectionType | null>(null)
  const [hubSession, setHubSession] = useState<HubSession | null>(null)
  const [isRegistering, setIsRegistering] = useState(false)

  /**
   * Register a peer from raw QR code data.
   *
   * Parses the QR, determines if it's a hub or cloud peer,
   * performs the appropriate registration (handshake or URL validation),
   * and updates the Peer table.
   */
  const registerFromQR = useCallback(async (data: string): Promise<PeerRegistrationResult> => {
    setIsRegistering(true)
    try {
      const qr = parseQRCode(data)

      console.log({ qr })

      // Hub QR: JSON with { type: "sync_hub", url: "..." }
      if (qr && isHubQR(qr)) {
        const result = await Peer.Hub.pair(qr.url)
        if (!result.ok) {
          return { ok: false, error: result.error.message }
        }
        setHubSession(result.data)
        setConnectionType("sync_hub")
        return { ok: true, type: "sync_hub", hubSession: result.data }
      }

      // Cloud QR: plain URL
      const url = qr ? qr.url : data

      // Validate the URL is reachable
      let canOpen = false
      try {
        await fetch(url, { method: "HEAD" })
        canOpen = true
      } catch {
        canOpen = false
      }

      if (!canOpen) {
        return { ok: false, error: "URL is not reachable" }
      }

      // Register as a cloud peer (Peer table is the source of truth for URLs)
      await Peer.DB.upsertCloud(url)
      setConnectionType("cloud")
      return { ok: true, type: "cloud", url }
    } finally {
      setIsRegistering(false)
    }
  }, [])

  /**
   * Register a peer directly from a URL (no QR parsing).
   * Useful when the URL is already known (e.g., manual entry or existing server re-scan).
   */
  const registerFromUrl = useCallback(
    async (url: string, type: PeerConnectionType): Promise<PeerRegistrationResult> => {
      if (type === "sync_hub") {
        // Wrap in hub QR format and delegate
        return registerFromQR(JSON.stringify({ type: "sync_hub", url }))
      }
      return registerFromQR(url)
    },
    [registerFromQR],
  )

  /** Reset registration state (e.g., when switching flows) */
  const reset = useCallback(() => {
    console.warn("🔥 Calling reset in usePeerRegistration hook")
    setConnectionType(null)
    setHubSession(null)
    setIsRegistering(false)
  }, [])

  return {
    /** Current connection type after successful registration */
    connectionType,
    /** Hub session (only set when connectionType === "sync_hub") */
    hubSession,
    /** Whether a registration is in progress */
    isRegistering,
    /** Register a peer from raw QR code data */
    registerFromQR,
    /** Register a peer from a known URL and type */
    registerFromUrl,
    /** Reset all state */
    reset,
  }
}
