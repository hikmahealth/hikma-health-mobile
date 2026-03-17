import { Q } from "@nozbe/watermelondb"
import * as SecureStore from "expo-secure-store"
import { v4 as uuidv4 } from "uuid"

import database from "@/db"
import PeerModel, { PeerType, PeerStatus, PeerMetadata } from "@/db/model/Peer"
import { encode, decode } from "@/crypto/encoding"
import { performHandshake, type HubSession } from "@/rpc/handshake"
import { createEncryptedTransport, type RpcTransport } from "@/rpc/transport"
import type { RpcResult } from "@/rpc/types"
import { ok, err, type Result, type DataError } from "../../types/data"
import { checkUrl } from "@/utils/misc"

namespace Peer {
  export type T = {
    id: string
    peerId: string
    name: string
    ipAddress: string | null
    port: number | null
    publicKey: string
    lastSyncedAt: number | null
    peerType: PeerType
    isLeader: boolean
    status: PeerStatus
    protocolVersion: string
    metadata: PeerMetadata
    createdAt: Date
    updatedAt: Date
  }

  export type UpsertParams = {
    peerId: string
    name: string
    peerType: PeerType
    publicKey?: string
    ipAddress?: string
    port?: number
    url?: string
  }

  export type DBPeer = PeerModel

