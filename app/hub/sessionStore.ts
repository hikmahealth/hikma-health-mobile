/**
 * @deprecated Import from `@/models/Peer` instead (Peer.Session namespace).
 * Re-exports preserved for backwards compatibility.
 */
import Peer from "@/models/Peer"

export const saveSession = Peer.Session.save
export const loadSession = Peer.Session.load
export const clearSession = Peer.Session.clear
export const getOrCreateClientId = Peer.Session.getOrCreateClientId
