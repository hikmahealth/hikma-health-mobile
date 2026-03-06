import { Model } from "@nozbe/watermelondb"
import { field, readonly, text, date } from "@nozbe/watermelondb/decorators"

export const EVENT_LOG_TABLE = "event_logs" as const

export type ActionType =
  | "CREATE"
  | "UPDATE"
  | "SOFT_DELETE"
  | "PERMANENT_DELETE"
  | "VIEW"
  | "EXPORT"

export default class EventLog extends Model {
  static table = "event_logs"

  @text("transaction_id") transactionId!: string
  @text("action_type") actionType!: ActionType
  @text("table_name") tableName!: string
  @text("row_id") rowId!: string
  @text("changes") changes!: string
  @text("device_id") deviceId!: string
  @text("app_id") appId!: string
  @text("user_id") userId!: string
  @text("ip_address") ipAddress!: string | null
  @text("hash") hash!: string
  @text("metadata") metadata!: string | null
  @field("synced") synced!: boolean
  @readonly @date("created_at") createdAt!: Date

  // Append-only: never call .update() or .destroyPermanently()
  // except for synced flag and purge operations
}

export type CreateChanges = {
  row_id: string
}

export type UpdateChanges = {
  [fieldName: string]: {
    old: string | number | boolean | null
    new: string | number | boolean | null
  }
}

export type SoftDeleteChanges = {
  row_id: string
  deleted_at: string
}

export type PermanentDeleteChanges = {
  row_id: string
}

export type ViewChanges = {
  row_id: string
}

export type ExportChanges = {
  row_ids: string[]
  format?: string
}

export type ChangesPayload =
  | CreateChanges
  | UpdateChanges
  | SoftDeleteChanges
  | PermanentDeleteChanges
  | ViewChanges
  | ExportChanges

export type LogEventParams = {
  transactionId: string
  actionType: ActionType
  tableName: string
  rowId: string
  changes: ChangesPayload
  deviceId: string
  appId: string
  userId: string
  ipAddress?: string | null
  metadata?: Record<string, unknown> | null
}
