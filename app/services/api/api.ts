/**
 * This Api class lets you define an API endpoint and methods to request
 * data and process it.
 *
 * See the [Backend API Integration](https://github.com/infinitered/ignite/blob/master/docs/Backend-API-Integration.md)
 * documentation for more details.
 */
import { ApisauceInstance, create } from "apisauce"
import Config from "../../config"
import type { ApiConfig } from "./api.types"
import PatientModel, { PatientModelData } from "../../db/model/Patient"
import { database } from "../../db"
import { SyncDatabaseChangeSet, SyncPullResult, SyncPushResult } from "@nozbe/watermelondb/sync"
import { MigrationSyncChanges } from "@nozbe/watermelondb/Schema/migrations/getSyncChanges"
import EventModel from "../../db/model/Event"
import VisitModel from "../../db/model/Visit"
import { isValid } from "date-fns"
import { Model, Q } from "@nozbe/watermelondb"
import { getHHApiUrl } from "../../utils/storage"
import { Appointment } from "../../types"
import AppointmentModel from "../../db/model/Appointment"
import { Provider } from "../../models"
import ClinicModel from "../../db/model/Clinic"
import { Linking } from "react-native"
import * as Sentry from '@sentry/react-native';
import { PrescriptionForm } from "../../screens"
import PrescriptionModel from "../../db/model/Prescription"
/**
 * Configuring the apisauce instance.
 */
export const DEFAULT_API_CONFIG: ApiConfig = {
  url: Config.API_URL || "",
  timeout: 10000,
}

/**
 * Manages all requests to the API. You can use this class to build out
 * various requests that you need to call from your backend API.
 */
export class Api {
  apisauce: ApisauceInstance
  config: ApiConfig

  /**
   * Set up our API instance. Keep this lightweight!
   */
  constructor(config: ApiConfig = DEFAULT_API_CONFIG) {
    this.config = config
    this.apisauce = create({
      baseURL: this.config.url,
      timeout: this.config.timeout,
      headers: {
        Accept: "application/json",
      },
    })
  }

  /**
   * Register a new patient
   * @deprecated
   * @param {PatientModelData} patient
   * @returns {Promise<PatientModel>}
   */
  async registerPatient(patient: PatientModelData): Promise<PatientModel> {
    return await database.write(async () => {
      const pt = await database.get<PatientModel>("patients").create((newPatient) => {
        newPatient.givenName = patient.givenName
        newPatient.surname = patient.surname
        newPatient.sex = patient.sex
        newPatient.phone = patient.phone
        newPatient.citizenship = patient.citizenship
        newPatient.photoUrl = patient.photoUrl
        newPatient.camp = patient.camp
        newPatient.hometown = patient.hometown
        newPatient.dateOfBirth = patient.dateOfBirth
        newPatient.additionalData = patient.additionalData
        newPatient.governmentId = patient.governmentId
        newPatient.externalPatientId = patient.externalPatientId
      })

      return pt
    })
  }

  /**
   * Update a patient by id
   * @param {string} id
   * @deprecated
   * @param {PatientModelData} patient
   * @returns {Promise<PatientModel>}
   */
  async updatePatient(id: string, patient: PatientModelData): Promise<PatientModel> {
    try {
      return await database.write(async () => {
        const pt = await database.get<PatientModel>("patients").find(id)
        if (pt) {
          return pt.update((newPatient) => {
            newPatient.givenName = patient.givenName
            newPatient.surname = patient.surname
            newPatient.sex = patient.sex
            newPatient.phone = patient.phone
            newPatient.photoUrl = patient.photoUrl
            newPatient.citizenship = patient.citizenship
            newPatient.camp = patient.camp
            newPatient.hometown = patient.hometown
            newPatient.dateOfBirth = patient.dateOfBirth
            newPatient.additionalData = patient.additionalData
            newPatient.governmentId = patient.governmentId
            newPatient.externalPatientId = patient.externalPatientId
          })
        } else {
          throw new Error("Patient not found")
        }
      })
    } catch (error) {
      console.error(error)
      return Promise.reject(error)
    }
  }

