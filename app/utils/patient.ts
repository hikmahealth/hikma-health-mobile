import { PatientRecord, PatientValueColumn } from "app/types"
import Patient from "../db/model/Patient"
import RegistrationFormModel, { RegistrationFormField } from "app/db/model/PatientRegistrationForm"

/**
 * Display the patient name that would show in the avatar (usually in the case of no image)
 * @param {Patient} patient
 * @returns {string}
 */
export const displayNameAvatar = (patient: Patient): string => {
  const { givenName = " ", surname = " " } = patient
  return getInitials(`${givenName} ${surname}`)
}

/**
 * Given a patients name, return the initials
 * @param {string} name
 * @returns {string}
 */
export const getInitials = (name: string): string => {
  // split at the spaces and take the first letter of each word in the name, make it uppercase
  return name
    .split(" ")
    .map((word) => word[0]?.toUpperCase())
    .join("")
    .trim()
}

/**
 * Display the patient name that would show in the patient list
 * @param {Patient} patient
 * @returns {string}
 */
export const displayName = (patient: Patient): string => {
  const { givenName = " ", surname = " " } = patient
  return `${givenName} ${surname}`.trim()
}

/**
Given a PatientRecord, return the value of the field, or the default value
@param {PatientRecord} patientRecord
@param {string} fieldName
@param {T} fallback
*/
export function getPatientFieldByName<T>(
  patientRecord: PatientRecord,
  fieldName: string,
  fallback?: T,
): T | undefined {
  const { fields, values } = patientRecord
  // get the id of the field from the form
  const field = fields.find((field) => field.column === fieldName)
  if (!field) {
    return fallback || undefined
  }

  // get the value from the data field by the id
  return (values[field.id] as T) || fallback || undefined
}

/**
Given a PatientRecord, return the value of the field by its ID, or the default value
@param {PatientRecord} patientRecord
@param {string} fieldId
@param {T} fallback
*/
export function getPatientFieldById<T>(
  patientRecord: PatientRecord,
  fieldId: string,
  fallback?: T,
): T | undefined {
  const { values } = patientRecord
  if (!fieldId) {
    return fallback ?? undefined
  }

  // get the value from the data field by the id
  return (values[fieldId] as T) ?? fallback ?? undefined
}

/**
Given a the fields of a patient form, and the attributeID, return the 
column name of that field.

Returns the default of "string_value" column name, including if there are any errors.
@param {RegistrationFormField[]} fields
@param {string} attributeId
@returns {PatientValueColumn}
*/
export function getAdditionalFieldColumnName(
  fields: RegistrationFormField[],
  attributeId: string,
): PatientValueColumn {
  const attr = fields.find((f) => f.id === attributeId)

  if (!attr) {
    console.warn(
      "Attribute column name not found. Returning 'string_value' default. AttributeId: ",
      fields,
      attributeId,
    )
    return "string_value"
  }

  if (attr.fieldType === "number") {
    return "number_value"
  } else if (attr.fieldType === "select" || attr.fieldType === "text") {
    return "string_value"
  } else if (attr.fieldType === "date") {
    return "date_value"
  } else if (attr.fieldType === "boolean") {
    return "boolean_value"
  }

  // if all else fails, somehow
  return "string_value"
}

/**
Create the default patient record object given a patient registration form
@param {RegistrationFormModel} registrationForm
@returns {PatientRecord}
*/
export function getDefaultPatientRecord(registrationForm: RegistrationFormModel): PatientRecord {
  const values = registrationForm["fields"].reduce((prev, field) => {
    const key = field.id
    if (["text", "select"].includes(field.fieldType)) {
      prev[key] = ""
    } else if (field.fieldType === "number") {
      prev[key] = 0
    } else if (field.fieldType === "date") {
      prev[key] = new Date()
    } else if (field.fieldType === "boolean") {
      prev[key] = false
    }
    return prev
  }, {} as PatientRecord["values"])
  return {
    fields: registrationForm["fields"],
    values,
  }
}
