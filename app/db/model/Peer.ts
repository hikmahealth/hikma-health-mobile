import { Model } from "@nozbe/watermelondb"
import { field, text, date, readonly, json } from "@nozbe/watermelondb/decorators"

export type PeerType = "sync_hub" | "cloud_server" | "mobile_app"
export type PeerStatus = "active" | "revoked" | "untrusted"

export type PeerMetadata = {
  [key: string]: unknown
}

const sanitizeMetadata = (raw: unknown): PeerMetadata => {
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    return raw as PeerMetadata
  }
  return {}
}

export default class Peer extends Model {
  static table = "peers"

  /** Stable identity — survives IP changes */
  @text("peer_id") peerId!: string

  @text("name") name!: string

  /** Ephemeral — may change on router reassignment */
  @text("ip_address") ipAddress!: string | null

  @field("port") port!: number | null

  /** Used for encryption and identity verification */
  @text("public_key") publicKey!: string

  @field("last_synced_at") lastSyncedAt!: number | null
  @text("peer_type") peerType!: PeerType
  @field("is_leader") isLeader!: boolean
  @text("status") status!: PeerStatus
  @text("protocol_version") protocolVersion!: string
  @json("metadata", sanitizeMetadata) metadata!: PeerMetadata

  @readonly @date("created_at") createdAt!: Date
  @readonly @date("updated_at") updatedAt!: Date
}