  /**
   * Create a new event in the database, also create a new visit if the visitId is not provided
   * @param {Event} event
   * @param {string | null} visitId
   * @param {string} clinicId
   * @param {string} providerId
   * @param {string} providerName
   * @param {number} checkInTimestamp
   * @param {string | null | undefined} eventId - if defined we are going to update that event
   * @returns {Promise<{eventId: string, visitId: string}>}
   */
  async createEvent(
    event: Omit<EventModel, "id" | "createdAt" | "updatedAt">,
    visitId: string | null,
    clinicId: string,
    providerId: string,
    providerName: string,
    checkInTimestamp: number,
    eventId?: string | null | undefined,
  ): Promise<{ eventId: string; visitId: string }> {

    // console.log({
    //   event: JSON.stringify(event, null, 2),
    //   visitId,
    //   clinicId,
    //   providerId,
    //   providerName,
    //   checkInTimestamp,
    //   eventId,
    // })
    /** If there is an event Id, we are updating an existing event */
    if (eventId && eventId !== "" && visitId && visitId !== "") {
      const res = await database.write(async () => {
        const eventQuery = await database.get<EventModel>("events").find(eventId)
        if (eventQuery) {
          return eventQuery.update((newEvent) => {
            newEvent.formId = event.formId
            newEvent.formData = event.formData
            newEvent.metadata = event.metadata
          })
        } else {
          throw new Error("Event not found")
        }
      })

      return { eventId: res.id, visitId }
    }

    /** If there is no event Id, we are creating a new event */
    return await database.write(async () => {
      let visitQuery: VisitModel | null = null
      // If there is no visitId, we are creating a new visit
      if (!event.visitId || event.visitId === "" || visitId === null) {
        visitQuery = database.get<VisitModel>("visits").prepareCreate((newVisit) => {
          newVisit.patientId = event.patientId
          newVisit.clinicId = clinicId
          newVisit.providerId = providerId
          newVisit.providerName = providerName
          newVisit.checkInTimestamp = isValid(checkInTimestamp)
            ? new Date(checkInTimestamp)
            : new Date()
          newVisit.metadata = event.metadata
        })
      } else {
        try {
          const visit = await database.get<VisitModel>("visits").find(visitId)
          visitQuery = visit.prepareUpdate((visit) => {
            visit.metadata = {
              ...visit.metadata,
              lastEventAddedTimestamp: new Date().toISOString()
            }
          })
        } catch (error) {
          console.error(error)
          Sentry.captureException(error, {
            level: "error",
            extra: {
              visitId,
              eventId,
              event,
            }
          })
        }
      }
      const eventQuery = database.get<EventModel>("events").prepareCreate((newEvent) => {
        newEvent.patientId = event.patientId
        newEvent.formId = event.formId
        newEvent.visitId = visitQuery !== null ? visitQuery.id : event.visitId
        newEvent.eventType = event.eventType
        newEvent.formData = event.formData
        newEvent.metadata = {
          ...event.metadata,
          providerId,
          providerName,
        }
        newEvent.isDeleted = event.isDeleted
      })

      // batch create both of them
      await database.batch(visitQuery !== null ? [visitQuery, eventQuery] : [eventQuery])

      return {
        eventId: eventQuery.id,
        visitId: visitQuery !== null ? visitQuery.id : event.visitId,
      }
    })
  }

  /**
   * Get the providerId and providerName for an event
   * @param {string} eventId
   * @returns {Promise<{providerId: string, providerName: string} | null>}
   */
  async getEventProvider(eventId: string): Promise<{ providerId: string, providerName: string } | null> {
    const event = await database.get<EventModel>("events").find(eventId)
    if (!event) {
      return null
    }
    // check if the event has a providerId and providerName in its metadata
    if (event.metadata && event.metadata.providerId && event.metadata.providerName) {
      return {
        providerId: event.metadata.providerId,
        providerName: event.metadata.providerName,
      }
    }

    // if not, we need to find the visit and get the providerId and providerName from there
    const visit = await database.get<VisitModel>("visits").find(event.visitId)
    if (visit) {
      return {
        providerId: visit.providerId,
        providerName: visit.providerName,
      }
    }
    return null
  }

