import { Model } from "@nozbe/watermelondb"
import { field, text, date, readonly, json, relation } from "@nozbe/watermelondb/decorators"
import { Associations } from "@nozbe/watermelondb/Model"

import ClinicModel from "./Clinic"

export default class ClinicDepartmentModel extends Model {
  static table = "clinic_departments"

  static associations: Associations = {
    clinics: { type: "belongs_to", key: "clinic_id" },
  }

  // --- Basic Information ---
  @text("clinic_id") clinicId!: string
  @text("name") name!: string
  @text("code") code?: string // Short code like "CARDIO", "PEDS", "ER", "ICU", "OPD", "LAB"
  @text("description") description?: string
  @text("status") status!: string // active, inactive, maintenance

  // --- Core Capabilities ---
  @field("can_dispense_medications") canDispenseMedications!: boolean
  @field("can_perform_labs") canPerformLabs!: boolean
  @field("can_perform_imaging") canPerformImaging!: boolean

  // --- Future Flexibility ---
  // JSON array stored as string - contains additional capability flags
  @json("additional_capabilities", sanitizeAdditionalCapabilities) additionalCapabilities!: string[]

  // --- Metadata ---
  // JSON object stored as string - contains flexible department-specific data
  @json("metadata", sanitizeMetadata) metadata!: Record<string, any>

  // --- Audit and Soft-Delete ---
  @field("is_deleted") isDeleted!: boolean
  @date("deleted_at") deletedAt?: Date

  // --- Timestamps (Read-only) ---
  @readonly @date("created_at") createdAt!: Date
  @readonly @date("updated_at") updatedAt!: Date
  @readonly @date("last_modified") lastModified!: Date
  @readonly @date("server_created_at") serverCreatedAt!: Date

  // --- Relations ---
  @relation("clinics", "clinic_id") clinic!: ClinicModel
}

/**
 * Sanitize the raw data returned by a `JSON.parse()` operation over the stored "string" type
 * for additional_capabilities field
 *
 * @param {null | undefined | string[]} data: null if the field is nullable, undefined if the JSON is invalid or array of capability strings
 */
function sanitizeAdditionalCapabilities(data: any): string[] {
  if (Array.isArray(data)) {
    return data
  } else {
    return []
  }
}

/**
 * Sanitize the raw data returned by a `JSON.parse()` operation over the stored "string" type
 * for metadata field
 *
 * @param {null | undefined | object} data: null if the field is nullable, undefined if the JSON is invalid or the data object stored in its place
 */
function sanitizeMetadata(data: any): Record<string, any> {
  if (data && typeof data === "object" && !Array.isArray(data)) {
    return data
  } else {
    return {}
  }
}
