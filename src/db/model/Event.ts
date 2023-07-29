import { Model } from "@nozbe/watermelondb"
import { Associations } from "@nozbe/watermelondb/Model"
import {
  field,
  text,
  date,
  readonly,
  json,
} from "@nozbe/watermelondb/decorators"

// 'CREATE TABLE IF NOT EXISTS events (id varchar(32) PRIMARY KEY, patient_id varchar(32) REFERENCES patients(id) ON DELETE CASCADE, visit_id varchar(32) REFERENCES visits(id) ON DELETE CASCADE, event_type text, event_timestamp text, edited_at text, event_metadata text, deleted integer DEFAULT 0);',

export default class EventModel extends Model {
  static table = "events"

  static associations: Associations = {
    patients: { type: "belongs_to", key: "patient_id" },
    visits: { type: "belongs_to", key: "visit_id" },
  }

  @text("patient_id") patientId: string
  @text("visit_id") visitId: string
  @text("event_type") eventType
  @json("event_metadata", sanitizeMetadata) eventMetadata: Object
  @field("is_deleted") isDeleted: boolean
  @date("deleted_at") deletedAt: Date
  @readonly @date("created_at") createdAt: Date
  @readonly @date("updated_at") updatedAt: Date
}


function sanitizeMetadata(data) {
  if (data) {
    return data
  } else {
    return {}
  }
  // if (data) {
  // return JSON.stringify(data)
  // }
  // return JSON.stringify({})
}
