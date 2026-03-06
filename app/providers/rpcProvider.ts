/**
 * DataProvider implementation backed by RpcTransport.
 *
 * Works with both encrypted (hub) and plain (cloud) transports —
 * the transport abstraction handles the wire format differences.
 * Uses the same transformer functions as onlineProvider.
 */

import type { RpcTransport } from "../rpc/transport"
import type { RpcError } from "../rpc/types"
import type { DataProvider, PaginatedResult, DataError } from "../../types/data"
import { ok, err } from "../../types/data"
import type { CreatePatientInput, UpdatePatientInput, GetPatientsParams } from "../../types/patient"
import type { CreateVisitInput } from "../../types/visit"
import type { CreateEventInput, UpdateEventInput } from "../../types/event"
import type { CreateVitalsInput } from "../../types/vitals"
import type { CreateProblemInput, UpdateProblemInput } from "../../types/problem"

import {
  patientFromServer,
  patientFromGetPatient,
  createPatientToRegister,
  updatePatientToRegister,
} from "./transformers/patientTransformers"
import { visitFromServer, createVisitToServer } from "./transformers/visitTransformers"
import {
  eventFromServer,
  createEventToServer,
  updateEventToServer,
} from "./transformers/eventTransformers"
import { vitalsFromServer, createVitalsToServer } from "./transformers/vitalsTransformers"
import {
  problemFromServer,
  createProblemToServer,
  updateProblemToServer,
} from "./transformers/problemTransformers"

/** Map RpcError to DataError */
function toDataError(rpcError: RpcError): DataError {
  switch (rpcError.code) {
    case "AUTH_FAILED":
    case "SESSION_EXPIRED":
      return { _tag: "Unauthorized", message: rpcError.message }
    case "NETWORK_ERROR":
    case "HUB_UNREACHABLE":
      return { _tag: "NetworkError", message: rpcError.message }
    default:
      return { _tag: "ServerError", message: rpcError.message }
  }
}

/**
 * Create a DataProvider that sends commands/queries over an RpcTransport.
 * @param getTransport - Async factory that returns the current transport
 */
