
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
