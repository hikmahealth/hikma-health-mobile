/**
 * Patient transformers: snake_case server ↔ camelCase domain model.
 */

import { Option } from "effect"
import Patient from "@/models/Patient"
import type {
  CreatePatientInput,
  UpdatePatientInput,
  PatientAdditionalAttributeInput,
} from "../../../types/patient"

/** Server-side patient shape (snake_case) */
export type ServerPatient = {
  id: string
  given_name: string
  surname: string
  date_of_birth: string
  citizenship: string
  hometown: string
  phone: string
  sex: string
  camp: string
  photo_url: string
  government_id: string
  external_patient_id: string
  additional_data: Record<string, any>
  metadata: Record<string, any>
  is_deleted: boolean
  deleted_at: string | null
  created_at: string
  updated_at: string
  primary_clinic_id?: string
  last_modified_by?: string
}

/** Server-side additional attribute shape */
export type ServerPatientAttribute = {
  id: string
  patient_id: string
  attribute_id: string
  attribute: string
  value: string | number | boolean | Date
  metadata: Record<string, any>
  is_deleted: boolean
  created_at: string
  updated_at: string
}

/** Payload sent to server for patient creation */
export type ServerCreatePatientDTO = {
  patient: Omit<ServerPatient, "deleted_at">
  additional_attributes: ServerPatientAttribute[]
}

/** Server patient → domain Patient.T */
export function patientFromServer(s: ServerPatient): Patient.T {
  return {
    id: s.id,
    givenName: s.given_name,
    surname: s.surname,
    dateOfBirth: s.date_of_birth,
    citizenship: s.citizenship,
    hometown: s.hometown,
    phone: s.phone,
    sex: s.sex,
    camp: s.camp,
    photoUrl: s.photo_url,
    governmentId: s.government_id,
    externalPatientId: s.external_patient_id,
    additionalData: s.additional_data ?? {},
    metadata: s.metadata ?? {},
    isDeleted: s.is_deleted,
    deletedAt: Option.fromNullable(s.deleted_at ? new Date(s.deleted_at) : null),
    createdAt: new Date(s.created_at),
    updatedAt: new Date(s.updated_at),
    primaryClinicId: s.primary_clinic_id,
    lastModifiedBy: s.last_modified_by,
  }
}

/** Domain Patient.T → server patient (for updates/reads). Inverse of patientFromServer. */
export function patientToServer(p: Patient.T): ServerPatient {
  return {
    id: p.id,
    given_name: p.givenName,
    surname: p.surname,
    date_of_birth: p.dateOfBirth,
    citizenship: p.citizenship,
    hometown: p.hometown,
    phone: p.phone,
    sex: p.sex,
    camp: p.camp,
    photo_url: p.photoUrl,
    government_id: p.governmentId,
    external_patient_id: p.externalPatientId,
    additional_data: p.additionalData,
    metadata: p.metadata,
    is_deleted: p.isDeleted,
    deleted_at: Option.getOrNull(p.deletedAt)?.toISOString() ?? null,
    created_at: p.createdAt.toISOString(),
    updated_at: p.updatedAt.toISOString(),
    primary_clinic_id: p.primaryClinicId,
    last_modified_by: p.lastModifiedBy,
  }
}

/** CreatePatientInput → server DTO for POST /api/patients */
export function createPatientToServer(input: CreatePatientInput): ServerCreatePatientDTO {
  const now = new Date().toISOString()
  if (__DEV__) {
    console.log(
      "[PatientTransformer] createPatientToServer — givenName:",
      input.patient.givenName,
      "surname:",
      input.patient.surname,
      "attrs:",
      input.additionalAttributes.length,
    )
  }
  const dto: ServerCreatePatientDTO = {
    patient: {
      id: input.patient.id ?? "",
      given_name: input.patient.givenName,
      surname: input.patient.surname,
      date_of_birth: input.patient.dateOfBirth,
      sex: input.patient.sex,
      citizenship: input.patient.citizenship ?? "",
      phone: input.patient.phone ?? "",
      camp: input.patient.camp ?? "",
      hometown: input.patient.hometown ?? "",
      photo_url: input.patient.photoUrl ?? "",
      government_id: input.patient.governmentId ?? "",
      external_patient_id: input.patient.externalPatientId ?? "",
      additional_data: input.patient.additionalData ?? {},
      metadata: input.patient.metadata ?? {},
      is_deleted: false,
      created_at: now,
      updated_at: now,
    },
    additional_attributes: input.additionalAttributes.map((attr) => ({
      id: attr.id,
      patient_id: attr.patientId,
      attribute_id: attr.attributeId,
      attribute: attr.attribute,
      value: attr.value,
      metadata: attr.metadata ?? {},
      is_deleted: false,
      created_at: now,
      updated_at: now,
    })),
  }
  if (__DEV__) {
    console.log("[PatientTransformer] server DTO body:", JSON.stringify(dto, null, 2))
  }
  return dto
}

