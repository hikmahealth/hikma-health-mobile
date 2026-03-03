/**
 * Offline DataProvider implementation backed by WatermelonDB.
 * Delegates to existing model methods (Patient.DB, Event.DB, etc.)
 * rather than reimplementing database logic.
 */

import { Q, Database } from "@nozbe/watermelondb"
import { Option } from "effect"

import PatientModel from "@/db/model/Patient"
import VisitModel from "@/db/model/Visit"
import EventModel from "@/db/model/Event"
import PatientProblemModel from "@/db/model/PatientProblems"
import Patient from "@/models/Patient"
import Visit from "@/models/Visit"
import EventNS from "@/models/Event"
import PatientVitals from "@/models/PatientVitals"
import PatientProblems from "@/models/PatientProblems"

import type { DataProvider, PaginatedResult } from "../../types/data"
import { ok, err } from "../../types/data"
import type { CreatePatientInput, UpdatePatientInput, GetPatientsParams } from "../../types/patient"
import type { CreateVisitInput } from "../../types/visit"
import type { CreateEventInput, UpdateEventInput } from "../../types/event"
import type { CreateVitalsInput } from "../../types/vitals"
import type { CreateProblemInput, UpdateProblemInput } from "../../types/problem"

/** Convert a VisitModel to Visit.T */
function visitFromDB(v: VisitModel): Visit.T {
  return {
    id: v.id,
    patientId: v.patientId,
    clinicId: v.clinicId,
    providerId: v.providerId,
    providerName: v.providerName,
    checkInTimestamp: v.checkInTimestamp,
    isDeleted: v.isDeleted,
    deletedAt: Option.fromNullable(v.deletedAt),
    metadata: Option.fromNullable(v.metadata),
    createdAt: v.createdAt,
    updatedAt: v.updatedAt,
  }
}

/** Convert an EventModel to Event.T */
function eventFromDB(e: EventModel): EventNS.T {
  return {
    id: e.id,
    patientId: e.patientId,
    visitId: e.visitId,
    eventType: e.eventType,
    formId: e.formId,
    formData: e.formData,
    metadata: e.metadata,
    isDeleted: e.isDeleted,
    deletedAt: Option.fromNullable(e.deletedAt),
    recordedByUserId: e.recordedByUserId ?? "",
    createdAt: e.createdAt,
    updatedAt: e.updatedAt,
  }
}

/**
 * Create an offline DataProvider backed by WatermelonDB.
 * Wraps existing DB methods, returning Result types.
 */
