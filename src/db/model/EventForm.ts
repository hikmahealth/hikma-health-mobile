import { Model } from "@nozbe/watermelondb"
import {
  field,
  text,
  json,
  date,
  readonly,
  writer,
} from "@nozbe/watermelondb/decorators"


type EventFormMetadata = {
  // event_metadata?: any
  id: string,
  name: string
  fieldType: string
  inputType: string | "text" | "number" | "radio" | "checkbox" | "date" | "select" | "diagnosis" | "dropdown" | "medicine" | "input-group"
  options?: any[]
}[]

export default class EventFormModel extends Model {
  static table = "event_forms"

  @text("name") name!: string;
  @text("description") description!: string;
  @text("language") language!: string
  @field("is_editable") isEditable!: boolean
  @field("is_snapshopt_form") isSnapshotForm!: boolean
  @json("metadata", sanitizeMetadata) metadata!: EventFormMetadata
  @field("is_deleted") isDeleted!: boolean
  @date("deleted_at") deletedAt?: number | Date
  @readonly @date("created_at") createdAt!: number | Date
  @readonly @date("updated_at") updatedAt!: number | Date
}


/**
Sanitize EventForm metadata which is an array of field inputs that need to be rendered in the user interface

@param {null | undefined | object | EventFormMetadata} data
@returns {any[]} result: fields of the form
*/
function sanitizeMetadata(data: any) {
  return Array.isArray(data) ? data : []
}
