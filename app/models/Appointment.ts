import { Model } from "@nozbe/watermelondb"
import { Option } from "effect"

import database from "@/db"
import AppointmentModel from "@/db/model/Appointment"
import PatientModel from "@/db/model/Patient"
import VisitModel from "@/db/model/Visit"

import User from "./User"

namespace Appointment {
  export const Status = {
    PENDING: "pending",
    CONFIRMED: "confirmed",
    CANCELLED: "cancelled",
    COMPLETED: "completed",
  }

  export type Status = (typeof Status)[keyof typeof Status]
  export type T = {
    id: string
    providerId: Option.Option<string>
    clinicId: string
    patientId: string
    userId: string
    currentVisitId: string
    fulfilledVisitId: Option.Option<string>
    timestamp: Date
    duration: number // in minutes
    reason: string
    notes: string
    status: Status
    metadata: Record<string, any>
    isDeleted: boolean
    createdAt: Date
    updatedAt: Date
    deletedAt: Option.Option<Date>
  }

  export type DBAppointment = AppointmentModel

  /** Default empty Appointmet Item */
  export const empty: T = {
    id: "",
    providerId: Option.none(),
    clinicId: "",
    patientId: "",
    userId: "",
    currentVisitId: "",
    fulfilledVisitId: Option.none(),
    timestamp: new Date(),
    duration: 0,
    reason: "",
    notes: "",
    status: Status.PENDING,
    metadata: {},
    isDeleted: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: Option.none(),
  }

  export namespace DB {
    /**
     * Create an appointment
     * @param {Appointment} appointment
     * @returns {Promise<{appointmentId: string, visitId: string | undefined}>}
     */
    export const create = async (
      appointment: Appointment.T,
      provider: User.Provider,
    ): Promise<{ appointmentId: string; visitId: string | undefined }> => {
      // Check that the patientid, userId, and clinicid are valid strings (shallow test, not a deep check for a valid uuid)
      if (
        !appointment.patientId ||
        !appointment.userId ||
        !appointment.clinicId ||
        typeof appointment.patientId !== "string" ||
        typeof appointment.userId !== "string" ||
        typeof appointment.clinicId !== "string" ||
        appointment.patientId.length <= 3 ||
        appointment.userId.length <= 3 ||
        appointment.clinicId.length <= 3
      ) {
        throw new Error("Invalid patientId, userId, or clinicId")
      }

      return await database.write(async () => {
        // If there is no currentVisitId, we need to create a new visit
        let visit: VisitModel | null = null
        let appointmentVisitId: string | null = appointment.currentVisitId
        if (!appointment.currentVisitId) {
          visit = database.get<VisitModel>("visits").prepareCreate((newVisit) => {
            newVisit.patientId = appointment.patientId
            newVisit.clinicId = appointment.clinicId
            newVisit.providerId = provider.id
            newVisit.providerName = provider.name
            newVisit.checkInTimestamp = new Date()
            newVisit.metadata = {}
          })
          appointmentVisitId = visit.id
        }

        const appointmentQuery = database
          .get<AppointmentModel>("appointments")
          .prepareCreate((newAppointment) => {
            newAppointment.currentVisitId = appointmentVisitId
            newAppointment.patientId = appointment.patientId
            newAppointment.providerId = Option.isOption(appointment.providerId)
              ? Option.getOrElse(appointment.providerId, () => "")
              : ""
            newAppointment.clinicId = appointment.clinicId
            newAppointment.userId = provider.id
            newAppointment.timestamp = appointment.timestamp.getTime()
            newAppointment.duration = appointment.duration
            newAppointment.reason = appointment.reason || ""
            newAppointment.notes = appointment.notes || ""
            newAppointment.status = appointment.status || "pending"
            newAppointment.metadata = appointment.metadata || {}
            newAppointment.isDeleted = false
          })

        // Update the patient metadata with lastAppointmentTimestamp value
        // This makes sure the patient is always synced with the server when an appointment is created
        const patient = await database.get<PatientModel>("patients").find(appointment.patientId)
        let patientUpdate: PatientModel | undefined = undefined
        if (patient) {
          patientUpdate = patient.prepareUpdate((updatedPatient) => {
            updatedPatient.metadata = {
              ...updatedPatient.metadata,
              lastAppointmentTimestamp: appointment.timestamp.toISOString(),
            }
          })
        }

        // batch create both of them
        await database.batch([visit, appointmentQuery, patientUpdate].filter(Boolean) as Model[])

        return {
          appointmentId: appointmentQuery.id,
          visitId: visit?.id,
        }
      })
    }

    /**
     * Mark an appointment as cancelled
     * @param {string} appointmentId
     * @returns {Promise<void>}
     */
    export const cancel = async (appointmentId: string): Promise<void> => {
      await database.write(async () => {
        const appointment = await database.get<AppointmentModel>("appointments").find(appointmentId)
        await appointment.update((appointment) => {
          appointment.status = "cancelled"
        })
      })
    }

    /**
     * Mark an appointment as complete
     * @param {string} appointmentId
     * Optional visitId to mark appointment as complete with respect to a visit
     * @param {string} visitId
     * @returns {Promise<void>}
     */
    export const markComplete = async (appointmentId: string, visitId?: string): Promise<void> => {
      await database.write(async () => {
        const appointment = await database.get<AppointmentModel>("appointments").find(appointmentId)
        await appointment.update((appointment) => {
          appointment.status = "completed"
          appointment.fulfilledVisitId = visitId || null
        })
      })
    }

    /**
     * Update an appointment
     * @param {string} appointmentId
     * @param {Partial<Appointment>} appointment
     * @returns {Promise<void>}
     */
    export const update = async (
      appointmentId: string,
      appointment: Partial<Appointment.T>,
    ): Promise<void> => {
      await database.write(async () => {
        const appointmentRecord = await database
          .get<Appointment.DBAppointment>("appointments")
          .find(appointmentId)
        await appointmentRecord.update((appt) => {
          if (appointment.timestamp !== undefined)
            appt.timestamp = new Date(appointment.timestamp).getTime()
          if (appointment.duration !== undefined) appt.duration = appointment.duration
          if (appointment.reason !== undefined) appt.reason = appointment.reason
          if (appointment.notes !== undefined) appt.notes = appointment.notes
          if (appointment.status !== undefined) appt.status = appointment.status
          if (appointment.metadata !== undefined) appt.metadata = appointment.metadata
        })
      })
    }
  }
}

export default Appointment