  export const empty: T = {
    id: "",
    peerId: "",
    name: "",
    ipAddress: null,
    port: null,
    publicKey: "",
    lastSyncedAt: null,
    peerType: "mobile_app",
    isLeader: false,
    status: "untrusted",
    protocolVersion: "",
    metadata: {},
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  export const fromDB = (db: DB.T): T => ({
    id: db.id,
    peerId: db.peerId,
    name: db.name,
    ipAddress: db.ipAddress,
    port: db.port,
    publicKey: db.publicKey,
    lastSyncedAt: db.lastSyncedAt,
    peerType: db.peerType,
    isLeader: db.isLeader,
    status: db.status,
    protocolVersion: db.protocolVersion,
    metadata: db.metadata,
    createdAt: db.createdAt,
    updatedAt: db.updatedAt,
  })

  export const displayName = (peer: T): string => peer.name || peer.peerId

  // ── DB operations ─────────────────────────────────────────────────────

  export namespace DB {
    export type T = PeerModel
    export const table_name = "peers"

    const collection = () => database.get<T>(table_name)

    export const create = async (
      peer: Omit<Peer.T, "id" | "createdAt" | "updatedAt">,
    ): Promise<string> =>
      database.write(async () => {
        const record = await collection().create((rec) => {
          rec.peerId = peer.peerId
          rec.name = peer.name
          rec.ipAddress = peer.ipAddress
          rec.port = peer.port
          rec.publicKey = peer.publicKey
          rec.lastSyncedAt = peer.lastSyncedAt
          rec.peerType = peer.peerType
          rec.isLeader = peer.isLeader
          rec.status = peer.status
          rec.protocolVersion = peer.protocolVersion
          rec.metadata = peer.metadata ?? {}
        })
        return record.id
      })

    export const upsert = async (params: UpsertParams): Promise<void> => {
      const existing = await collection().query(Q.where("peer_id", params.peerId)).fetch()

      if (existing.length > 0) {
        await database.write(() =>
          existing[0].update((rec) => {
            rec.name = params.name
            rec.status = "active"
            if (params.publicKey) rec.publicKey = params.publicKey
            if (params.ipAddress) rec.ipAddress = params.ipAddress
            if (params.port !== undefined) rec.port = params.port
            if (params.url) rec.metadata = { ...rec.metadata, url: params.url }
          }),
        )
      } else {
        await database.write(() =>
          collection().create((rec) => {
            rec.peerId = params.peerId
            rec.name = params.name
            rec.peerType = params.peerType
            rec.publicKey = params.publicKey ?? ""
            rec.status = "active"
            rec.isLeader = false
            rec.protocolVersion = "1"
            rec.ipAddress = params.ipAddress ?? null
            rec.port = params.port ?? null
            rec.metadata = params.url ? { url: params.url } : {}
          }),
        )
      }
    }

    export const upsertHub = async (params: {
      hubId: string
      name: string
      publicKey: string
      ipAddress?: string
      port?: number
      url?: string
    }): Promise<void> =>
      upsert({
        peerId: params.hubId,
        name: params.name,
        peerType: "sync_hub",
        publicKey: params.publicKey,
        ipAddress: params.ipAddress,
        port: params.port,
        url: params.url,
      })

    // We currently do not allow 2 cloud peers to be registered at the same time.
    // If a cloud peer already exists, replace it with the new one.
    export const upsertCloud = async (url: string): Promise<void> => {
      const existing = await getActiveByType("cloud_server")
      for (const peer of existing) {
        if (peer.peerId !== `cloud:${url}`) {
          await database.write(() =>
            peer.update((rec) => {
              rec.status = "revoked"
            }),
          )
        }
      }
      await upsert({
        peerId: `cloud:${url}`,
        name: "Cloud Server",
        peerType: "cloud_server",
        url,
      })
    }

    export const getById = async (id: string): Promise<Peer.T> => {
      const record = await collection().find(id)
      return fromDB(record)
    }

    export const getByPeerId = async (peerId: string): Promise<Peer.T | null> => {
      const records = await collection().query(Q.where("peer_id", peerId), Q.take(1)).fetch()
      return records.length > 0 ? fromDB(records[0]) : null
    }

    export const getAll = async (): Promise<Peer.T[]> => {
      const records = await collection().query(Q.sortBy("created_at", Q.desc)).fetch()
      return records.map(fromDB)
    }

    export const getActive = async (): Promise<Peer.T[]> => {
      const records = await collection()
        .query(Q.where("status", "active"), Q.sortBy("created_at", Q.desc))
        .fetch()
      return records.map(fromDB)
    }

    export const getActiveByType = async (peerType: PeerType): Promise<DB.T[]> =>
      collection().query(Q.where("peer_type", peerType), Q.where("status", "active")).fetch()

    /** Resolve the active sync peer. Prefers hub, falls back to cloud. */
    export const resolveActive = async (): Promise<Peer.T | null> => {
      const hubs = await getActiveByType("sync_hub")
      if (hubs.length > 0) return fromDB(hubs[0])
      const clouds = await getActiveByType("cloud_server")
      if (clouds.length > 0) return fromDB(clouds[0])
      return null
    }

    export const getLeader = async (): Promise<Peer.T | null> => {
      const records = await collection()
        .query(Q.where("is_leader", true), Q.where("status", "active"), Q.take(1))
        .fetch()
      return records.length > 0 ? fromDB(records[0]) : null
    }

    export const updateStatus = async (id: string, status: PeerStatus): Promise<void> => {
      const record = await collection().find(id)
      await database.write(() =>
        record.update((rec) => {
          rec.status = status
        }),
      )
    }

    export const revoke = async (peerId: string): Promise<void> => {
      const records = await collection().query(Q.where("peer_id", peerId)).fetch()
      if (records.length === 0) return
      await database.write(() =>
        records[0].update((rec) => {
          rec.status = "revoked"
        }),
      )
    }

    export const updateLastSyncedAt = async (id: string, timestamp: number): Promise<void> => {
      const record = await collection().find(id)
      await database.write(() =>
        record.update((rec) => {
          rec.lastSyncedAt = timestamp
        }),
      )
    }

    export const deleteById = async (id: string): Promise<void> => {
      const record = await collection().find(id)
      await database.write(() => record.markAsDeleted())
    }

    export const subscribe = (callback: (peers: Peer.T[]) => void): { unsubscribe: () => void } => {
      const subscription = collection()
        .query(Q.where("status", Q.notEq("revoked")), Q.sortBy("created_at", Q.desc))
        .observe()
        .subscribe((records) => callback(records.map(fromDB)))
      return { unsubscribe: () => subscription.unsubscribe() }
    }

    export const subscribeById = (
      id: string,
      callback: (peer: Peer.T | null) => void,
    ): { unsubscribe: () => void } => {
      const subscription = collection()
        .findAndObserve(id)
        .subscribe(
          (record) => callback(fromDB(record)),
          () => callback(null),
        )
      return { unsubscribe: () => subscription.unsubscribe() }
    }
  }

  // ── Session persistence (SecureStore) ─────────────────────────────────

  export namespace Session {
    const SESSION_KEY = "hub_session"
    const CLIENT_ID_KEY = "hub_client_id"

    type Serialized = {
      hubUrl: string
      hubId: string
      clientId: string
      sharedKey: string // base64url-encoded
      token: string | null
    }

    export const save = async (session: HubSession): Promise<void> => {
      const serialized: Serialized = {
        hubUrl: session.hubUrl,
        hubId: session.hubId,
        clientId: session.clientId,
        sharedKey: encode(session.sharedKey),
        token: session.token,
      }
      await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(serialized))
    }

    export const load = async (): Promise<HubSession | null> => {
      const raw = await SecureStore.getItemAsync(SESSION_KEY)
      if (!raw) return null
      try {
        const parsed: Serialized = JSON.parse(raw)
        return {
          hubUrl: parsed.hubUrl,
          hubId: parsed.hubId,
          clientId: parsed.clientId,
          sharedKey: decode(parsed.sharedKey),
          token: parsed.token,
        }
      } catch {
        return null
      }
    }

    export const clear = async (): Promise<void> => {
      await SecureStore.deleteItemAsync(SESSION_KEY)
    }

    export const getOrCreateClientId = async (): Promise<string> => {
      const existing = await SecureStore.getItemAsync(CLIENT_ID_KEY)
      if (existing) return existing
      const id = uuidv4()
      await SecureStore.setItemAsync(CLIENT_ID_KEY, id)
      return id
    }

    export const getTokenByPeerId = async (peerId: string): Promise<Result<string>> => {
      const session = await load()
      console.log("[getTokenByPeerId]: ", { session })
      if (!session) return err({ _tag: "NotFound", entity: "HubSession", id: peerId })
      if (session.hubId !== peerId)
        return err({
          _tag: "ValidationError",
          message: `Session peer ID mismatch: expected ${peerId}, got ${session.hubId}`,
        })
      if (!session.token) return err({ _tag: "NotFound", entity: "SessionToken", id: peerId })
      return ok(session.token)
    }
  }

