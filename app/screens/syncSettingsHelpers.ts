/**
 * Pure display helpers for converting Peer.T to UI display shapes.
 * Extracted for testability — no React Native imports.
 */
import Peer from "@/models/Peer"
import type { PeerType } from "@/db/model/Peer"

/** UI display type for the server list */
export type DisplayServerType = "local" | "cloud"

export type ServerDisplay = {
  id: string
  type: DisplayServerType
  url: string
  isActive: boolean
  lastSyncedAt: number | null
}

/**
 * Maps PeerType to the display type used in the UI.
 */
export const peerTypeToDisplayType = (peerType: PeerType): DisplayServerType => {
  switch (peerType) {
    case "sync_hub":
      return "local"
    case "cloud_server":
      return "cloud"
    default:
      return "cloud"
  }
}

/**
 * Extract a display URL from a Peer.T record.
 * Checks metadata.url first (used by both cloud and hub peers),
 * then falls back to ipAddress/port.
 */
export const peerDisplayUrl = (peer: Peer.T): string => {
  if (peer.metadata?.url) {
    return String(peer.metadata.url)
  }
  if (peer.ipAddress) {
    return peer.port ? `${peer.ipAddress}:${peer.port}` : peer.ipAddress
  }
  return ""
}

/**
 * Convert a Peer.T to the ServerDisplay shape the UI components expect.
 * `isActive` only reflects whether the peer's status is "active" —
 * use `markSyncTarget` to determine which peer is the actual sync target.
 */
export const peerToServerDisplay = (peer: Peer.T): ServerDisplay => ({
  id: peer.id,
  type: peerTypeToDisplayType(peer.peerType),
  url: peerDisplayUrl(peer),
  isActive: peer.status === "active",
  lastSyncedAt: peer.lastSyncedAt,
})

/**
 * Given a list of server displays, mark only the one the sync service
 * would actually pick as the sync target.
 *
 * When `activeSyncPeerId` is provided (user has explicitly chosen a peer),
 * that peer is marked as the target. Otherwise falls back to the default
 * priority: active hub first, then active cloud.
 */
export const markSyncTarget = (
  servers: ServerDisplay[],
  activeSyncPeerId?: string | null,
): ServerDisplay[] => {
  let targetId: string | undefined

  if (activeSyncPeerId) {
    // User-selected peer takes precedence if it exists in the list
    const selected = servers.find((s) => s.id === activeSyncPeerId)
    if (selected) targetId = selected.id
  }

  if (!targetId) {
    const activeHub = servers.find((s) => s.type === "local" && s.isActive)
    targetId = activeHub?.id ?? servers.find((s) => s.type === "cloud" && s.isActive)?.id
  }

  return servers.map((s) => ({
    ...s,
    isActive: s.id === targetId,
  }))
}

export const getServerDisplayName = (type: DisplayServerType): string => {
  switch (type) {
    case "local":
      return "Local Server"
    case "cloud":
      return "Cloud Server"
    default:
      return "Unknown Server"
  }
}
