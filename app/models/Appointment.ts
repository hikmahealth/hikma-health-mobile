import { Model, Q } from "@nozbe/watermelondb"
import { Option, Schema } from "effect"

import database from "@/db"
import AppointmentModel from "@/db/model/Appointment"
import ClinicDepartmentModel from "@/db/model/ClinicDepartment"
import PatientModel from "@/db/model/Patient"
import VisitModel from "@/db/model/Visit"

import User from "./User"

namespace Appointment {
  export const Status = {
    PENDING: "pending",
    SCHEDULED: "scheduled",
    CHECKED_IN: "checked_in",
    IN_PROGRESS: "in_progress",
    CONFIRMED: "confirmed",
    CANCELLED: "cancelled",
    COMPLETED: "completed",
  } as const

  export const DepartmentStatusSchema = Schema.Union(
    Schema.Literal("pending"),
    Schema.Literal("scheduled"),
    Schema.Literal("checked_in"),
    Schema.Literal("in_progress"),
    Schema.Literal("completed"),
    Schema.Literal("cancelled"),
    Schema.Literal("checked_in"),
  )

  export const DepartmentSchema = Schema.Struct({
    id: Schema.String,
    name: Schema.String,
    seen_at: Schema.OptionFromNullOr(Schema.String),
    seen_by: Schema.OptionFromNullOr(Schema.String),
    status: DepartmentStatusSchema,
  })

  export type EncodedDepartment = Schema.Schema.Type<typeof DepartmentSchema>
  export type EncodedDepartmentT = typeof DepartmentSchema.Encoded

  export type Status = (typeof Status)[keyof typeof Status]