// ─────────────────────────────────────────────────────────────────────────────
// tRPC-specific types and transformers (for patients.create / patients.update)
// ─────────────────────────────────────────────────────────────────────────────

/** tRPC additional attribute with typed value fields */
export type TRPCPatientAttributeInput = {
  attribute_id: string
  attribute: string
  number_value?: number | null
  string_value?: string | null
  date_value?: string | null
  boolean_value?: boolean | null
  metadata?: Record<string, any>
}

/** tRPC patients.create input (matches server's createPatientSchema) */
export type TRPCCreatePatientInput = {
  patient: {
    given_name?: string | null
    surname?: string | null
    date_of_birth?: string | null
    sex?: string | null
    citizenship?: string | null
    hometown?: string | null
    phone?: string | null
    camp?: string | null
    government_id?: string | null
    external_patient_id?: string | null
    additional_data?: Record<string, any>
    metadata?: Record<string, any>
    photo_url?: string | null
    primary_clinic_id?: string | null
  }
  additionalAttributes?: TRPCPatientAttributeInput[]
}

/** tRPC patients.update input (matches server's updatePatientSchema) */
export type TRPCUpdatePatientInput = {
  id: string
  fields: Partial<TRPCCreatePatientInput["patient"]>
}

/** Convert a single attribute to tRPC typed-value format */
function attributeToTRPC(attr: PatientAdditionalAttributeInput): TRPCPatientAttributeInput {
  const result: TRPCPatientAttributeInput = {
    attribute_id: attr.attributeId,
    attribute: attr.attribute,
    metadata: attr.metadata ?? {},
  }

  const v = attr.value
  if (typeof v === "number") {
    result.number_value = v
  } else if (typeof v === "boolean") {
    result.boolean_value = v
  } else if (v instanceof Date) {
    result.date_value = v.toISOString()
  } else {
    result.string_value = String(v ?? "")
  }

  return result
}

/** CreatePatientInput → tRPC patients.create input */
export function createPatientToTRPC(input: CreatePatientInput): TRPCCreatePatientInput {
  return {
    patient: {
      given_name: input.patient.givenName,
      surname: input.patient.surname,
      date_of_birth: input.patient.dateOfBirth,
      sex: input.patient.sex,
      citizenship: input.patient.citizenship ?? "",
      phone: input.patient.phone ?? "",
      camp: input.patient.camp ?? "",
      hometown: input.patient.hometown ?? "",
      photo_url: input.patient.photoUrl ?? "",
      government_id: input.patient.governmentId ?? "",
      external_patient_id: input.patient.externalPatientId ?? "",
      additional_data: input.patient.additionalData ?? {},
      metadata: input.patient.metadata ?? {},
    },
    additionalAttributes: input.additionalAttributes.map(attributeToTRPC),
  }
}

/** UpdatePatientInput → tRPC patients.update input */
export function updatePatientToTRPC(id: string, input: UpdatePatientInput): TRPCUpdatePatientInput {
  const fields: Record<string, any> = {}
  if (input.givenName !== undefined) fields.given_name = input.givenName
  if (input.surname !== undefined) fields.surname = input.surname
  if (input.dateOfBirth !== undefined) fields.date_of_birth = input.dateOfBirth
  if (input.sex !== undefined) fields.sex = input.sex
  if (input.citizenship !== undefined) fields.citizenship = input.citizenship
  if (input.phone !== undefined) fields.phone = input.phone
  if (input.camp !== undefined) fields.camp = input.camp
  if (input.hometown !== undefined) fields.hometown = input.hometown
  if (input.photoUrl !== undefined) fields.photo_url = input.photoUrl
  if (input.governmentId !== undefined) fields.government_id = input.governmentId
  if (input.externalPatientId !== undefined) fields.external_patient_id = input.externalPatientId
  if (input.additionalData !== undefined) fields.additional_data = input.additionalData
  if (input.metadata !== undefined) fields.metadata = input.metadata
  return { id, fields }
}

