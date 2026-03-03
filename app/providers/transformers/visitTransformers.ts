/**
 * Visit transformers: snake_case server ↔ camelCase domain model.
 */

import { Option } from "effect"
import Visit from "@/models/Visit"
import type { CreateVisitInput } from "../../../types/visit"

/** Server-side visit shape (snake_case) */
export type ServerVisit = {
  id: string
  patient_id: string
  clinic_id: string
  provider_id: string
  provider_name: string
  check_in_timestamp: string
  is_deleted: boolean
  deleted_at: string | null
  metadata: Record<string, any> | null
  created_at: string
  updated_at: string
}

/** Server visit → domain Visit.T */
export function visitFromServer(s: ServerVisit): Visit.T {
  return {
    id: s.id,
    patientId: s.patient_id,
    clinicId: s.clinic_id,
    providerId: s.provider_id,
    providerName: s.provider_name,
    checkInTimestamp: new Date(s.check_in_timestamp),
    isDeleted: s.is_deleted,
    deletedAt: Option.fromNullable(s.deleted_at ? new Date(s.deleted_at) : null),
    metadata: Option.fromNullable(s.metadata),
    createdAt: new Date(s.created_at),
    updatedAt: new Date(s.updated_at),
  }
}

/** Domain Visit.T → server visit shape */
export function visitToServer(v: Visit.T): ServerVisit {
  return {
    id: v.id,
    patient_id: v.patientId,
    clinic_id: v.clinicId,
    provider_id: v.providerId,
    provider_name: v.providerName,
    check_in_timestamp: v.checkInTimestamp instanceof Date
      ? v.checkInTimestamp.toISOString()
      : new Date(v.checkInTimestamp).toISOString(),
    is_deleted: v.isDeleted,
    deleted_at: Option.getOrNull(v.deletedAt)?.toISOString() ?? null,
    metadata: Option.getOrNull(v.metadata),
    created_at: v.createdAt instanceof Date
      ? v.createdAt.toISOString()
      : new Date(v.createdAt).toISOString(),
    updated_at: v.updatedAt instanceof Date
      ? v.updatedAt.toISOString()
      : new Date(v.updatedAt).toISOString(),
  }
}

/** CreateVisitInput → server payload for POST /api/visits */
export function createVisitToServer(input: CreateVisitInput) {
  return {
    patient_id: input.patientId,
    clinic_id: input.clinicId,
    provider_id: input.providerId,
    provider_name: input.providerName,
    check_in_timestamp: new Date(input.checkInTimestamp).toISOString(),
    metadata: input.metadata ?? {},
  }
}
