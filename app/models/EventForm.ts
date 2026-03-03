import { Q } from "@nozbe/watermelondb"
import { Option } from "effect"

import database from "@/db"
import EventFormModel from "@/db/model/EventForm"

import Language from "./Language"

namespace EventForm {
  export const InputType = {
    TEXT: "text",
    NUMBER: "number",
    RADIO: "radio",
    CHECKBOX: "checkbox",
    DATE: "date",
    SELECT: "select",
    DIAGNOSIS: "diagnosis",
    DROPDOWN: "dropdown",
    MEDICINE: "medicine",
    INPUT_GROUP: "input-group",
    FILE: "file",
  }
  export type InputType = (typeof InputType)[keyof typeof InputType]
  export const inputTypeList: InputType[] = [
    InputType.TEXT,
    InputType.NUMBER,
    InputType.RADIO,
    InputType.CHECKBOX,
    InputType.DATE,
    InputType.SELECT,
    InputType.DIAGNOSIS,
    InputType.DROPDOWN,
    InputType.MEDICINE,
    InputType.INPUT_GROUP,
    InputType.FILE,
  ]

  export const FORM_NAME_FIELD_ID = "__form_name__"
  export const FORM_DESCRIPTION_FIELD_ID = "__form_description__"

  /** Field types that are display-only and do not collect user input */
  export const DISPLAY_ONLY_FIELD_TYPES = ["text", "separator"] as const

  /** Returns true if a field is display-only (text or separator) and should not be included in form data */
  export function isDisplayOnly(field: { fieldType: string }): boolean {
    return (DISPLAY_ONLY_FIELD_TYPES as readonly string[]).includes(field.fieldType)
  }

  export type FieldTranslation = {
    fieldId: string
    name: Language.TranslationObject
    description: Language.TranslationObject
    options: Record<string, Language.TranslationObject>
    createdAt: string
    updatedAt: string
  }

  export type FieldItem = {
    id: string
    name: string
    description?: string
    fieldType: string
    inputType: InputType
    multi: Option.Option<boolean>
    options: Option.Option<any[]>
    // text field (read-only display)
    content?: string
    size?: "xxl" | "xl" | "lg" | "md" | "sm"
    required?: boolean
  }
  export type T = {
    id: string
    name: string
    description: string
    language: string
    isEditable: boolean
    isSnapshotForm: boolean
    formFields: FieldItem[]
    metadata: Record<string, any>
    isDeleted: boolean
    deletedAt: Option.Option<Date>
    clinicIds: string[]
    translations: FieldTranslation[]
    createdAt: Date
    updatedAt: Date
  }

  export const empty: T = {
    id: "",
    name: "",
    description: "",
    language: "",
    isEditable: false,
    isSnapshotForm: false,
    formFields: [],
    metadata: {},
    isDeleted: false,
    deletedAt: Option.none(),
    clinicIds: [],
    translations: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  /**
   * Helper that filters and returns only the set of forms that are snapshots
   * @param {EventForm.T[] | EventForm.DB.T[]} forms - The list of forms
   * @returns {T[]} result - The snapshot forms
   */
  export function filterSnapshots<T extends EventForm.T | EventForm.DB.T>(forms: T[]): T[] {
    return forms.filter((form) => form.isSnapshotForm)
  }

  /**
   * Converts from EventFormModel (aka DBEventForm) to EventForm.T
   * @param dbEventForm The EventFormModel to convert
   * @returns The converted EventForm.T
   */
  export const fromDB = (dbEventForm: DB.T): T => ({
    id: dbEventForm.id,
    name: dbEventForm.name,
    description: dbEventForm.description,
    language: dbEventForm.language,
    isEditable: dbEventForm.isEditable,
    isSnapshotForm: dbEventForm.isSnapshotForm,
    formFields: dbEventForm.formFields,
    metadata: dbEventForm.metadata,
    isDeleted: dbEventForm.isDeleted,
    deletedAt: Option.fromNullable(dbEventForm.deletedAt),
    clinicIds: dbEventForm.clinicIds,
    translations: dbEventForm.translations ?? [],
    createdAt: dbEventForm.createdAt,
    updatedAt: dbEventForm.updatedAt,
  })

  export namespace DB {
    export type T = EventFormModel

    /**
     * Subscription to an event form record in the database
     * @param language The event form language
     * @param callback Function called when event form data updates
     * @returns Object containing unsubscribe function
     */
    export function subscribe(
      language: Option.Option<Language.LanguageName>,
      callback: (forms: Option.Option<EventForm.DB.T[]>, isLoading: boolean) => void,
    ): { unsubscribe: () => void } {
      let isLoading = true
      const queries = [Q.where("is_deleted", Q.notEq(true)), Q.sortBy("name", Q.asc)]

      const languageQueries = Option.match(language, {
        onNone: () => [],
        onSome: (lng) => {
          const resolved = lng === "en-US" ? "en" : typeof lng === "string" ? lng : ""
          return [Q.where("language", resolved)]
        },
      })

      const subscription = database.collections
        .get<EventForm.DB.T>("event_forms")
        .query([...languageQueries, ...queries])
        .observe()
        .subscribe((dbForms) => {
          const forms = dbForms
          isLoading = false
          callback(Option.fromNullable(forms), isLoading)
        })

      return {
        unsubscribe: () => subscription.unsubscribe(),
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Required-field validation
  // ---------------------------------------------------------------------------

  /** Context needed to validate required fields before submission */
  export type RequiredFieldContext = {
    formFields: FieldItem[]
    data: Record<string, any>
    diagnoses: any[]
    medicines: any[]
    fileUploads: Record<string, { fileId?: string | null } | undefined>
  }

  /**
   * Returns the **names** of required fields that are missing a value.
   *
   * This is a pure function so it can be tested without any React or DB
   * dependencies.
   *
   * Rules:
   * - Display-only fields (text / separator) are skipped.
   * - Diagnosis fields check `diagnoses.length`.
   * - Medicine fields check `medicines.length`.
   * - File fields check `fileUploads[name]?.fileId`.
   * - Everything else checks `data[name]` — `undefined`, `null`, and
   *   empty / whitespace-only strings are all treated as missing.
   */
  export function getMissingRequiredFields(ctx: RequiredFieldContext): string[] {
    const { formFields, data, diagnoses, medicines, fileUploads } = ctx

    return formFields
      .filter((field) => field.required && !isDisplayOnly(field))
      .filter((field) => {
        // Diagnosis list managed outside react-hook-form
        if (field.fieldType === "diagnosis") return diagnoses.length === 0

        // Medicine list managed outside react-hook-form
        if (field.fieldType === "medicine") return medicines.length === 0

        // File uploads tracked in a separate state map
        if (field.inputType === "file") return !fileUploads[field.name]?.fileId

        // All other inputs: value lives in react-hook-form `data`
        const value = data[field.name]
        if (value === undefined || value === null) return true
        if (typeof value === "string" && value.trim() === "") return true

        return false
      })
      .map((field) => field.name)
  }
}

export default EventForm