  /**
   * Delete an event by id
   * @param {string} eventId
   * @returns {Promise<void>}
   */
  async deleteEvent(eventId: string): Promise<void> {
    return await database.write(async () => {
      const event = await database.get<EventModel>("events").find(eventId)
      const deletedEvent = await event.update((event) => {
        event.isDeleted = true
      })
      return await deletedEvent.markAsDeleted()
    })
  }

  /**
   * Delete a visit by id
   * @param {string} visitId
   * @returns {Promise<void>}
   */
  async deleteVisit(visitId: string): Promise<void> {
    return await database.write(async () => {
      // Visits
      const visit = await database.get<VisitModel>("visits").find(visitId)
      const deletedVisit = await visit.prepareUpdate((visit) => {
        visit.isDeleted = true
      })
      const deletedVisitRef = await deletedVisit.prepareMarkAsDeleted()

      // Events
      const events = await database.get<EventModel>("events").query(Q.where("visit_id", visitId)).fetch()
      const deletedEvents = events.map((event) => event.prepareMarkAsDeleted())

      // appointments
      const appointments = await database.get<AppointmentModel>("appointments").query(Q.where("current_visit_id", visitId)).fetch()
      const deletedAppointments = appointments.map((appointment) => appointment.prepareMarkAsDeleted())

      // batch delete them
      return await database.batch([deletedVisitRef, ...deletedEvents, ...deletedAppointments])
    })
  }

  /**
   * Fetch patient report data used in the generation of a downloadable report pdf
   * @param {string} patientId
   * @param {boolean} ignoreEmptyVisits
   * @returns {Promise<{ visit: VisitModel, events: EventModel[] }[]>}
   */
  async fetchPatientReportData(
    patientId: string,
    ignoreEmptyVisits: boolean,
  ): Promise<{ visit: VisitModel; events: EventModel[] }[]> {
    const visits = await database
      .get<VisitModel>("visits")
      .query(Q.and(Q.where("patient_id", patientId), Q.where("is_deleted", false)))
      .fetch()

    const events = await database
      .get<EventModel>("events")
      .query(Q.and(Q.where("patient_id", patientId), Q.where("is_deleted", false)))
      .fetch()

    const results = visits.map((visit) => {
      return {
        visit,
        events: events.filter((ev) => ev.visitId === visit.id),
      }
    })
    if (ignoreEmptyVisits) {
      return results.filter((res) => res.events.length > 0)
    }
    return results
  }

  /**
   * Get the latest event by type
   * @param {string} patientId
   * @param {EventTypes} eventType
   * @returns {Promise<EventModel["formData"] | null>}
   */
  async getLatestPatientEventByType(
    patientId: string,
    eventType: string,
  ): Promise<EventModel["formData"] | null> {
    const results = await database
      .get<EventModel>("events")
      .query(
        Q.and(Q.where("patient_id", patientId), Q.where("event_type", eventType)),
        Q.sortBy("created_at", Q.desc),
        Q.take(1),
      )
      .fetch()

    if (results.length === 0) {
      console.warn("There are no latest events for this type")
    }

    return results[0]?.formData || null
  }

