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
import PatientModel, { PatientModelData } from "app/db/model/Patient"
import { database } from "app/db"
import { SyncDatabaseChangeSet, SyncPullResult, SyncPushResult } from "@nozbe/watermelondb/sync"
import { MigrationSyncChanges } from "@nozbe/watermelondb/Schema/migrations/getSyncChanges"
import EventModel from "app/db/model/Event"
import VisitModel from "app/db/model/Visit"
import { isValid } from "date-fns"
import { Q } from "@nozbe/watermelondb"
import { getHHApiUrl } from "app/utils/storage"

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
   * @param {PatientModelData} patient
   * @returns {Promise<PatientModel>}
   */
  async registerPatient(patient: PatientModelData): Promise<PatientModel> {
    return await database.write(async () => {
      console.log("Inserting data: ", patient.additionalData)
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
      })

      return pt
    })
  }

  /**
   * Update a patient by id
   * @param {string} id
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
    eventId?: string | null | undefined
  ): Promise<{ eventId: string, visitId: string }> {

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
      let visitQuery = null;
      if (!event.visitId || event.visitId === "" || visitId === null) {
        visitQuery = await database.get<VisitModel>("visits").prepareCreate((newVisit) => {
          newVisit.patientId = event.patientId
          newVisit.clinicId = clinicId
          newVisit.providerId = providerId
          newVisit.providerName = providerName
          newVisit.checkInTimestamp = isValid(checkInTimestamp) ? new Date(checkInTimestamp) : new Date()
          newVisit.metadata = event.metadata
        })
      }
      const eventQuery = await database.get<EventModel>("events").prepareCreate((newEvent) => {
        newEvent.patientId = event.patientId
        newEvent.formId = event.formId
        newEvent.visitId = visitQuery !== null ? visitQuery.id : event.visitId
        newEvent.eventType = event.eventType
        newEvent.formData = event.formData
        newEvent.metadata = event.metadata
        newEvent.isDeleted = event.isDeleted
      })

      // batch create both of them
      await database.batch(
        visitQuery !== null ? [visitQuery, eventQuery] : [eventQuery]
      )

      return {
        eventId: eventQuery.id,
        visitId: visitQuery !== null ? visitQuery.id : event.visitId
      }
    })
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
      const visit = await database.get<VisitModel>("visits").find(visitId)
      const deletedVisit = await visit.update((visit) => {
        visit.isDeleted = true
      })
      return await deletedVisit.markAsDeleted()
    })
  }

  /**
   * Fetch patient report data used in the generation of a downloadable report pdf
   * @param {string} patientId
   * @param {boolean} ignoreEmptyVisits
   * @returns {Promise<{ visit: VisitModel, events: EventModel[] }[]>}
   */
  async fetchPatientReportData(patientId: string, ignoreEmptyVisits: boolean): Promise<{ visit: VisitModel, events: EventModel[] }[]> {
    const visits = await database
      .get<VisitModel>("visits")
      .query(Q.and(Q.where("patient_id", patientId), Q.where("is_deleted", false)))
      .fetch()

    const events = await database.get<EventModel>("events")
      .query(Q.and(Q.where("patient_id", patientId), Q.where("is_deleted", false)))
      .fetch()

    const results = visits.map(visit => {
      return {
        visit,
        events: events.filter(ev => ev.visitId === visit.id)
      }
    })
    if (ignoreEmptyVisits) {
      return results.filter(res => res.events.length > 0)
    }
    return results;
  }


  /**
   * Get the latest event by type
   * @param {string} patientId
   * @param {EventTypes} eventType
   * @returns {Promise<EventModel["formData"] | null>}
   */
  async getLatestPatientEventByType(patientId: string, eventType: string): Promise<EventModel["formData"] | null> {
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
  async syncPull(lastPulledAt: number, schemaVersion: number, migration: MigrationSyncChanges, headers: Headers): Promise<SyncPullResult> {
    const urlParams = `last_pulled_at=${lastPulledAt}&schema_version=${schemaVersion}&migration=${encodeURIComponent(
      JSON.stringify(migration),
    )}`

    const HH_API = await getHHApiUrl();
    if (!HH_API) {
      throw new Error("HH API URL not found")
    }
    const SYNC_API = `${HH_API}/api/v2/sync`

    const result = await fetch(`${SYNC_API}?${urlParams}`, {
      // Headers include the username and password in base64 encoded string
      headers: headers
    });

    if (!result.ok) {
      console.error("Error fetching data from the server", { result })
      throw new Error(await result.text())
    }

    const syncPullResult = await result.json() as SyncPullResult
    return syncPullResult
  }


  /**
   * Sync Push data to the server
   * @param {number} lastPulledAt
   * @param {SyncDatabaseChangeSet} changes
   * @param {Headers} headers
   * @returns {Promise<void | { experimentalRejectedIds?: SyncRejectedIds | undefined; } | undefined>) | undefined}
   */
  async syncPush(lastPulledAt: number, changes: SyncDatabaseChangeSet, headers: Headers): Promise<SyncPushResult | undefined> {
    const HH_API = await getHHApiUrl();
    if (!HH_API) {
      throw new Error("HH API URL not found")
    }
    const SYNC_API = `${HH_API}/api/v2/sync`
    const result = await fetch(`${SYNC_API}?last_pulled_at=${lastPulledAt}`, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(changes)
    });

    if (!result.ok) {
      throw new Error(await result.text())
    }

    const syncPushResult = await result.json() as SyncPushResult
    return syncPushResult;
  }
}

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
