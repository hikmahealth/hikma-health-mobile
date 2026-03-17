import { MigrationSyncChanges } from "@nozbe/watermelondb/Schema/migrations/getSyncChanges"
import {
  SyncDatabaseChangeSet,
  SyncPullResult,
  SyncPushResult,
  Timestamp,
} from "@nozbe/watermelondb/sync"
import { Exit, Match, Option, pipe } from "effect"
import { result } from "es-toolkit/compat"

import { storage } from "@/utils/storage"
import Peer from "@/models/Peer"

namespace Sync {
  export type StateT = "idle" | "fetching" | "resolving" | "pushing" | "error"

  export const State: { [key in Uppercase<StateT>]: StateT } = {
    IDLE: "idle",
    FETCHING: "fetching",
    RESOLVING: "resolving",
    PUSHING: "pushing",
    ERROR: "error",
  }

  export type ServerType = "local" | "cloud"

  export const ServerType: { [key in Uppercase<ServerType>]: ServerType } = {
    LOCAL: "local",
    CLOUD: "cloud",
  }

  export namespace Server {
    export type Key = `${ServerType}-sync-server`
    export type T = {
      id: string
      name: ServerType
      type: ServerType
      url: string
      isActive: boolean
    }
    /**
     * Get the last pull timestamp from storage
     * @deprecated - prefer the use of the peers table
     * @param serverType The type of server to get the last pull timestamp for
     * @returns {number} The last pull timestamp
     */
    export function getLastPullTimestamp(serverType: ServerType): number {
      return pipe(
        Option.fromNullable(storage.getNumber(`${serverType}LastPullTimestamp`)),
        Option.getOrElse(() => 0),
      )
    }

    /**
     * Set the last pull timestamp in storage
     * @deprecated - prefer the use of the peers table
     * @param serverType The type of server to set the last pull timestamp for
     * @param timestamp The timestamp to set
     * @returns {Promise<void>} A promise that resolves when the last pull timestamp is set
     */
    export function setLastPullTimestamp(serverType: ServerType, timestamp: number): Promise<void> {
      try {
        storage.set(`${serverType}LastPullTimestamp`, timestamp)
        return Promise.resolve()
      } catch (error) {
        console.error("Failed to set last pull timestamp", error)
        return Promise.reject(error)
      }
    }

    /** Get all the sync Servers
     * @deprecated - prefer the use of the peers table
     */
    export function getAll(): Promise<Record<Key, T>> {
      const result: Record<Key, T> = {}
      const local = storage.getString("local-sync-server")
      const cloud = storage.getString("cloud-sync-server")
      if (local) {
        try {
          result["local-sync-server"] = JSON.parse(local)
        } catch (error) {
          console.error("Failed to parse local sync server", error)
        }
      }
      if (cloud) {
        try {
          result["cloud-sync-server"] = JSON.parse(cloud)
        } catch (error) {
          console.error("Failed to parse cloud sync server", error)
        }
      }
      return Promise.resolve(result)
    }
    /** Get a specific sync Server by id
     * @deprecated - prefer the use of the peers table
     */
    export function getById(id: Key): Promise<Option.Option<T>> {
      return getAll().then((servers) => Option.fromNullable(servers[id]))
    }

    /**
     * Get a specific sync server by server type
     *  @deprecated - prefer the use of the peers table over the Sync set and get and remove methods
     * */
    export function getByType(type: ServerType): Promise<Option.Option<T>> {
      return getAll().then((servers) => Option.fromNullable(servers[`${type}-sync-server`]))
    }

    /**
     * Set a sync server by server type
     * @deprecated - prefer the use of the peers table over the Sync set and get and remove methods
     *
     * @param {ServerType} serverType The type of server to set
     * @param {T} server The sync server to set
     * @returns {Promise<void>} A promise that resolves when the sync server is set
     */
    export function set(serverType: ServerType, server: T): Promise<void> {
      try {
        storage.set(`${serverType}-sync-server`, JSON.stringify(server))
        return Promise.resolve()
      } catch (error) {
        console.error("Failed to set sync server", error)
        return Promise.reject(error)
      }
    }