  // ── URL resolution ───────────────────────────────────────────────────

  /** Extract the URL from a peer, preferring metadata.url, falling back to ipAddress:port. */
  export const getUrl = (peer: T): string | null => {
    const metadataUrl = peer.metadata?.url as string | undefined
    if (metadataUrl) return metadataUrl
    if (peer.ipAddress) {
      return peer.port ? `${peer.ipAddress}:${peer.port}` : peer.ipAddress
    }
    return null
  }

  /**
   * Resolve the active peer's URL. Drop-in replacement for the deprecated getHHApiUrl().
   * Uses the user-selected activeSyncPeerId if set, otherwise falls back to
   * the default peer priority (hub > cloud).
   */
  export const getActiveUrl = async (): Promise<string | null> => {
    const { appStateStore } = require("@/store/appState")
    const { activeSyncPeerId } = appStateStore.getSnapshot().context

    if (activeSyncPeerId) {
      try {
        const peer = await DB.getById(activeSyncPeerId)
        if (peer.status === "active" || peer.status === "untrusted") {
          const url = getUrl(peer)
          if (url) return url
        }
      } catch {
        // Peer no longer exists — fall through to default resolution
      }
    }

    const peer = await DB.resolveActive()
    return peer ? getUrl(peer) : null
  }

  /**
   * One-time migration: if there's a HIKMA_API value in SecureStore but no
   * cloud peer registered, create the cloud peer from the legacy URL.
   * Safe to call multiple times — no-ops if a cloud peer already exists.
   */
  export const migrateFromLegacyApiUrl = async (): Promise<void> => {
    const clouds = await DB.getActiveByType("cloud_server")
    if (clouds.length > 0) return

    const SecureStore = require("expo-secure-store")
    const legacyUrl = await SecureStore.getItemAsync("HIKMA_API")
    if (!legacyUrl) {
      // Check dev fallback
      const devUrl = process.env.EXPO_PUBLIC_HIKMA_API_TESTING
      if (__DEV__ && devUrl) {
        await DB.upsertCloud(devUrl)
      }
      return
    }

    await DB.upsertCloud(legacyUrl)
  }