export function createOfflineProvider(db: Database): DataProvider {
  return {
    patients: {
      async getMany(params: GetPatientsParams) {
        try {
          const { search, offset = 0, limit = 50 } = params

          const searchClause =
            search && search.length > 0
              ? Q.and(
                  Q.where("is_deleted", false),
                  Q.or(
                    Q.where("given_name", Q.like(`%${Q.sanitizeLikeString(search)}%`)),
                    Q.where("surname", Q.like(`%${Q.sanitizeLikeString(search)}%`)),
                    Q.where("phone", Q.like(`%${Q.sanitizeLikeString(search)}%`)),
                    Q.where("government_id", Q.like(`%${Q.sanitizeLikeString(search)}%`)),
                  ),
                )
              : Q.where("is_deleted", false)

          const total = await db.get<PatientModel>("patients").query(searchClause).fetchCount()

          const patients = await db
            .get<PatientModel>("patients")
            .query(searchClause, Q.sortBy("updated_at", "desc"), Q.skip(offset), Q.take(limit))
            .fetch()

          const items = patients.map(Patient.DB.fromDB)
          return ok({
            items,
            pagination: { offset, limit, total, hasMore: offset + limit < total },
          })
        } catch (error) {
          return err({ _tag: "ServerError", message: String(error) })
        }
      },

      async getById(id: string) {
        try {
          const patient = await db.get<PatientModel>("patients").find(id)
          return ok(Patient.DB.fromDB(patient))
        } catch (error) {
          return err({ _tag: "NotFound", entity: "Patient", id })
        }
      },

      async create(_data: CreatePatientInput) {
        // The offline create path uses Patient.DB.register() which expects
        // a PatientRegistrationForm.PatientRecord. Screen code calls that directly
        // when offline. This method exists so the DataProvider type is satisfied;
        // the actual offline patient creation continues to go through the existing
        // Patient.DB.register() in screen code.
        return err({
          _tag: "ServerError",
          message: "Offline patient creation uses Patient.DB.register() directly",
        })
      },

      async update(_id: string, _data: UpdatePatientInput) {
        // Same as create — offline updates use Patient.DB.updateById() directly.
        return err({
          _tag: "ServerError",
          message: "Offline patient update uses Patient.DB.updateById() directly",
        })
      },
    },

    visits: {
      async getByPatient(patientId: string, params) {
        try {
          const { offset = 0, limit = 50 } = params ?? {}

          const total = await db
            .get<VisitModel>("visits")
            .query(Q.where("patient_id", patientId), Q.where("is_deleted", false))
            .fetchCount()

          const visits = await db
            .get<VisitModel>("visits")
            .query(
              Q.where("patient_id", patientId),
              Q.where("is_deleted", false),
              Q.sortBy("check_in_timestamp", "desc"),
              Q.skip(offset),
              Q.take(limit),
            )
            .fetch()

          return ok({
            items: visits.map(visitFromDB),
            pagination: { offset, limit, total, hasMore: offset + limit < total },
          })
        } catch (error) {
          return err({ _tag: "ServerError", message: String(error) })
        }
      },

      async create(_data: CreateVisitInput) {
        // Visits in offline mode are created implicitly by Event.DB.create().
        return err({
          _tag: "ServerError",
          message: "Offline visit creation uses Event.DB.create() directly",
        })
      },
    },

    events: {
      async getByVisit(visitId: string, _patientId: string) {
        try {
          const events = await db
            .get<EventModel>("events")
            .query(Q.where("visit_id", visitId), Q.where("is_deleted", false))
            .fetch()

          return ok(events.map(eventFromDB))
        } catch (error) {
          return err({ _tag: "ServerError", message: String(error) })
        }
      },

      async getByFormAndPatient(formId: string, patientId: string) {
        try {
          const events = await db
            .get<EventModel>("events")
            .query(
              Q.where("form_id", formId),
              Q.where("patient_id", patientId),
              Q.where("is_deleted", false),
            )
            .fetch()

          return ok(events.map(eventFromDB))
        } catch (error) {
          return err({ _tag: "ServerError", message: String(error) })
        }
      },

      async create(data: CreateEventInput) {
        try {
          // Delegate to existing Event.DB.create which handles visit auto-creation
          const result = await EventNS.DB.create(
            {
              patientId: data.patientId,
              visitId: data.visitId ?? "",
              eventType: data.eventType,
              formId: data.formId,
              formData: data.formData,
              metadata: data.metadata ?? {},
              isDeleted: false,
            } as any,
            data.visitId,
            data.clinicId ?? "",
            data.providerId ?? "",
            data.providerName ?? "",
            data.checkInTimestamp ?? Date.now(),
          )
          return ok(result)
        } catch (error) {
          return err({ _tag: "ServerError", message: String(error) })
        }
      },

      async update(id: string, data: UpdateEventInput) {
        try {
          const event = await db.get<EventModel>("events").find(id)
          const updated = await db.write(async () => {
            return event.update((e) => {
              e.formData = data.formData
              if (data.metadata) e.metadata = data.metadata
            })
          })
          return ok(eventFromDB(updated))
        } catch (error) {
          return err({ _tag: "ServerError", message: String(error) })
        }
      },

      async delete(id: string) {
        try {
          await EventNS.DB.softDelete(id)
          return ok(undefined)
        } catch (error) {
          return err({ _tag: "ServerError", message: String(error) })
        }
      },
    },

    vitals: {
      async getByPatient(patientId: string) {
        try {
          const vitals = await PatientVitals.DB.getAllForPatient(patientId)
          return ok(vitals)
        } catch (error) {
          return err({ _tag: "ServerError", message: String(error) })
        }
      },

      async create(data: CreateVitalsInput) {
        try {
          const id = await PatientVitals.DB.create(data)
          return ok({ id })
        } catch (error) {
          return err({ _tag: "ServerError", message: String(error) })
        }
      },
    },

    problems: {
      async getByPatient(patientId: string) {
        try {
          const problems = await PatientProblems.DB.getAllForPatient(patientId)
          return ok(problems)
        } catch (error) {
          return err({ _tag: "ServerError", message: String(error) })
        }
      },

      async getById(id: string) {
        try {
          const record = await db.get<PatientProblemModel>("patient_problems").find(id)
          return ok(PatientProblems.DB.fromDB(record))
        } catch (error) {
          return err({ _tag: "NotFound", entity: "Problem", id })
        }
      },

      async create(data: CreateProblemInput) {
        try {
          const id = await PatientProblems.DB.create(data)
          return ok({ id })
        } catch (error) {
          return err({ _tag: "ServerError", message: String(error) })
        }
      },

      async update(id: string, data: UpdateProblemInput) {
        try {
          await PatientProblems.DB.update(id, data)
          // Re-fetch to return the full updated record
          const record = await db.get<PatientProblemModel>("patient_problems").find(id)
          return ok(PatientProblems.DB.fromDB(record))
        } catch (error) {
          return err({ _tag: "ServerError", message: String(error) })
        }
      },
    },
  }
}
