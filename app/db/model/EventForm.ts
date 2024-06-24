import { Model } from "@nozbe/watermelondb"
import { field, text, json, date, readonly, writer } from "@nozbe/watermelondb/decorators"

type EventFieldItem = {
  // event_metadata?: any
  id: string
  name: string
  fieldType: string
  inputType:
    | string
    | "text"
    | "number"
    | "radio"
    | "checkbox"
    | "date"
    | "select"
    | "diagnosis"
    | "dropdown"
    | "medicine"
    | "input-group"
  multi?: boolean
  options?: any[]
}

export default class EventFormModel extends Model {
  static table = "event_forms"

  @text("name") name!: string
  @text("description") description!: string
  @text("language") language!: string
  @field("is_editable") isEditable!: boolean
  @field("is_snapshot_form") isSnapshotForm!: boolean
  @json("form_fields", sanitizeFormFields) formFields!: EventFieldItem[]
  @json("metadata", sanitizeMetadata) metadata!: Record<string, any>
  @field("is_deleted") isDeleted!: boolean
  @date("deleted_at") deletedAt?: number | Date
  @readonly @date("created_at") createdAt!: number | Date
  @readonly @date("updated_at") updatedAt!: number | Date
}

/**
 * Sanitize EventForm form_fields
 */
function sanitizeFormFields(data: any) {
  return Array.isArray(data) ? data : []
}

/**
Sanitize EventForm metadata

@param {null | undefined | object | EventFormMetadata} data
@returns {Object} result
*/
function sanitizeMetadata(data: any) {
  if (data === null || data === undefined) {
    return {}
  }
  if (typeof data === "object") {
    return data
  }
  try {
    return JSON.parse(data)
  } catch (error) {
    return {}
  }
}
