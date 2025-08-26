import { Model } from "@nozbe/watermelondb"
import { text, date, readonly } from "@nozbe/watermelondb/decorators"

// import User from "./User" // Assuming you have a User model

/**
 * AppConfig Model
 *
 * NOTE: This is a one way sync - only comes from the server but any changes pushed to the server will be ignored.
 *
 * This model stores key-value configuration settings for the application.
 * It's a flexible way to manage settings that might need to be synced
 * from the server or modified by an administrator.
 */
export default class AppConfig extends Model {
  // The name of the table in the database schema
  static table = "app_config"

  // --- Configuration Fields ---
  // A namespace to group related keys (e.g., 'ui', 'sync', 'feature_flags')
  @text("namespace") namespace!: string
  @text("key") key!: string
  @text("value") value!: string
  // 'string' | 'number' | 'boolean' | 'json'
  @text("data_type") dataType!: string

  // An optional user-friendly name for the setting
  @text("display_name") displayName?: string

  // The user who last modified this configuration entry (optional)
  // @relation("users", "last_modified_by") lastModifiedBy?: User

  // --- Timestamps (Read-only) ---
  @readonly @date("created_at") createdAt!: Date
  @readonly @date("updated_at") updatedAt!: Date
  @readonly @date("last_modified") lastModified!: Date
}