// ─────────────────────────────────────────────────────────────────────────────
// RPC register_patient transformers
// ─────────────────────────────────────────────────────────────────────────────

/** Convert a single attribute value to typed value fields for register_patient */
function typedAttributeValue(v: string | number | boolean | Date) {
  if (typeof v === "number") return { number_value: v }
  if (typeof v === "boolean") return { boolean_value: v }
  if (v instanceof Date) return { date_value: v.toISOString() }
  return { string_value: String(v ?? "") }
}

/** Build the additional_attributes array for register_patient */
function attributesToRegister(
  attrs: PatientAdditionalAttributeInput[],
  now: string,
) {
  return attrs.map((attr) => ({
    id: attr.id,
    patient_id: attr.patientId,
    attribute_id: attr.attributeId,
    attribute: attr.attribute,
    ...typedAttributeValue(attr.value),
    metadata: attr.metadata ?? {},
    is_deleted: false,
    created_at: now,
    updated_at: now,
    last_modified: now,
    server_created_at: now,
  }))
}

/** CreatePatientInput → register_patient command body */
export function createPatientToRegister(input: CreatePatientInput) {
  const now = new Date().toISOString()
  return {
    patient: {
      id: input.patient.id ?? "",
      given_name: input.patient.givenName,
      surname: input.patient.surname,
      date_of_birth: input.patient.dateOfBirth,
      sex: input.patient.sex,
      citizenship: input.patient.citizenship ?? "",
      hometown: input.patient.hometown ?? "",
      phone: input.patient.phone ?? "",
      camp: input.patient.camp ?? "",
      additional_data: input.patient.additionalData ?? {},
      metadata: input.patient.metadata ?? {},
      photo_url: input.patient.photoUrl ?? "",
      government_id: input.patient.governmentId ?? "",
      external_patient_id: input.patient.externalPatientId ?? "",
      created_at: now,
      updated_at: now,
    },
    additional_attributes: attributesToRegister(input.additionalAttributes, now),
  }
}

/** UpdatePatientInput → register_patient command body (upsert) */
export function updatePatientToRegister(id: string, input: UpdatePatientInput) {
  const now = new Date().toISOString()
  return {
    patient: {
      id,
      given_name: input.givenName ?? "",
      surname: input.surname ?? "",
      date_of_birth: input.dateOfBirth ?? "",
      sex: input.sex ?? "",
      citizenship: input.citizenship ?? "",
      hometown: input.hometown ?? "",
      phone: input.phone ?? "",
      camp: input.camp ?? "",
      additional_data: input.additionalData ?? {},
      metadata: input.metadata ?? {},
      photo_url: input.photoUrl ?? "",
      government_id: input.governmentId ?? "",
      external_patient_id: input.externalPatientId ?? "",
      created_at: now,
      updated_at: now,
    },
    additional_attributes: attributesToRegister(input.additionalAttributes ?? [], now),
  }
}

/** Transform get_patient response { fields, values } → Patient.T */
export function patientFromGetPatient(
  patientId: string,
  fields: Array<{ id: string; column: string; baseField: boolean }>,
  values: Record<string, any>,
): Patient.T {
  // Map field.id → column for base fields, then look up values
  const col: Record<string, any> = {}
  for (const f of fields) {
    if (f.baseField && f.column && values[f.id] !== undefined) {
      col[f.column] = values[f.id]
    }
  }
  return {
    id: patientId,
    givenName: col.given_name ?? "",
    surname: col.surname ?? "",
    dateOfBirth: col.date_of_birth ?? "",
    citizenship: col.citizenship ?? "",
    hometown: col.hometown ?? "",
    phone: col.phone ?? "",
    sex: col.sex ?? "",
    camp: col.camp ?? "",
    photoUrl: col.photo_url ?? "",
    governmentId: col.government_id ?? "",
    externalPatientId: col.external_patient_id ?? "",
    additionalData: col.additional_data ?? {},
    metadata: col.metadata ?? {},
    isDeleted: false,
    deletedAt: Option.none(),
    createdAt: col.created_at ? new Date(col.created_at) : new Date(),
    updatedAt: col.updated_at ? new Date(col.updated_at) : new Date(),
    primaryClinicId: col.primary_clinic_id,
    lastModifiedBy: col.last_modified_by,
  }
}
