/**
 * Transforms a PatientRegistrationForm.PatientRecord (used by offline WatermelonDB path)
 * into a CreatePatientInput (used by the online DataProvider path).
 *
 * This bridges the form-based patient data to the provider mutation format.
 */

import { format } from "date-fns"
import Patient from "@/models/Patient"
import type PatientRegistrationForm from "@/models/PatientRegistrationForm"
import type { CreatePatientInput, UpdatePatientInput } from "../../../types/patient"
import { uuidv7 } from "uuidv7"

/**
 * Extract a base field value from the patient record by column name.
 * Re-uses Patient.getPatientFieldByName from the existing codebase.
 */
const field = <T>(record: PatientRegistrationForm.PatientRecord, col: string, fallback: T) =>
  Patient.getPatientFieldByName(record, col, fallback) ?? fallback

/** Convert a PatientRecord to CreatePatientInput for the online provider */
export function patientRecordToCreateInput(
  record: PatientRegistrationForm.PatientRecord,
  clinicId: string,
): CreatePatientInput {
  const dob = field(record, "date_of_birth", new Date())
  return {
    patient: {
      id: uuidv7(), // Add a default UUIDv7 - the server can choose to create its own but we init one anyways
      givenName: field(record, "given_name", ""),
      surname: field(record, "surname", ""),
      dateOfBirth: dob instanceof Date ? format(dob, "yyyy-MM-dd") : String(dob),
      sex: field(record, "sex", ""),
      phone: field(record, "phone", ""),
      citizenship: field(record, "citizenship", ""),
      photoUrl: field(record, "photo_url", ""),
      camp: field(record, "camp", ""),
      hometown: field(record, "hometown", ""),
      governmentId: field(record, "government_id", ""),
      externalPatientId: field(record, "external_patient_id", ""),
      additionalData: field(record, "additional_data", {}),
    },
    additionalAttributes: record.fields
      .filter((f) => !f.baseField)
      .map((f) => ({
        id: f.id,
        attributeId: f.id,
        patientId: "", // will be set by the server
        attribute: f.column,
        value: record.values[f.id] ?? "",
      })),
  }
}

/** Convert a PatientRecord to UpdatePatientInput for the online provider */
export function patientRecordToUpdateInput(
  record: PatientRegistrationForm.PatientRecord,
): UpdatePatientInput {
  const { patient, additionalAttributes } = patientRecordToCreateInput(record, "")
  return { ...patient, additionalAttributes }
}
