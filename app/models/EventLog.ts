// --- helpers/eventLogger.ts ---
import { Database, Q } from "@nozbe/watermelondb"
import { createHash } from "crypto" // or react-native-quick-crypto

import EventLog, { LogEventParams, EVENT_LOG_TABLE } from "@/db/model/EventLog"

function computeHash(data: {
  transactionId: string
  actionType: string
  tableName: string
  rowId: string
  changes: string
  deviceId: string
  appId: string
  userId: string
  ipAddress: string | null
  createdAt: number
}): string {
  const payload = [
    data.transactionId,
    data.actionType,
    data.tableName,
    data.rowId,
    data.changes,
    data.deviceId,
    data.appId,
    data.userId,
    data.ipAddress ?? "",
    data.createdAt.toString(),
  ].join("|")

  return createHash("sha256").update(payload).digest("hex")
}

/**
 * Get the device's current IP address.
 * Uses react-native-network-info or a similar lib.
 * Replace this with your actual implementation.
 */
async function getDeviceIpAddress(): Promise<string | null> {
  try {
    // Example using react-native-network-info:
    // import { NetworkInfo } from 'react-native-network-info';
    // return await NetworkInfo.getIPV4Address();
    return null // placeholder — wire up your IP provider
  } catch {
    return null
  }
}

/**
 * Log an audit event. Call from your data layer on any record mutation or access.
 */
export async function logEvent(database: Database, params: LogEventParams): Promise<void> {
  const changesStr = JSON.stringify(params.changes)
  const createdAt = Date.now()
  const ipAddress = params.ipAddress ?? (await getDeviceIpAddress())

  const hash = computeHash({
    transactionId: params.transactionId,
    actionType: params.actionType,
    tableName: params.tableName,
    rowId: params.rowId,
    changes: changesStr,
    deviceId: params.deviceId,
    appId: params.appId,
    userId: params.userId,
    ipAddress,
    createdAt,
  })

  await database.write(async () => {
    await database.get<EventLog>(EVENT_LOG_TABLE).create((log) => {
      log.transactionId = params.transactionId
      log.actionType = params.actionType
      log.tableName = params.tableName
      log.rowId = params.rowId
      log.changes = changesStr
      log.deviceId = params.deviceId
      log.appId = params.appId
      log.userId = params.userId
      log.ipAddress = ipAddress
      log.hash = hash
      log.metadata = params.metadata ? JSON.stringify(params.metadata) : null
      log.synced = false
      // log._raw.created_at = createdAt
    })
  })
}

/**
 * Log multiple events in a single batch write (same transaction_id).
 * Useful when a single user action touches multiple tables.
 */
export async function logEvents(database: Database, events: LogEventParams[]): Promise<void> {
  const ipAddress = await getDeviceIpAddress()
  const createdAt = Date.now()

  await database.write(async () => {
    for (const params of events) {
      const changesStr = JSON.stringify(params.changes)
      const ip = params.ipAddress ?? ipAddress

      const hash = computeHash({
        transactionId: params.transactionId,
        actionType: params.actionType,
        tableName: params.tableName,
        rowId: params.rowId,
        changes: changesStr,
        deviceId: params.deviceId,
        appId: params.appId,
        userId: params.userId,
        ipAddress: ip,
        createdAt,
      })

      await database.get<EventLog>(EVENT_LOG_TABLE).create((log) => {
        log.transactionId = params.transactionId
        log.actionType = params.actionType
        log.tableName = params.tableName
        log.rowId = params.rowId
        log.changes = changesStr
        log.deviceId = params.deviceId
        log.appId = params.appId
        log.userId = params.userId
        log.ipAddress = ip
        log.hash = hash
        log.metadata = params.metadata ? JSON.stringify(params.metadata) : null
        log.synced = false
        log._raw.created_at = createdAt
      })
    }
  })
}

/**
 * Fetch unsynced logs ordered by creation time.
 */
export async function getUnsyncedLogs(database: Database): Promise<EventLog[]> {
  return database
    .get<EventLog>(EVENT_LOG_TABLE)
    .query(Q.where("synced", false), Q.sortBy("created_at", Q.asc))
    .fetch()
}

/**
 * Mark logs as synced after backend confirmation.
 */
export async function markAsSynced(database: Database, ids: string[]): Promise<void> {
  await database.write(async () => {
    const logs = await database
      .get<EventLog>(EVENT_LOG_TABLE)
      .query(Q.where("id", Q.oneOf(ids)))
      .fetch()

    for (const log of logs) {
      await log.update((l) => {
        l.synced = true
      })
    }
  })
}

/**
 * Purge synced logs older than the given threshold.
 * Call periodically to free device storage.
 */
export async function purgeSyncedLogs(database: Database, olderThanMs: number): Promise<number> {
  let count = 0

  await database.write(async () => {
    const logs = await database
      .get<EventLog>(EVENT_LOG_TABLE)
      .query(Q.where("synced", true), Q.where("created_at", Q.lt(olderThanMs)))
      .fetch()

    count = logs.length

    for (const log of logs) {
      await log.destroyPermanently()
    }
  })

  return count
}
