/**
 * @deprecated Import from `@/models/Peer` instead.
 * Re-exports preserved for backwards compatibility.
 */
import Peer from "@/models/Peer"

export const upsertPeer = Peer.DB.upsert
export const upsertHubPeer = Peer.DB.upsertHub
export const upsertCloudPeer = Peer.DB.upsertCloud
export const findPeer = Peer.DB.getByPeerId
export const findHubPeer = Peer.DB.getByPeerId
export const revokePeer = Peer.DB.revoke
export const revokeHubPeer = Peer.DB.revoke
export const getActivePeers = Peer.DB.getActiveByType
export const getActiveHubPeers = () => Peer.DB.getActiveByType("sync_hub")
export const getActiveCloudPeers = () => Peer.DB.getActiveByType("cloud_server")