export function createRpcProvider(getTransport: () => Promise<RpcTransport>): DataProvider {
  return {
    patients: {
      async getMany(params: GetPatientsParams) {
        const transport = await getTransport()
        const hasSearch = params.search && params.search.trim().length > 0
        const hasFilters = Object.keys(params.filters ?? {}).length > 0

        if (hasSearch || hasFilters) {
          // Use search_patients when there are active filters
          const filters: Record<string, string> = { ...params.filters }
          if (hasSearch) filters.given_name = params.search!.trim()
          const result = await transport.sendQuery<{
            data: any[]
            total: number
            limit: number
            offset: number
          }>("search_patients", { filters, limit: params.limit, offset: params.offset })
          if (!result.ok) return err(toDataError(result.error))
          const { data, total, limit, offset } = result.data
          return ok({
            data: data.map(patientFromServer),
            pagination: { offset, limit, total, hasMore: offset + limit < total },
          })
        }

        // Use get_patients for simple paginated listing
        const result = await transport.sendQuery<{
          data: any[]
          total: number
          limit: number
          offset: number
        }>("get_patients", { limit: params.limit, offset: params.offset })
        if (!result.ok) return err(toDataError(result.error))
        const { data, total, limit, offset } = result.data
        return ok({
          data: data.map(patientFromServer),
          pagination: { offset, limit, total, hasMore: offset + limit < total },
        })
      },

      async getById(id: string) {
        const transport = await getTransport()
        const result = await transport.sendQuery<{
          fields: Array<{ id: string; column: string; baseField: boolean }>
          values: Record<string, any>
          error?: string
        }>("get_patient", { patient_id: id })
        if (!result.ok) return err(toDataError(result.error))
        if (result.data.error) return ok(null)
        return ok(patientFromGetPatient(id, result.data.fields, result.data.values))
      },

      async create(data: CreatePatientInput) {
        const transport = await getTransport()
        const body = createPatientToRegister(data)
        const result = await transport.sendCommand<{ patient_id: string; attributes_count: number }>(
          "register_patient",
          body,
        )
        if (!result.ok) return err(toDataError(result.error))
        return ok({ id: result.data.patient_id })
      },

      async update(id: string, data: UpdatePatientInput) {
        const transport = await getTransport()
        const body = updatePatientToRegister(id, data)
        const result = await transport.sendCommand<{ patient_id: string; attributes_count: number }>(
          "register_patient",
          body,
        )
        if (!result.ok) return err(toDataError(result.error))
        // Fetch the updated patient to return full Patient.T
        const fetchResult = await transport.sendQuery<{
          fields: Array<{ id: string; column: string; baseField: boolean }>
          values: Record<string, any>
        }>("get_patient", { patient_id: id })
        if (!fetchResult.ok) return err(toDataError(fetchResult.error))
        return ok(patientFromGetPatient(id, fetchResult.data.fields, fetchResult.data.values))
      },
    },

    visits: {
      async getByPatient(patientId: string, _params) {
        const transport = await getTransport()
        // Backend returns { data: [...] } (not paginated)
        const result = await transport.sendQuery<{
          data: any[]
        }>("get_visits", { patient_id: patientId })
        if (!result.ok) return err(toDataError(result.error))
        const visits = result.data.data.map(visitFromServer)
        return ok({
          data: visits,
          pagination: {
            offset: 0,
            limit: visits.length,
            total: visits.length,
            hasMore: false,
          },
        })
      },

      async create(data: CreateVisitInput) {
        const transport = await getTransport()
        const body = createVisitToServer(data)
        const result = await transport.sendCommand<{ success: boolean; id: string }>(
          "visits.create",
          body,
        )
        if (!result.ok) return err(toDataError(result.error))
        return ok({ id: result.data.id })
      },
    },

    events: {
      async getByVisit(visitId: string, patientId: string) {
        const transport = await getTransport()
        // Backend returns { data: [...] }
        const result = await transport.sendQuery<{ data: any[] }>("get_visit_events", {
          patient_id: patientId,
          visit_id: visitId,
        })
        if (!result.ok) return err(toDataError(result.error))
        return ok(result.data.data.map(eventFromServer))
      },

      async getByFormAndPatient(formId: string, patientId: string) {
        const transport = await getTransport()
        const result = await transport.sendQuery<any[]>("events.by_form", {
          form_id: formId,
          patient_id: patientId,
        })
        if (!result.ok) return err(toDataError(result.error))
        return ok(result.data.map(eventFromServer))
      },

      async create(data: CreateEventInput) {
        const transport = await getTransport()
        const body = createEventToServer(data)
        const result = await transport.sendCommand<{
          success: boolean
          id: string
          visit_id: string
        }>("events.create", body)
        if (!result.ok) return err(toDataError(result.error))
        return ok({ eventId: result.data.id, visitId: result.data.visit_id })
      },

      async update(id: string, data: UpdateEventInput) {
        const transport = await getTransport()
        const body = updateEventToServer(data)
        const result = await transport.sendCommand<any>("events.update", { id, ...body })
        if (!result.ok) return err(toDataError(result.error))
        return ok(eventFromServer(result.data))
      },

      async delete(id: string) {
        const transport = await getTransport()
        const result = await transport.sendCommand<{ success: boolean }>("events.delete", { id })
        if (!result.ok) return err(toDataError(result.error))
        return ok(undefined)
      },
    },

    vitals: {
      async getByPatient(patientId: string) {
        const transport = await getTransport()
        const result = await transport.sendQuery<any[]>("vitals.list", {
          patient_id: patientId,
        })
        if (!result.ok) return err(toDataError(result.error))
        return ok(result.data.map(vitalsFromServer))
      },

      async create(data: CreateVitalsInput) {
        const transport = await getTransport()
        const body = createVitalsToServer(data)
        const result = await transport.sendCommand<{ success: boolean; id: string }>(
          "vitals.create",
          body,
        )
        if (!result.ok) return err(toDataError(result.error))
        return ok({ id: result.data.id })
      },
    },

    problems: {
      async getByPatient(patientId: string) {
        const transport = await getTransport()
        const result = await transport.sendQuery<any[]>("problems.list", {
          patient_id: patientId,
        })
        if (!result.ok) return err(toDataError(result.error))
        return ok(result.data.map(problemFromServer))
      },

      async getById(id: string) {
        const transport = await getTransport()
        const result = await transport.sendQuery<any>("problems.get", { id })
        if (!result.ok) return err(toDataError(result.error))
        if (!result.data) return ok(null)
        return ok(problemFromServer(result.data))
      },

      async create(data: CreateProblemInput) {
        const transport = await getTransport()
        const body = createProblemToServer(data)
        const result = await transport.sendCommand<{ success: boolean; id: string }>(
          "problems.create",
          body,
        )
        if (!result.ok) return err(toDataError(result.error))
        return ok({ id: result.data.id })
      },

      async update(id: string, data: UpdateProblemInput) {
        const transport = await getTransport()
        const body = updateProblemToServer(data)
        const result = await transport.sendCommand<any>("problems.update", { id, ...body })
        if (!result.ok) return err(toDataError(result.error))
        return ok(problemFromServer(result.data))
      },
    },
  }
}
