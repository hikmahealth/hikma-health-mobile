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

  @text("patient_id") patientId!: string
  @text("visit_id") visitId!: string
  @text("event_type") eventType!: string
  @json("event_metadata", sanitizeMetadata) eventMetadata!: Object
  @field("is_deleted") isDeleted!: boolean
  @date("deleted_at") deletedAt!: Date
  @readonly @date("created_at") createdAt!: Date
  @readonly @date("updated_at") updatedAt!: Date
}


// The sanitizer might also receive null if the column is nullable, or undefined if the field doesn't contain valid JSON.
/**
Sanitize the raw data returned by a `JSON.parse()` operation over the stored "string" type

@param {null | undefined | object} data: null if the field is nullable, undefined if the JSON is invalid or the data object stored in its place
*/
function sanitizeMetadata(data: any) {
  if (data) {
    return data
  } else {
    return {}
  }
}
