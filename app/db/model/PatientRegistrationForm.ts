import { Model } from "@nozbe/watermelondb"
import { field, text, date, readonly, json } from "@nozbe/watermelondb/decorators"

type Metadata = {
  // Add types for any metadata that gets attached to the visit
}
const inputTypes = ["number", "text", "select", "date", "boolean"] as const

type DefaultLanguages = {
  en: string
  ar?: string
  es?: string
}

type TranslationObject = DefaultLanguages & {
  [lang: string]: string
}

export type RegistrationFormField = {
  id: string
  position: number
  // column name in the database
  column: string
  label: TranslationObject
  fieldType: (typeof inputTypes)[number]
  options: TranslationObject[]
  required: boolean
  baseField: boolean // whether or not this is part of the base inputs required of all registration forms
  visible: boolean // Whether or not it displays in the app
  isSearchField: boolean // Whether or not this field can be sea
  deleted: boolean
}

export default class RegistrationFormModel extends Model {
  static table = "registration_forms"

  @text("name") name!: string
  @json("fields", sanitizeFields) fields!: RegistrationFormField[]

  @json("metadata", sanitizeMetadata) metadata!: Metadata
  @field("is_deleted") isDeleted!: boolean
  @date("deleted_at") deletedAt!: Date
  @readonly @date("created_at") createdAt!: number | Date
  @readonly @date("updated_at") updatedAt!: number | Date
}

function sanitizeMetadata(data: any) {
  if (data) {
    return data
  }
  return {}
}

function sanitizeFields(data: any) {
  if (Array.isArray(data)) {
    return data
  }
  return []
}
