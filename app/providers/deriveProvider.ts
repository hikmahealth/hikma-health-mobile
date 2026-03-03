/**
 * Pure functions for deriving the correct DataProvider configuration
 * from (OperationMode, activePeer).
 *
 * Separates the WHAT (which provider kind) from the HOW (constructing it).
 */

import type { PeerType } from "@/db/model/Peer"
import type { OperationMode } from "@/store/operationMode"

/**
 * The kind of provider the DataAccessProvider should construct.
 * - "offline"   → createOfflineProvider(database)
 * - "rpc_cloud" → createRpcProvider(cloudTransport)
 * - "rpc_hub"   → createRpcProvider(hubTransport)
 */
export type ProviderKind = "offline" | "rpc_cloud" | "rpc_hub"

/**
 * Minimal peer shape needed for provider derivation.
 * Keeps the function decoupled from the full Peer.T.
 */
export type ActivePeerInfo = { readonly peerType: PeerType } | null

/**
 * Derive which provider kind to use given the current mode
 * and the active peer (if any).
 *
 * Rules:
 *   offline → always "offline"
 *   online + cloud_server peer → "rpc_cloud"
 *   online + sync_hub peer    → "rpc_hub"
 *   online + no peer          → "offline" (fallback)
 *   online + mobile_app peer  → "offline" (invalid, defensive fallback)
 */
export const deriveProviderKind = (
  mode: OperationMode,
  activePeer: ActivePeerInfo,
): ProviderKind => {
  if (mode === "offline") return "offline"

  if (!activePeer) return "offline"

  switch (activePeer.peerType) {
    case "cloud_server":
      return "rpc_cloud"
    case "sync_hub":
      return "rpc_hub"
    default:
      return "offline"
  }
}