  export const statusList = Object.values(Status)

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
    isWalkIn: boolean
    // This is a hack!! TODO: must pick one.
    departments: (EncodedDepartment | EncodedDepartmentT)[]
    metadata: Record<string, any>
    isDeleted: boolean
    createdAt: Date
    updatedAt: Date
    deletedAt: Option.Option<Date>
  }

  export type DBAppointment = AppointmentModel
  export type EncodedT = Omit<
    T,
    "providerId" | "clinicId" | "deletedAt" | "fulfilledVisitId" | "departments"
  > & {
    providerId: string | null
    clinicId: string | null
    fulfilledVisitId: string | null
    deletedAt: Date | null
    departments: {
      id: string
      name: string
      seen_at: string | null // accepts ISO date
      seen_by: string | null
      status: string
    }[]
  }

  /** Default empty Appointmet Item */
  export const empty: EncodedT = {
    id: "",
    providerId: null,
    clinicId: null,
    patientId: "",
    userId: "",
    currentVisitId: "",
    fulfilledVisitId: null,
    timestamp: new Date(),
    duration: 15,
    reason: "",
    notes: "",
    status: Status.PENDING,
    isWalkIn: false,
    departments: [],
    metadata: {},
    isDeleted: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  }

  export const encode = (appointment: T): EncodedT => {
    return {
      id: appointment.id,
      providerId: Option.getOrNull(appointment.providerId),
      clinicId: appointment.clinicId,
      patientId: appointment.patientId,
      userId: appointment.userId,
      currentVisitId: appointment.currentVisitId,
      fulfilledVisitId: Option.getOrNull(appointment.fulfilledVisitId),
      timestamp: appointment.timestamp,
      duration: appointment.duration,
      reason: appointment.reason,
      notes: appointment.notes,
      status: appointment.status,
      isWalkIn: appointment.isWalkIn,
      departments: appointment.departments.map((dept) => ({
        id: dept.id,
        name: dept.name,
        seen_at: Option.getOrNull(dept.seen_at),
        seen_by: Option.getOrNull(dept.seen_by),
        status: dept.status,
      })),
      metadata: appointment.metadata,
      isDeleted: appointment.isDeleted,
      createdAt: appointment.createdAt,
      updatedAt: appointment.updatedAt,
      deletedAt: Option.getOrNull(appointment.deletedAt),
    }
  }

  export const decode = (data: EncodedT): T => {
    return {
      id: data.id,
      providerId: Option.fromNullable(data.providerId),
      clinicId: data.clinicId || "",
      patientId: data.patientId,
      userId: data.userId,
      currentVisitId: data.currentVisitId,
      fulfilledVisitId: Option.fromNullable(data.fulfilledVisitId),
      timestamp: data.timestamp,
      duration: data.duration,
      reason: data.reason,
      notes: data.notes,
      status: data.status,
      isWalkIn: data.isWalkIn,
      departments: data.departments.map((dept) => ({
        id: dept.id,
        name: dept.name,
        seen_at: Option.fromNullable(dept.seen_at),
        seen_by: Option.fromNullable(dept.seen_by),
        status: dept.status as "pending" | "cancelled" | "completed" | "in_progress" | "checked_in",
      })),
      metadata: data.metadata,
      isDeleted: data.isDeleted,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
      deletedAt: Option.fromNullable(data.deletedAt),
    }
  }

  export namespace DB {
    /**
     * Create an appointment
     * @param {Appointment} appointment
     * @returns {Promise<{appointmentId: string, visitId: string | undefined}>}
     */
    export const create = async (
      appointment: Appointment.T,
      provider: { id: string; name: string },
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
            newAppointment.isWalkIn = appointment.isWalkIn || false
            newAppointment.departments = appointment.departments || []
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
     * @param {{ preserveStatus: boolean }} options - whether or not to preserve the status
     * @returns {Promise<void>}
     */
    export const markComplete = async (
      appointmentId: string,
      userId: string,
      visitId?: string,
      options?: { preserveStatus: boolean },
    ): Promise<void> => {
      await database.write(async () => {
        const appointment = await database.get<AppointmentModel>("appointments").find(appointmentId)
        await appointment.update((appointment) => {
          if (options?.preserveStatus) {
            // appointment.status = appointment.status;
            // Do nothing
          } else {
            // Can change the status to completed
            appointment.status = "completed"
          }
          appointment.fulfilledVisitId = visitId || null
          appointment.providerId = userId
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
          if (appointment.isWalkIn !== undefined) appt.isWalkIn = appointment.isWalkIn
          if (appointment.departments !== undefined) appt.departments = appointment.departments
          if (appointment.metadata !== undefined) appt.metadata = appointment.metadata
        })
      })
    }

    /**
     * Update the status of a departments appointment.
     * Only one department can be in_progress at a time. Therefore, if a deparment is in_progress reject the request with an error message.
     *
     * If the new status is "in_progress", the current time is set for the department seen_at.
     * If the new status is "completed", the userId is what is set for the department seen_by.
     * @param {string} appointmentId
     * @param {string} departmentId
     * @param {string} userId the id of the provider updating the status
     * @param {"checked_in" | "in_progress" | "completed"} status
     * @return {Promise<void>}
     */
    export const updateAppointmentDepartmentStatus = async (
      appointmentId: string,
      departmentId: string,
      userId: string,
      status: "checked_in" | "in_progress" | "completed" | "cancelled",
    ): Promise<void> => {
      await database.write(async () => {
        const appointment = await database.get<AppointmentModel>("appointments").find(appointmentId)

        // Check if the department exists in the appointment
        const departmentIndex = appointment.departments.findIndex(
          (dept) => dept.id === departmentId,
        )

        let departmentName: string | undefined

        // If the department does not exist, fetch it to get the name
        if (departmentIndex === -1) {
          // Fetch the department from the clinic_departments table to get the name
          const clinicDepartment = await database
            .get<ClinicDepartmentModel>("clinic_departments")
            .find(departmentId)

          departmentName = clinicDepartment.name
        }

        // If trying to set status to "in_progress", check if any other department is already in progress
        if (status === "in_progress") {
          const hasOtherInProgress = appointment.departments.some(
            (dept) => dept.id !== departmentId && dept.status === "in_progress",
          )

          if (hasOtherInProgress) {
            throw new Error(
              "Another department is already in progress. Only one department can be in progress at a time.",
            )
          }
        }

        // Update the appointment with the new department status
        await appointment.update((appt) => {
          const updatedDepartments = [...appt.departments]

          if (departmentIndex === -1) {
            // Create and add new department entry if it doesn't exist
            const newDepartment: EncodedDepartmentT = {
              id: departmentId,
              name: departmentName!,
              seen_at: status === "in_progress" ? new Date().toISOString() : null,
              seen_by: status === "completed" ? userId : null,
              status: status,
            }
            updatedDepartments.push(newDepartment)
          } else {
            // Update existing department
            const departmentToUpdate = {
              ...updatedDepartments[departmentIndex],
              status: status,
            }

            // Set seen_at when status is "in_progress"
            if (status === "in_progress") {
              departmentToUpdate.seen_at = new Date().toISOString()
            }

            // Set seen_by when status is "completed"
            if (status === "completed") {
              departmentToUpdate.seen_by = userId
            }

            updatedDepartments[departmentIndex] = departmentToUpdate
          }

          appt.departments = updatedDepartments
          appt.providerId = userId
        })
      })
    }

    export const createSearchQueryConditions = (
      searchQuery: string,
      clinicId: string,
      status: string[],
      date: Date,
      options: { offset?: number; limit?: number } = { offset: 0, limit: 25 },
    ): Q.Clause[] => {
      // Build query conditions
      const conditions = [Q.where("clinic_id", clinicId), Q.where("is_deleted", false)]

      // Add date filter - filter by day
      const startOfDay = new Date(date)
      startOfDay.setHours(0, 0, 0, 0)
      const endOfDay = new Date(date)
      endOfDay.setHours(23, 59, 59, 999)

      conditions.push(
        Q.where("timestamp", Q.gte(startOfDay.getTime())),
        Q.where("timestamp", Q.lte(endOfDay.getTime())),
      )

      // Add status filter if provided
      if (status.length > 0) {
        conditions.push(Q.where("status", Q.oneOf(status)))
      }

      // Add patient name search if search query is provided
      if (searchQuery.trim()) {
        const searchTerm = searchQuery.trim()
        const terms = searchTerm.split(" ")
        conditions.push(
          Q.experimentalJoinTables(["patients"]),
          Q.or(
            ...terms.flatMap((t) => [
              Q.on("patients", "given_name", Q.like(`%${Q.sanitizeLikeString(t)}%`)),
              Q.on("patients", "surname", Q.like(`%${Q.sanitizeLikeString(t)}%`)),
            ]),
          ),
        )
      }

      // Add pagination
      const { offset = 0, limit = 25 } = options
      if (offset > 0) {
        conditions.push(Q.skip(offset))
      }
      if (limit > 0) {
        conditions.push(Q.take(limit))
      }

      return conditions
    }

    /**
     * Search for appointments by different parameters
     * @param {string} searchQuery
     * @param {string} clinicId
     * @param {string[]} departmentIds
     * @param {string[]} status the list of statuses that an appointment could have
     * @param {Date} date the date of the appointment
     * @param {{ offset?: number, limit?: number }} options
     */
    export const search = async (
      searchQuery: string,
      clinicId: string,
      departmentIds: string[],
      status: string[],
      date: Date,
      options: { offset?: number; limit?: number } = { offset: 0, limit: 50 },
    ): Promise<Appointment.T[]> => {
      try {
        // build the conditions
        const conditions = createSearchQueryConditions(searchQuery, clinicId, status, date, options)

        // Execute query
        const appointments = await database
          .get<AppointmentModel>("appointments")
          .query(...conditions)
          .fetch()

        // Convert to Appointment.T format
        const results: Appointment.T[] = appointments.map(rawToT)

        // Filter by department IDs if provided (client-side filtering)
        if (departmentIds.length > 0) {
          return results.filter((appointment) =>
            appointment.departments.some((dept) => departmentIds.includes(dept.id)),
          )
        }

        return results
      } catch (error) {
        console.error("Error searching appointments:", error)
        throw error
      }
    }

    export function rawToT(rawAppointment: AppointmentModel): Appointment.T {
      return {
        id: rawAppointment.id,
        providerId: rawAppointment.providerId
          ? Option.some(rawAppointment.providerId)
          : Option.none(),
        clinicId: rawAppointment.clinicId,
        patientId: rawAppointment.patientId,
        userId: rawAppointment.userId,
        currentVisitId: rawAppointment.currentVisitId,
        fulfilledVisitId: rawAppointment.fulfilledVisitId
          ? Option.some(rawAppointment.fulfilledVisitId)
          : Option.none(),
        timestamp: new Date(rawAppointment.timestamp),
        duration: rawAppointment.duration || 0,
        reason: rawAppointment.reason,
        notes: rawAppointment.notes,
        status: rawAppointment.status,
        isWalkIn: rawAppointment.isWalkIn,
        // FIXME: look into this. either remove all Options at this level or figure something else out.
        departments: rawAppointment.departments,
        metadata: rawAppointment.metadata,
        isDeleted: rawAppointment.isDeleted,
        createdAt: rawAppointment.createdAt,
        updatedAt: rawAppointment.updatedAt,
        deletedAt: rawAppointment.deletedAt ? Option.some(rawAppointment.deletedAt) : Option.none(),
      }
    }
  }
}

export default Appointment