  /**
   * Sync Pull data from the server
   * @param {number} lastPulledAt
   * @param {number} schemaVersion
   * @param {MigrationSyncChanges} migration
   * @param {Headers} headers
   * @returns {Promise<SyncPullResult>}
   */
  async syncPull(
    lastPulledAt: number,
    schemaVersion: number,
    migration: MigrationSyncChanges,
    headers: Headers,
  ): Promise<SyncPullResult> {
    const urlParams = `last_pulled_at=${lastPulledAt}&schema_version=${schemaVersion}&migration=${encodeURIComponent(
      JSON.stringify(migration),
    )}`

    const HH_API = await getHHApiUrl()
    if (!HH_API) {
      throw new Error("HH API URL not found")
    }
    const SYNC_API = `${HH_API}/api/v2/sync`

    const result = await fetch(`${SYNC_API}?${urlParams}`, {
      // Headers include the username and password in base64 encoded string
      headers: headers,
    })

    if (!result.ok) {
      console.error("Error fetching data from the server", { result })
      throw new Error(await result.text())
    }

    const syncPullResult = (await result.json()) as SyncPullResult
    return syncPullResult
  }

  /**
   * Sync Push data to the server
   * @param {number} lastPulledAt
   * @param {SyncDatabaseChangeSet} changes
   * @param {Headers} headers
   * @returns {Promise<void | { experimentalRejectedIds?: SyncRejectedIds | undefined; } | undefined>) | undefined}
   */
  async syncPush(
    lastPulledAt: number,
    changes: SyncDatabaseChangeSet,
    headers: Headers,
  ): Promise<SyncPushResult | undefined> {
    const HH_API = await getHHApiUrl()
    if (!HH_API) {
      throw new Error("HH API URL not found")
    }
    const SYNC_API = `${HH_API}/api/v2/sync`
    const result = await fetch(`${SYNC_API}?last_pulled_at=${lastPulledAt}`, {
      method: "POST",
      headers: headers,
      body: JSON.stringify(changes),
    })

    if (!result.ok) {
      throw new Error(await result.text())
    }

    const syncPushResult = (await result.json()) as SyncPushResult
    return syncPushResult
  }

