import { Model } from "@nozbe/watermelondb"
import { field, date, relation, readonly, text } from "@nozbe/watermelondb/decorators"

import Clinic from "./Clinic"
import User from "./User"

/**
 * UserClinicPermission Model
 *
 * This model represents the permissions a specific user has for a specific clinic.
 * It effectively acts as a join table between Users and Clinics, with additional
 * permission flags.
 *
 * TODO: Extensive testing, documentation, enforcement at the database / API level.
 */
export default class UserClinicPermission extends Model {
  // The name of the table in the database schema
  static table = "user_clinic_permissions"

  // Defines the relationships to other models. This helps WatermelonDB optimize queries.
  static associations = {
    users: { type: "belongs_to" as const, key: "user_id" },
    clinics: { type: "belongs_to" as const, key: "clinic_id" },
    // Note: The 'created_by' and 'last_modified_by' fields also relate to the User model.
    // We can define multiple relations to the same table.
    created_by_user: { type: "belongs_to" as const, key: "created_by" },
    last_modified_by_user: { type: "belongs_to" as const, key: "last_modified_by" },
  }

  @text("user_id") userId!: string
  @text("clinic_id") clinicId!: string
  @text("created_by") createdBy!: string
  @text("last_modified_by") lastModifiedBy!: string

  // --- Permission Flags ---
  @field("can_register_patients") canRegisterPatients!: boolean
  @field("can_view_history") canViewHistory!: boolean
  @field("can_edit_records") canEditRecords!: boolean
  @field("can_delete_records") canDeleteRecords!: boolean
  @field("is_clinic_admin") isClinicAdmin!: boolean

  // --- Relations ---
  // The user who has these permissions
  @relation("users", "user_id") user!: User
  // The clinic to which these permissions apply
  @relation("clinics", "clinic_id") clinic!: Clinic
  // The user who created this permission record (optional)
  @relation("users", "created_by") createdByUser?: User
  // The user who last modified this permission record (optional)
  @relation("users", "last_modified_by") lastModifiedByUser?: User

  // --- Timestamps (Read-only) ---
  @readonly @date("created_at") createdAt!: Date
  @readonly @date("updated_at") updatedAt!: Date
}
