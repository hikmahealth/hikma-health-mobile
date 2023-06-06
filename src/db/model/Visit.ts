import { Model } from "@nozbe/watermelondb"
import { Associations } from "@nozbe/watermelondb/Model"
import {
  field,
  text,
  immutableRelation,
  date,
  readonly,
  relation,
  writer,
  children,
  json,
} from "@nozbe/watermelondb/decorators"

// 'CREATE TABLE IF NOT EXISTS events (id varchar(32) PRIMARY KEY, patient_id varchar(32) REFERENCES patients(id) ON DELETE CASCADE, visit_id varchar(32) REFERENCES visits(id) ON DELETE CASCADE, event_type text, event_timestamp text, edited_at text, event_metadata text, deleted integer DEFAULT 0);',

export default class VisitModel extends Model {
  static table = "visits"

  static associations: Associations = {
    patients: { type: "belongs_to", key: "patient_id" },
    events: { type: "has_many", foreignKey: "visit_id" },
  }

  @relation("patients", "patient_id") patient
  @children("events") events
  // @relation("events", 'visitId') event

  @text("patient_id") patientId
  @text("clinic_id") clinicId
  @text("provider_id") providerId
  @text("provider_name") providerName
  @date("check_in_timestamp") checkInTimestamp
  @field("is_deleted") isDeleted
  @date("deleted_at") deletedAt
  @json("metadata", sanitizeMetadata) metadata
  @readonly @date("created_at") createdAt
  @readonly @date("updated_at") updatedAt
}

function sanitizeMetadata(data) {
  if (data) {
    return JSON.stringify(data)
  }
  return JSON.stringify({})
}
