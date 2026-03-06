/**
 * Core data abstraction types for the online/offline provider pattern.
 *
 * The DataProvider type is the central contract: both offlineProvider (WatermelonDB)
 * and onlineProvider (HTTP) implement it. All data access in hooks goes through this type.
 */

import type { CreateEventInput, UpdateEventInput } from "./event"
import type { CreatePatientInput, UpdatePatientInput, GetPatientsParams } from "./patient"
import type { CreateProblemInput, UpdateProblemInput } from "./problem"
import type { CreateVisitInput } from "./visit"
import type { CreateVitalsInput } from "./vitals"
import Event from "../app/models/Event"
import Patient from "../app/models/Patient"
import PatientProblems from "../app/models/PatientProblems"
import PatientVitals from "../app/models/PatientVitals"
import Visit from "../app/models/Visit"

// ---------------------------------------------------------------------------
// DataProvider — the core contract
// ---------------------------------------------------------------------------

/** Input types are defined in types/patient.ts, types/visit.ts, types/event.ts, types/vitals.ts, types/problem.ts */

// ---------------------------------------------------------------------------
// Result type — explicit success/failure for all provider operations
// ---------------------------------------------------------------------------

/** Discriminated union for provider operation errors */
export type DataError =
  | { _tag: "NetworkError"; message: string; statusCode?: number }
  | { _tag: "NotFound"; entity: string; id: string }
  | { _tag: "ValidationError"; message: string; field?: string }
  | { _tag: "Unauthorized"; message: string }
  | { _tag: "ServerError"; message: string }
  | { _tag: "PermissionDenied"; permission: string; message: string }

/** Result of an operation that can fail */
export type Result<T, E = DataError> = { ok: true; data: T } | { ok: false; error: E }

/** Create a success result */
export const ok = <T>(data: T): Result<T, never> => ({ ok: true, data })

/** Create a failure result */
export const err = <E extends DataError>(error: E): Result<never, E> => ({ ok: false, error })

/** Get the result data value, with option of return a default value */
export const getResultData = <T, E = DataError>(res: Result<T, E>, fallback: T) => {
  if (res.ok) {
    return res.data
  } else {
    return fallback
  }
}

/** Extract a human-readable message from any DataError variant */
export function dataErrorMessage(e: DataError): string {
  if (e._tag === "NotFound") return `${e.entity} not found: ${e.id}`
  if (e._tag === "PermissionDenied") return `Permission denied: ${e.permission}. ${e.message}`
  return e.message || e._tag
}

/**
 * Error class wrapping DataError for use with React Query.
 * React Query expects thrown errors — this bridges Result errors to thrown errors.
 */
export class DataProviderError extends Error {
  constructor(public readonly dataError: DataError) {
    super(dataErrorMessage(dataError))
    this.name = "DataProviderError"
  }
}

// ---------------------------------------------------------------------------
// Pagination
// ---------------------------------------------------------------------------

export type PaginationParams = {
  offset?: number
  limit?: number
}

export type PaginatedResult<T> = {
  data: T[]
  pagination: {
    offset: number
    limit: number
    total: number
    hasMore: boolean
  }
}

/**
 * Core data access contract. Both offline (WatermelonDB) and online (HTTP)
 * providers implement this type. Consumed via DataAccessContext in hooks.
 */
export type DataProvider = {
  readonly patients: {
    getMany: (params: GetPatientsParams) => Promise<Result<PaginatedResult<Patient.T>>>
    getById: (id: string) => Promise<Result<Patient.T | null>>
    create: (data: CreatePatientInput) => Promise<Result<{ id: string }>>
    update: (id: string, data: UpdatePatientInput) => Promise<Result<Patient.T>>
  }
  readonly visits: {
    getByPatient: (
      patientId: string,
      params?: PaginationParams,
    ) => Promise<Result<PaginatedResult<Visit.T>>>
    create: (data: CreateVisitInput) => Promise<Result<{ id: string }>>
  }
  readonly events: {
    getByVisit: (visitId: string, patientId: string) => Promise<Result<Event.T[]>>
    getByFormAndPatient: (formId: string, patientId: string) => Promise<Result<Event.T[]>>
    create: (data: CreateEventInput) => Promise<Result<{ eventId: string; visitId: string }>>
    update: (id: string, data: UpdateEventInput) => Promise<Result<Event.T>>
    delete: (id: string) => Promise<Result<void>>
  }
  readonly vitals: {
    getByPatient: (patientId: string) => Promise<Result<PatientVitals.T[]>>
    create: (data: CreateVitalsInput) => Promise<Result<{ id: string }>>
  }
  readonly problems: {
    getByPatient: (patientId: string) => Promise<Result<PatientProblems.T[]>>
    getById: (id: string) => Promise<Result<PatientProblems.T | null>>
    create: (data: CreateProblemInput) => Promise<Result<{ id: string }>>
    update: (id: string, data: UpdateProblemInput) => Promise<Result<PatientProblems.T>>
  }
}
