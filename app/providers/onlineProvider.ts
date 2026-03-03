/**
 * @deprecated Use rpcProvider.ts instead. Both cloud and hub now use unified
 * RPC endpoints (/rpc/command, /rpc/query). This REST-based provider is kept
 * for rollback only.
 *
 * Online DataProvider implementation backed by HTTP.
 * All data flows through the injected HttpClient — no local DB access.
 */

import type { HttpClient } from "./httpClient"
import {
  eventFromServer,
  createEventToServer,
  updateEventToServer,
} from "./transformers/eventTransformers"
import type { ServerEvent } from "./transformers/eventTransformers"
import {
  patientFromServer,
  createPatientToTRPC,
  updatePatientToTRPC,
} from "./transformers/patientTransformers"
import type { ServerPatient } from "./transformers/patientTransformers"
import {
  problemFromServer,
  createProblemToServer,
  updateProblemToServer,
} from "./transformers/problemTransformers"
import type { ServerProblem } from "./transformers/problemTransformers"
import { visitFromServer, createVisitToServer } from "./transformers/visitTransformers"
import type { ServerVisit } from "./transformers/visitTransformers"
import { vitalsFromServer, createVitalsToServer } from "./transformers/vitalsTransformers"
import type { ServerVitals } from "./transformers/vitalsTransformers"
import { trpcMutate } from "./trpcClient"
import type { DataProvider, PaginatedResult, DataError } from "../../types/data"
import { ok, err } from "../../types/data"
import type { CreateEventInput, UpdateEventInput } from "../../types/event"
import type { CreatePatientInput, GetPatientsParams } from "../../types/patient"
import type { UpdatePatientInput } from "../../types/patient"
import type { CreateProblemInput, UpdateProblemInput } from "../../types/problem"
import type { CreateVisitInput } from "../../types/visit"
import type { CreateVitalsInput } from "../../types/vitals"

/** Map HTTP error to DataError */
function toDataError(error: { message: string; statusCode: number }): DataError {
  console.warn(
    "[OnlineProvider] toDataError — statusCode:",
    error.statusCode,
    "message:",
    error.message,
  )
  if (error.statusCode === 401) return { _tag: "Unauthorized", message: error.message }
  if (error.statusCode === 404) return { _tag: "NotFound", entity: "Resource", id: "" }
  if (error.statusCode === 0) return { _tag: "NetworkError", message: error.message, statusCode: 0 }
  return { _tag: "ServerError", message: error.message }
}

/**
 * Create an online DataProvider backed by HTTP.
 * @deprecated Prefer the RPC
 * @param httpClient - Injectable HTTP client (use createApisauceClient in prod, mock in tests)
 */
