import { Model } from "@nozbe/watermelondb"
import { field, text, date, readonly, children, json } from "@nozbe/watermelondb/decorators"
import { Associations } from "@nozbe/watermelondb/Model"

import VisitModel from "./Visit"

export default class PatientModel extends Model {
  static table = "patients"

  static associations: Associations = {
    visits: { type: "has_many", foreignKey: "patient_id" },
    // TODO: add associations for vitals, events, and problems
  }

  // @text('id') id;
  @text("given_name") givenName!: string
  @text("surname") surname!: string
  @text("date_of_birth") dateOfBirth!: string
  @text("citizenship") citizenship!: string
  @text("hometown") hometown!: string
  @text("phone") phone!: string
  @text("sex") sex!: string
  @text("camp") camp!: string
  @text("photo_url") photoUrl!: string

  // V2 Added
  @text("government_id") governmentId!: string
  @text("external_patient_id") externalPatientId!: string
  // !V2 Added

  // V5 Added
  @text("primary_clinic_id") primaryClinicId!: string // optional and indexed
  @text("last_modified_by") lastModifiedBy!: string // optional <but make sure to set this whenever a record is updated>
  // !V5 Added

  /** Additional data stores all the extra dynamic fields that are stored on the database */
  @json("additional_data", sanitizeAdditionalData) additionalData!: Record<string, any>
  @json("metadata", sanitizeMetadata) metadata!: Record<string, any>

  @field("is_deleted") isDeleted!: boolean
  @date("deleted_at") deletedAt!: Date

  // --- Timestamps (Read-only) ---
  @readonly @date("created_at") createdAt!: Date
  @readonly @date("updated_at") updatedAt!: Date

  /** Lazily loaded patient visits list */
  @children("visits") visits!: VisitModel[]
}

function sanitizeMetadata(data: any) {
  if (data) {
    return data
  } else {
    return {}
  }
}
function sanitizeAdditionalData(data: any) {
  if (data) {
    return data
  } else {
    return {}
  }
}
