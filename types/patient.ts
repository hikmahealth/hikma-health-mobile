/**
 * Patient input/query types for the DataProvider.
 * These align with the existing Patient.T shape in app/models/Patient.ts
 * and the PatientRegistrationForm field patterns.
 */

import type { PaginationParams } from "./data"

/** A single dynamic form field value for patient registration */
export type PatientAdditionalAttributeInput = {
  id: string
  attributeId: string
  patientId: string
  attribute: string
  /** Serialized value — string for text/select, stringified for others */
  value: string | number | boolean | Date
  metadata?: Record<string, any>
}

/** Input for creating a new patient with additional attributes */
export type CreatePatientInput = {
  patient: {
    id?: string
    givenName: string
    surname: string
    dateOfBirth: string
    sex: string
    citizenship?: string
    phone?: string
    camp?: string
    hometown?: string
    photoUrl?: string
    governmentId?: string
    externalPatientId?: string
    additionalData?: Record<string, any>
    metadata?: Record<string, any>
  }
  additionalAttributes: PatientAdditionalAttributeInput[]
}

/** Input for updating an existing patient */
export type UpdatePatientInput = Partial<CreatePatientInput["patient"]> & {
  additionalAttributes?: PatientAdditionalAttributeInput[]
}

/** Query parameters for fetching patient lists */
export type GetPatientsParams = PaginationParams & {
  search?: string
  filters: any
  limit: number
  offset: number
}