export function createOnlineProvider(httpClient: HttpClient): DataProvider {
  return {
    patients: {
      async getMany(params: GetPatientsParams) {
        const response = await httpClient.get<{
          data: ServerPatient[]
          pagination: PaginatedResult<any>["pagination"]
        }>("/api/patients", params)
        console.log("⭐️", { params, response })
        if (!response.ok) return err(toDataError(response.error))
        return ok({
          data: response.data.data.map(patientFromServer),
          pagination: response.data.pagination,
        })
      },

      async getById(id: string) {
        const response = await httpClient.get<ServerPatient>(`/api/patients/${id}`)
        if (!response.ok) {
          if (response.status === 404) return ok(null)
          return err(toDataError(response.error))
        }
        return ok(patientFromServer(response.data))
      },

      async create(data: CreatePatientInput) {
        const body = createPatientToTRPC(data)
        const response = await trpcMutate<typeof body, { success: boolean; id: string }>(
          httpClient,
          "patients.create",
          body,
        )
        if (!response.ok) return err(toDataError(response.error))
        return ok({ id: response.data.id })
      },

      async update(id: string, data: UpdatePatientInput) {
        const body = updatePatientToTRPC(id, data)
        const response = await trpcMutate<typeof body, { success: boolean }>(
          httpClient,
          "patients.update",
          body,
        )
        if (!response.ok) return err(toDataError(response.error))
        // tRPC update returns { success: true } — fetch full patient to fulfill contract
        const getResponse = await httpClient.get<ServerPatient>(`/api/patients/${id}`)
        if (!getResponse.ok) return err(toDataError(getResponse.error))
        return ok(patientFromServer(getResponse.data))
      },
    },

    visits: {
      async getByPatient(patientId: string, params) {
        const response = await httpClient.get<{
          data: ServerVisit[]
          pagination: PaginatedResult<any>["pagination"]
        }>(`/api/patients/${patientId}/visits`, params)
        if (!response.ok) return err(toDataError(response.error))
        return ok({
          data: response.data.data.map(visitFromServer),
          pagination: response.data.pagination,
        })
      },

      async create(data: CreateVisitInput) {
        const body = createVisitToServer(data)
        const response = await httpClient.post<{ success: boolean; id: string }>(
          "/api/visits",
          body,
        )
        if (!response.ok) return err(toDataError(response.error))
        return ok({ id: response.data.id })
      },
    },

    events: {
      async getByVisit(visitId: string, _patientId: string) {
        const response = await httpClient.get<ServerEvent[]>(`/api/visits/${visitId}/events`)
        if (!response.ok) return err(toDataError(response.error))
        return ok(response.data.map(eventFromServer))
      },

      async getByFormAndPatient(formId: string, patientId: string) {
        const response = await httpClient.get<ServerEvent[]>(`/api/patients/${patientId}/events`, {
          form_id: formId,
        })
        if (!response.ok) return err(toDataError(response.error))
        return ok(response.data.map(eventFromServer))
      },

      async create(data: CreateEventInput) {
        const body = createEventToServer(data)
        const response = await httpClient.post<{ success: boolean; id: string; visit_id: string }>(
          "/api/events",
          body,
        )
        if (!response.ok) return err(toDataError(response.error))
        return ok({ eventId: response.data.id, visitId: response.data.visit_id })
      },

      async update(id: string, data: UpdateEventInput) {
        const body = updateEventToServer(data)
        const response = await httpClient.put<ServerEvent>(`/api/events/${id}`, body)
        if (!response.ok) return err(toDataError(response.error))
        return ok(eventFromServer(response.data))
      },

      async delete(id: string) {
        const response = await httpClient.delete<{ success: boolean }>(`/api/events/${id}`)
        if (!response.ok) return err(toDataError(response.error))
        return ok(undefined)
      },
    },

    vitals: {
      async getByPatient(patientId: string) {
        const response = await httpClient.get<ServerVitals[]>(`/api/patients/${patientId}/vitals`)
        if (!response.ok) return err(toDataError(response.error))
        return ok(response.data.map(vitalsFromServer))
      },

      async create(data: CreateVitalsInput) {
        const body = createVitalsToServer(data)
        const response = await httpClient.post<{ success: boolean; id: string }>(
          "/api/vitals",
          body,
        )
        if (!response.ok) return err(toDataError(response.error))
        return ok({ id: response.data.id })
      },
    },

    problems: {
      async getByPatient(patientId: string) {
        const response = await httpClient.get<ServerProblem[]>(
          `/api/patients/${patientId}/problems`,
        )
        if (!response.ok) return err(toDataError(response.error))
        return ok(response.data.map(problemFromServer))
      },

      async getById(id: string) {
        const response = await httpClient.get<ServerProblem>(`/api/problems/${id}`)
        if (!response.ok) {
          if (response.status === 404) return ok(null)
          return err(toDataError(response.error))
        }
        return ok(problemFromServer(response.data))
      },

      async create(data: CreateProblemInput) {
        const body = createProblemToServer(data)
        const response = await httpClient.post<{ success: boolean; id: string }>(
          "/api/problems",
          body,
        )
        if (!response.ok) return err(toDataError(response.error))
        return ok({ id: response.data.id })
      },

      async update(id: string, data: UpdateProblemInput) {
        const body = updateProblemToServer(data)
        const response = await httpClient.put<ServerProblem>(`/api/problems/${id}`, body)
        if (!response.ok) return err(toDataError(response.error))
        return ok(problemFromServer(response.data))
      },
    },
  }
}