    /**
     * Remove a sync server by server type
     * @deprecated - prefer the use of the peers table over the Sync set and get and remove methods
     *
     * @param {ServerType} serverType The type of server to remove
     * @returns {Promise<void>} A promise that resolves when the sync server is removed
     */
    export function remove(serverType: ServerType): Promise<void> {
      try {
        storage.delete(`${serverType}-sync-server`)
        return Promise.resolve()
      } catch (error) {
        console.error("Failed to remove sync server", error)
        return Promise.reject(error)
      }
    }

    /**
     * Get the currently active server for syncing
     * @returns {Promise<Option.Option<T>>} A promise that resolves to the currently active sync server
     */
    export function getActive(): Promise<Option.Option<T>> {
      return getAll().then((servers) => {
        for (const key in servers) {
          if (servers[key as Key].isActive) {
            return Option.some(servers[key as Key])
          }
        }
        return Option.none()
      })
    }

    /**
     * Set the currently active server for syncing
     * @param {ServerType} serverType The type of server to set as active
     * @returns {Promise<void>} A promise that resolves when the active server is set
     */
    export function setActive(serverType: ServerType): Promise<void> {
      return getAll().then((servers) => {
        const promises: Promise<void>[] = []

        for (const key in servers) {
          const server = servers[key as Key]
          if (server.type === serverType) {
            promises.push(set(server.type, { ...server, isActive: true }))
          } else if (server.isActive) {
            promises.push(set(server.type, { ...server, isActive: false }))
          }
        }

        return Promise.all(promises).then(() => {})
      })
    }
  }

  /**
   * Given a SyncPullResult, return the changes and timestamp
   * @param {SyncPullResult} result
   * @returns {Option.Option<{changes: SyncDatabaseChangeSet, timestamp: Timestamp}>}
   */
  export function getChangesAndTimestamp(
    result: SyncPullResult,
  ): Option.Option<{ changes: SyncDatabaseChangeSet; timestamp: Timestamp }> {
    return Match.value(result).pipe(
      Match.when(
        (v) => "timestamp" in v && "changes" in v,
        ({ changes, timestamp }) => Option.some({ changes, timestamp }),
      ),
      Match.orElse(() => Option.none()),
    )
  }

  /**
   * Sync Pull data from the server
   * @param {number} lastPulledAt
   * @param {number} schemaVersion
   * @param {MigrationSyncChanges} migration
   * @param {Headers} headers
   * @returns {Promise<Exit<SyncPullResult, string>>}
   */
  export async function syncPull(
    lastPulledAt: number,
    schemaVersion: number,
    migration: MigrationSyncChanges,
    headers: Headers,
  ): Promise<Exit.Exit<SyncPullResult, string>> {
    const urlParams = `last_pulled_at=${lastPulledAt}&schema_version=${schemaVersion}&migration=${encodeURIComponent(
      JSON.stringify(migration),
    )}`

    const HH_API = await Peer.getActiveUrl()
    if (!HH_API) {
      throw new Error("HH API URL not found")
    }
    const SYNC_API = `${HH_API}/api/v2/sync`

    console.warn("SYNC_API:", SYNC_API)

    const result = await fetch(`${SYNC_API}?${urlParams}`, {
      // Headers include the username and password in base64 encoded string
      headers: headers,
    })

    if (!result.ok) {
      console.error("Error fetching data from the server", { result })
      return Exit.fail(await result.text())
    }

    const syncPullResult = (await result.json()) as SyncPullResult

    return Exit.succeed(syncPullResult)
  }

  /**
   * Sync Push data to the server
   * @param {number} lastPulledAt
   * @param {SyncDatabaseChangeSet} changes
   * @param {Headers} headers
   * @returns {Promise<Exit<SyncPushResult, string>>}
   */
  export async function syncPush(
    lastPulledAt: number,
    changes: SyncDatabaseChangeSet,
    headers: Headers,
  ): Promise<Exit.Exit<SyncPushResult, string>> {
    const HH_API = await Peer.getActiveUrl()
    if (!HH_API) {
      throw new Error("HH API URL not found")
    }
    const SYNC_API = `${HH_API}/api/v2/sync`
    const result = await fetch(`${SYNC_API}?last_pulled_at=${lastPulledAt}`, {
      method: "POST",
      headers: headers,
      body: JSON.stringify(changes),
    })

    if (!result.ok) {
      console.error("Error pushing data to the server", { result })
      return Exit.fail(await result.text())
    }

    const syncPushResult = (await result.json()) as SyncPushResult
    return Exit.succeed(syncPushResult)
  }
}

export default Sync