  // ── Reachability ─────────────────────────────────────────────────────

  export const isCloudReachable = async (
    timeoutMs = 5000,
  ): Promise<{ reachable: boolean; url: string | null }> => {
    const clouds = await DB.getActiveByType("cloud_server")
    if (clouds.length === 0) return { reachable: false, url: null }

    const url = clouds[0].metadata?.url as string | undefined
    if (!url) return { reachable: false, url: null }

    const reachable = await checkUrl(url, timeoutMs)
    return { reachable, url }
  }

  /** Race all active cloud server URLs and resolve as soon as any one is reachable. */
  export const isAnyCloudReachable = async (
    timeoutMs = 5000,
  ): Promise<{ reachable: boolean; url: string | null }> => {
    const clouds = await DB.getActiveByType("cloud_server")
    const urls = clouds
      .map((c) => c.metadata?.url as string | undefined)
      .filter((u): u is string => !!u)

    if (urls.length === 0) return { reachable: false, url: null }

    // Race all URLs — first one that succeeds wins
    const result = await Promise.any(
      urls.map(async (url) => {
        const ok = await checkUrl(url, timeoutMs)
        if (!ok) throw new Error("unreachable")
        return url
      }),
    ).catch(() => null)

    return result ? { reachable: true, url: result } : { reachable: false, url: null }
  }

  /**
   * Calls the heartbeat api route
   * @param {string} peerUrl
   * @returns {Promise<boolean>}
   */
  export const heartbeat = async (peerUrl: string): Promise<boolean> => {
    try {
      const response = await fetch(`${peerUrl}/rpc/heartbeat`, { method: "GET" })
      return response.ok
    } catch {
      return false
    }
  }

  // ── Hub lifecycle ─────────────────────────────────────────────────────

  export namespace Hub {
    let rehandshaking: Promise<HubSession | null> | null = null

    export const pair = async (hubUrl: string): Promise<RpcResult<HubSession>> => {
      const clientId = await Session.getOrCreateClientId()
      const result = await performHandshake(hubUrl, clientId)
      if (!result.ok) return result

      const session = result.data
      await Session.save(session)

      const hubName =
        session.hubName && session.hubName.length > 0 ? session.hubName : `Hub ${session.hubId}`
      await DB.upsertHub({
        hubId: session.hubId,
        name: hubName,
        publicKey: encode(session.sharedKey),
        url: hubUrl,
      })
      return result
    }

    export const resume = async (): Promise<HubSession | null> => Session.load()

    export const getTransport = async (): Promise<RpcTransport | null> => {
      const session = await Session.load()
      if (!session) return null

      // Always re-handshake to ensure the hub has a valid session.
      // Hub sessions are in-memory and lost on restart; heartbeat only
      // proves the server is up, not that our session exists.
      // Re-handshake is lightweight (one HTTP round-trip).
      if (rehandshaking) {
        const refreshed = await rehandshaking
        return refreshed ? createEncryptedTransport(refreshed) : null
      }

      rehandshaking = (async () => {
        try {
          const clientId = await Session.getOrCreateClientId()
          const result = await performHandshake(session.hubUrl, clientId)
          if (!result.ok) return null
          const newSession: HubSession = { ...result.data, token: session.token }
          await Session.save(newSession)
          return newSession
        } finally {
          rehandshaking = null
        }
      })()

      const refreshed = await rehandshaking
      return refreshed ? createEncryptedTransport(refreshed) : null
    }

    export const unpair = async (): Promise<void> => {
      const session = await Session.load()
      if (session) await DB.revoke(session.hubId)
      await Session.clear()
    }

    export const isPaired = async (): Promise<boolean> => {
      const session = await Session.load()
      return session !== null
    }
  }
}

export default Peer
