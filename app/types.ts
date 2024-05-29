import RegistrationFormModel, { RegistrationFormField } from "./db/model/PatientRegistrationForm"

export type DefaultLanguages = {
  en: string
  ar?: string
  es?: string
}

export type TranslationObject = DefaultLanguages & {
  [lang: string]: string
}

export type LanguageKey = "en" | "ar" | "es" | string

export type MedicineRoute =
  | "oral"
  | "sublingual"
  | "rectal"
  | "topical"
  | "inhalation"
  | "intravenous"
  | "intramuscular"
  | "intradermal"
  | "subcutaneous"
  | "nasal"
  | "ophthalmic"
  | "otic"
  | "vaginal"
  | "transdermal"
  | "other"

export const medicineRouteOptions: MedicineRoute[] = [
  "oral",
  "sublingual",
  "rectal",
  "topical",
  "inhalation",
  "intravenous",
  "intramuscular",
  "intradermal",
  "subcutaneous",
  "nasal",
  "ophthalmic",
  "otic",
  "vaginal",
  "transdermal",
  "other",
]

export type MedicineForm =
  | "tablet"
  | "syrup"
  | "ampule"
  | "suppository"
  | "cream"
  | "drops"
  | "bottle"
  | "spray"
  | "gel"
  | "lotion"
  | "inhaler"
  | "capsule"
  | "injection"
  | "patch"
  | "other"
export const medicineFormOptions: MedicineForm[] = [
  "tablet",
  "syrup",
  "ampule",
  "suppository",
  "cream",
  "drops",
  "bottle",
  "spray",
  "gel",
  "lotion",
  "inhaler",
  "capsule",
  "injection",
  "patch",
  "other",
]
export type DurationUnit = "hours" | "days" | "weeks" | "months" | "years"
export const durationUnitOptions: DurationUnit[] = ["hours", "days", "weeks", "months", "years"]
export type DoseUnit = "mg" | "g" | "mcg" | "mL" | "L" | "units"
export const doseUnitOptions: DoseUnit[] = ["mg", "g", "mcg", "mL", "L", "units"]

export type MedicationEntry = {
  id: string
  name: string
  route: MedicineRoute
  form: MedicineForm
  frequency: number
  intervals: number
  dose: number
  doseUnits: DoseUnit
  duration: number
  durationUnits: DurationUnit
}

export type ICDEntry = {
  code: string
  desc: string
  desc_ar: string
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

export type PatientValueColumn = "date_value" | "string_value" | "boolean_value" | "number_value"
