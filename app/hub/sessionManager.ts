/**
 * @deprecated Import from `@/models/Peer` instead (Peer.Hub namespace).
 * Re-exports preserved for backwards compatibility.
 */
import Peer from "@/models/Peer"

export const pairWithHub = Peer.Hub.pair
export const resumeSession = Peer.Hub.resume
export const getHubTransport = Peer.Hub.getTransport
export const unpairHub = Peer.Hub.unpair
export const isPairedWithHub = Peer.Hub.isPaired
