import { Model } from "@nozbe/watermelondb"
import { date, readonly, field, text, json } from "@nozbe/watermelondb/decorators"

export default class PatientAdditionalAttribute extends Model {
  static table = "patient_additional_attributes"

  @text("patient_id") patientId!: string

  @text("attribute_id") attributeId!: string
  @text("attribute") attribute!: string

  @field("number_value") numberValue!: number
  @text("string_value") stringValue!: string
  @date("date_value") dateValue!: number
  @field("boolean_value") booleanValue!: boolean

  @json("metadata", sanitizeMetadata) metadata!: Object
  @field("is_deleted") isDeleted!: boolean
  @date("deleted_at") deletedAt!: Date
  @readonly @date("created_at") createdAt!: Date
  @readonly @date("updated_at") updatedAt!: Date
}

// The sanitizer might also receive null if the column is nullable, or undefined if
// the field doesn't contain valid JSON.
/**
Sanitize the raw data returned by a `JSON.parse()` operation over the stored "string" 
type

@param {null | undefined | object} data: null if the field is nullable, undefined if the JSON is invalid or the data object stored in its place
*/
function sanitizeMetadata(data: any) {
  if (data) {
    return data
  } else {
    return {}
  }
}
