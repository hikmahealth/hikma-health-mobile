import { Option } from "effect"

import PatientModel from "@/db/model/Patient"
import RegistrationFormModel from "@/db/model/PatientRegistrationForm"

import Language from "./Language"

namespace PatientRegistrationForm {
  export const inputTypes = ["number", "text", "select", "date", "boolean", "checkbox"] as const

  /**
   * A list of all the base columns that are required for a patient to be registered
   * in the system. These are the fields that are required for all registration forms
   * to be valid.
   */
  export type BaseColumn =
    | "given_name"
    | "surname"
    | "date_of_birth"
    | "sex"
    | "phone"
    | "citizenship"
    | "camp"
    | "government_id"
    | "external_patient_id"
    | "primary_clinic_id"
  export const baseColumns: BaseColumn[] = [
    "given_name",
    "surname",
    "date_of_birth",
    "sex",
    "phone",
    "citizenship",
    "camp",
    "government_id",
    "external_patient_id",
    "primary_clinic_id",
  ]

  export const InputType = {
    NUMBER: "number",
    TEXT: "text",
    SELECT: "select",
    DATE: "date",
    BOOLEAN: "boolean",
    CHECKBOX: "checkbox",
  }
  export type InputType = (typeof InputType)[keyof typeof InputType]

  export const inputTypeList: InputType[] = [
    InputType.NUMBER,
    InputType.TEXT,
    InputType.SELECT,
    InputType.DATE,
    InputType.BOOLEAN,
    InputType.CHECKBOX,
  ]
  export type FormField = {
    id: string
    position: number
    // column name in the database
    column: string
    label: Language.TranslationObject
    fieldType: InputType
    options: Language.TranslationObject[]
    required: boolean
    baseField: boolean // whether or not this is part of the base inputs required of all registration forms
    visible: boolean // Whether or not it displays in the app
    isSearchField: boolean // Whether or not this field can be sea
    deleted: boolean
  }
  export type T = {
    id: string
    name: string
    fields: FormField[]
    metadata: Record<string, any>
    isDeleted: boolean
    deletedAt: Option.Option<Date>
    createdAt: Date
    updatedAt: Date
  }

  export type RegistrationFormField = {
    id: string
    position: number
    // column name in the database
    column: BaseColumn
    label: Language.TranslationObject
    fieldType: (typeof inputTypes)[number]
    options: Language.TranslationObject[]
    required: boolean

    /** A flag indicating whether or not a field is a "base field" - i.e. one that is required for all patients */
    baseField: boolean

    /** Can be set by the administrator: determines whether or not the field is displayed during patient registration */
    visible: boolean

    /** Whether or not a field is marked as deleted - this is a soft-delete */
    deleted: boolean

    /** Whether or not this field renders in the "advanced search" sections during patient search */
    isSearchField: boolean
  }

  export type RegistrationForm = {
    id: string
    name: string
    fields: RegistrationFormField[]
    metadata: Record<string, any>
    createdAt: Date
    updatedAt: Date
  }

  /**
  Derived from the Patient Model

  */
  export type BaseFields = {
    id: string
    givenName: string
    surname: string
    dateOfBirth: Date
    citizenship: string
    hometown: string
    phone: string
    sex: string
    camp: string
    photoUrl: string
    governmentId: string
    externalPatientId: string
  }

  // sometimes typescript is so confusing
  // FormState holds an object where the keys are the field, and the values are the form entries by the users
  export type FormState = BaseFields &
    Record<keyof PatientModel, any> &
    Record<BaseColumn, any> & {
      [key: string]: any
    }

  export const empty: T = {
    id: "",
    name: "",
    fields: [],
    metadata: {},
    isDeleted: false,
    deletedAt: Option.none(),
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  /**
  PatientRecord type containing both the registration form, and the values
  from the database.

  The data field is an object mapping field ids to their values stored in the database.
  */
  export type PatientRecord = {
    fields: RegistrationFormModel["fields"]
    values: Record<RegistrationFormField["id"], number | Date | string | boolean>
  }
  // ---------------------------------------------------------------------------
  // Required-field validation
  // ---------------------------------------------------------------------------

  /** Context needed to validate required fields before submission */
  export type RequiredFieldContext = {
    fields: RegistrationFormField[]
    values: Record<string, number | Date | string | boolean>
  }

  /**
   * Returns the **labels** (en fallback) of required, visible fields that are
   * missing a value.
   *
   * Pure function — no React or DB dependencies.
   *
   * Rules:
   * - Only visible, non-deleted, required fields are checked.
   * - `undefined`, `null`, and whitespace-only strings are treated as missing.
   * - `0`, `false`, and valid Dates are treated as present.
   */
  export function getMissingRequiredFields(ctx: RequiredFieldContext): string[] {
    return ctx.fields
      .filter((field) => field.required && field.visible && !field.deleted)
      .filter((field) => {
        const value = ctx.values[field.id]
        if (value === undefined || value === null) return true
        if (typeof value === "string" && value.trim() === "") return true
        return false
      })
      .map((field) => field.label.en || field.column)
  }
}

export default PatientRegistrationForm