  /**
   * Create an appointment
   * @param {Appointment} appointment
   * @returns {Promise<{appointmentId: string, visitId: string | undefined}>}
   */
  async createAppointment(appointment: Appointment, provider: Provider): Promise<{ appointmentId: string, visitId: string | undefined }> {
    // Check that the patientid, userId, and clinicid are valid strings (shallow test, not a deep check for a valid uuid)
    if (!appointment.patientId || !appointment.userId || !appointment.clinicId ||
      typeof appointment.patientId !== 'string' || typeof appointment.userId !== 'string' || typeof appointment.clinicId !== 'string' ||
      appointment.patientId.length <= 3 || appointment.userId.length <= 3 || appointment.clinicId.length <= 3) {
      throw new Error("Invalid patientId, userId, or clinicId")
    }


    return await database.write(async () => {
      // If there is no currentVisitId, we need to create a new visit
      let visit: VisitModel | null = null
      let appointmentVisitId: string | null = appointment.currentVisitId
      if (!appointment.currentVisitId) {
        visit = await database.get<VisitModel>("visits").prepareCreate((newVisit) => {
          newVisit.patientId = appointment.patientId
          newVisit.clinicId = appointment.clinicId
          newVisit.providerId = provider.id
          newVisit.providerName = provider.name
          newVisit.checkInTimestamp = new Date()
          newVisit.metadata = {}
        })
        appointmentVisitId = visit.id
      }

      const appointmentQuery = await database.get<AppointmentModel>("appointments").prepareCreate((newAppointment) => {
        newAppointment.currentVisitId = appointmentVisitId
        newAppointment.patientId = appointment.patientId
        newAppointment.providerId = appointment.providerId
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
        patientUpdate = await patient.prepareUpdate((updatedPatient) => {
          updatedPatient.metadata = {
            ...updatedPatient.metadata,
            lastAppointmentTimestamp: appointment.timestamp.toISOString()
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
  async cancelAppointment(appointmentId: string): Promise<void> {
    return await database.write(async () => {
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
  async markAppointmentComplete(appointmentId: string, visitId?: string): Promise<void> {
    return await database.write(async () => {
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
  async updateAppointment(appointmentId: string, appointment: Partial<Appointment>): Promise<void> {
    await database.write(async () => {
      const appointmentRecord = await database.get<AppointmentModel>("appointments").find(appointmentId)
      await appointmentRecord.update((appt) => {
        if (appointment.timestamp !== undefined) appt.timestamp = new Date(appointment.timestamp).getTime()
        if (appointment.duration !== undefined) appt.duration = appointment.duration
        if (appointment.reason !== undefined) appt.reason = appointment.reason
        if (appointment.notes !== undefined) appt.notes = appointment.notes
        if (appointment.status !== undefined) appt.status = appointment.status
        if (appointment.metadata !== undefined) appt.metadata = appointment.metadata
      })
    })
  }

  /**
   * Create a prescription
   * @param {PrescriptionForm} prescription
   * @param {Provider} provider
   * @returns {Promise<{visitId: string | null, prescriptionId: string}>}
   */
  async createPrescription(prescription: PrescriptionForm, provider: Provider): Promise<{ visitId: string | null, prescriptionId: string }> {
    return await database.write(async () => {
      // If there is no visitId, we need to create a new visit
      let visit: VisitModel | null = null
      let visitId: string | null = prescription.visitId
      if (!prescription.visitId) {
        const visitClinicId = prescription.pickupClinicId || provider.clinic_id || undefined
        visit = await database.get<VisitModel>("visits").prepareCreate((newVisit) => {
          newVisit.patientId = prescription.patientId
          if (visitClinicId !== undefined) newVisit.clinicId = visitClinicId
          newVisit.providerId = provider.id
          newVisit.providerName = provider.name
          newVisit.checkInTimestamp = new Date()
          newVisit.metadata = {}
        })
        visitId = visit.id
      }

      const prescriptionQuery = await database.get<PrescriptionModel>("prescriptions").prepareCreate((newPrescription) => {
        newPrescription.patientId = prescription.patientId
        newPrescription.providerId = provider.id
        newPrescription.pickupClinicId = prescription.pickupClinicId || null
        newPrescription.visitId = visitId || null
        newPrescription.priority = prescription.priority
        newPrescription.status = prescription.status
        newPrescription.filledBy = prescription.filledBy
        newPrescription.expirationDate = prescription.expirationDate
        newPrescription.prescribedAt = prescription.prescribedAt
        newPrescription.filledAt = prescription.filledAt
        newPrescription.notes = prescription.notes
        // newPrescription.items = JSON.stringify(prescription.items)
        newPrescription.items = prescription.items
        newPrescription.metadata = {
          ...(prescription.metadata || {}),
          providerId: provider.id,
          providerName: provider.name,
        }
      })

      await database.batch([visit, prescriptionQuery].filter(Boolean) as Model[])
      return {
        visitId,
        prescriptionId: prescriptionQuery.id,
      }
    })
  }

  /**
   * Update a prescription
   * @param {string} prescriptionId
   * @param {Partial<PrescriptionForm>} prescription
   * @param {Provider} provider
   * @returns {Promise<{visitId: string | null, prescriptionId: string}>}
   */
  async updatePrescription(
    prescriptionId: string,
    prescription: Partial<PrescriptionForm>,
    provider: Provider
  ): Promise<{ visitId: string | null; prescriptionId: string }> {
    return await database.write(async () => {
      const prescriptionRecord = await database.get<PrescriptionModel>("prescriptions").find(prescriptionId);

      const updatedPrescription = await prescriptionRecord.prepareUpdate((updatedPrescription) => {
        // The commented fields should be immutable after creation. Left here for reference.
        // updatedPrescription.patientId = prescription.patientId
        // updatedPrescription.providerId = provider.id
        // updatedPrescription.clinicId = prescription.clinicId
        // updatedPrescription.visitId = prescription.visitId || null
        // Update only the fields that are present in the partial prescription object
        if (prescription.pickupClinicId !== undefined) updatedPrescription.pickupClinicId = prescription.pickupClinicId;
        if (prescription.priority !== undefined) updatedPrescription.priority = prescription.priority;
        if (prescription.status !== undefined) updatedPrescription.status = prescription.status;
        if (prescription.expirationDate !== undefined) updatedPrescription.expirationDate = prescription.expirationDate;
        if (prescription.prescribedAt !== undefined) updatedPrescription.prescribedAt = prescription.prescribedAt;
        if (prescription.filledAt !== undefined) updatedPrescription.filledAt = prescription.filledAt;
        if (prescription.notes !== undefined) updatedPrescription.notes = prescription.notes;
        if (prescription.items !== undefined) updatedPrescription.items = prescription.items;

        // TODO: Determine how to handle the filledBy field
        // updatedPrescription.filledBy = provider.id;
        updatedPrescription.metadata = {
          ...(prescription.metadata || {}),
          lastUpdatedBy: provider.id,
          lastUpdatedByName: provider.name,
        }
      });

      // Prepare update for the visit
      let visitUpdate: VisitModel | null = null
      try {
        if (updatedPrescription.visitId) {
          const visitRecord = await database.get<VisitModel>("visits").find(updatedPrescription.visitId);
          if (visitRecord) {
            visitUpdate = await visitRecord.prepareUpdate((updatedVisit) => {
              updatedVisit.metadata = Object.assign({}, updatedVisit.metadata, {
                lastUpdatedBy: provider.id,
                lastUpdatedByName: provider.name,
              });
            });
          }
        }
      } catch (error) {
        console.error(error)
        Sentry.captureException(error, {
          level: "error",
          extra: {
            prescriptionId,
            prescription,
            visitId: updatedPrescription.visitId,
          }
        })
      }

      // Batch update both prescription and visit (if applicable)
      const updateBatch = [updatedPrescription, visitUpdate].filter(Boolean) as Model[];
      await database.batch(updateBatch);

      return {
        visitId: visitUpdate?.id || null,
        prescriptionId: updatedPrescription.id,
      }
    })
  }




  /**
   * Get a clinic by id
   * @param {string} clinicId
   * @returns {Promise<ClinicModel>}
   */
  async getClinic(clinicId: string): Promise<ClinicModel> {
    const clinic = await database.get<ClinicModel>("clinics").find(clinicId)
    return clinic
  }

  /**
   * Send an email using the local email client
   * @param {string} to
   * @param {string} subject
   * @param {string} body
   * @param {object} options
   * @returns {Promise<void>}
   */

  async sendEmail(to: string, subject: string, body: string, options: { cc?: string, bcc?: string } = {}) {
    const { cc, bcc } = options;

    let url = `mailto:${to}`;

    // Create email link query using raw JavaScript
    const queryParams = new URLSearchParams({
      subject: subject,
      body: body,
      ...(cc && { cc }),
      ...(bcc && { bcc })
    });
    const query = queryParams.toString();

    if (query.length) {
      url += `?${query}`;
    }

    // check if we can use this link
    const canOpen = await Linking.canOpenURL(url);

    if (!canOpen) {
      throw new Error('Provided URL can not be handled');
    }

    return Linking.openURL(url);
  }


  /**
   * Manually push local data to server, regardless of sync status
   * @param {Date} startDate
   * @param {Date} endDate
   * @returns {Promise<void>}
   */
  // async manualSyncPush(startDate: Date, endDate: Date): Promise<void> {
  //   // construct the changeset for all the local collections
  //   const tables = schema.tables;
  //   keys(tables).map(key => {
  //     database.get(key).query(
  //       // support filter by date range ??
  //       Q.where("is_del")
  //     ).fetch();
  //     database.adapter.getDeletedRecords(key);
  //     database.adapter.count
  //   })
  // }
}

/**
Given a PatientData input, and a field name, return 
*/

// ✅ register patient
// ✅ update patient by id
// ❌ sync pull data
// ❌ sync push data
// ✅ create new visit
// ❌ delete a visit
// ✅ create a new event
// ❌ update event formData (metadata)
// ❌ Get latest event by type
// ❌ delete an event
// ❌ get all events of a patient by type
// ❌ get clinic

// Singleton instance of the API for convenience
export const api = new Api()
