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

  export type FieldItem = {
    id: string
    name: string
    fieldType: string
    inputType: InputType
    multi: Option.Option<boolean>
    options: Option.Option<any[]>
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
    createdAt: dbEventForm.createdAt,
    updatedAt: dbEventForm.updatedAt,
  })

  export namespace DB {
    export type T = EventFormModel

    /**
     * Subscription to an event form record in the database
     * @param {language: Language.LanguageName} The event form language
     * @param {(forms: Option.Option<EventForm.DB.T[]>, isLoading: boolean) => void} callback Function called when event form data updates
     * @returns {{unsubscribe: () => void}} Object containing unsubscribe function
     */
    export function subscribe(
      language: Option.Option<Language.LanguageName>,
      callback: (forms: Option.Option<EventForm.DB.T[]>, isLoading: boolean) => void,
    ): { unsubscribe: () => void } {
      let isLoading = true
      const queries = [Q.where("is_deleted", Q.notEq(true)), Q.sortBy("name", Q.asc)]

      const lng = Option.match(language, {
        onNone: () => "en",
        onSome: (lng) => {
          if (lng === "en-US") {
            return "en"
          } else if (typeof lng === "string") {
            return lng
          }
          return ""
        },
      })

      const subscription = database.collections
        .get<EventForm.DB.T>("event_forms")
        .query(
          // Get only the forms in my language
          [Q.where("language", lng), ...queries],
        )
        .observe()
        .subscribe((dbForms) => {
          const forms = dbForms
          callback(Option.fromNullable(forms), isLoading)
          isLoading = false
        })

      return {
        unsubscribe: () => subscription.unsubscribe(),
      }
    }
  }
}

export default EventForm
