import * as Sentry from "@sentry/react-native"
import { Option } from "effect"
import { upperFirst } from "es-toolkit/compat"

import database from "@/db"
import EventModel from "@/db/model/Event"
import VisitModel from "@/db/model/Visit"

import ICDEntry from "./ICDEntry"
import { isValid } from "date-fns"

namespace Event {
  export type FormDataItem =
    | {
        inputType: string
        fieldType: "medicine" | string
        name: string
        value: string | number | Date | any[]
        fieldId: string
      }
    | {
        inputType: string
        fieldType: "diagnosis"
        name: string
        value: ICDEntry.T[]
        fieldId: string
      }
  export type T = {
    id: string
    patientId: string
    visitId: string
    eventType: string
    formId: string
    formData: FormDataItem[]
    metadata: Record<string, any>
    isDeleted: boolean
    deletedAt: Option.Option<Date>
    recordedByUserId: string
    createdAt: Date
    updatedAt: Date
  }

  export type DBEvent = EventModel

  /** Default empty Event Item */
  export const empty: T = {
    id: "",
    patientId: "",
    visitId: "",
    eventType: "",
    formId: "",
    formData: [],
    metadata: {},
    isDeleted: false,
    deletedAt: Option.none(),
    recordedByUserId: "",
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  /**
   * Get the display for the event, based on the event type, for the formatted dynamic fields of formData
   * THIS IS ONLY USED FOR PRINTING OUT A HTML BASED REPORT
   * @param {Event} event - The event object
   * @param {string} language - The language code
   * @returns {JSX.Element} - The JSX element to display
   */
  export const getHtmlEventDisplay = (event: Event.T, language: string): string => {
    const { eventType, formData } = event

    let display = ""

    formData.forEach((field, idx) => {
      const { fieldId, fieldType, inputType, name, value } = field
      // console.log({ fieldId, fieldType, inputType, name, value })
      // const displayValue = inputType === "select" ? translate(value, language) : value

      display += `<div style="margin: 5px 0px;">`
      display += `<span style="text-decoration: underline;">${name}:</span>`

      if (fieldType === "diagnosis") {
        if (Array.isArray(value)) {
          value?.forEach((val) => {
            display += `<div>${ICDEntry.ICD10RecordLabel(val, language)}</div>`
          })
        }
      } else if (inputType === "input-group" && fieldType === "medicine") {
        if (Array.isArray(value)) {
          value.forEach((med) => {
            display += `<div>${String(med.dose || "")} ${med.doseUnits || ""}</div>`
            display += `<div>${upperFirst(med?.route || "")} ${upperFirst(med?.form || "")}: ${String(
              med?.frequency || "",
            )}</div>`
          })
        }
      } else if (fieldType !== "diagnosis" && inputType !== "input-group") {
        display += `<div>${value}</div>`
      }

      display += `</div>`
    })

    return display
  }

  export namespace DB {
    export type T = EventModel

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
    export const create = async (
      event: Omit<EventModel, "id" | "createdAt" | "updatedAt">,
      visitId: string | null,
      clinicId: string,
      providerId: string,
      providerName: string,
      checkInTimestamp: number,
      eventId?: string | null | undefined,
    ): Promise<{ eventId: string; visitId: string }> => {
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
      // TODO: update the visit to show the ne updated at time.
      if (eventId && eventId !== "" && visitId && visitId !== "") {
        const res = await database.write(async () => {
          const eventQuery = await database.get<EventModel>("events").find(eventId)
          if (eventQuery) {
            return eventQuery.update((newEvent) => {
              newEvent.formId = event.formId
              newEvent.formData = event.formData
              newEvent.metadata = event.metadata
              if (!event.recordedByUserId || event.recordedByUserId === "") {
                newEvent.recordedByUserId = providerId
              }
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
                lastEventAddedTimestamp: new Date().toISOString(),
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
              },
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
          newEvent.recordedByUserId = providerId
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
    export const getProvider = async (
      eventId: string,
    ): Promise<{ providerId: string; providerName: string } | null> => {
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
    export const softDelete = async (eventId: string): Promise<void> => {
      return await database.write(async () => {
        const event = await database.get<EventModel>("events").find(eventId)
        const deletedEvent = await event.update((event) => {
          event.isDeleted = true
        })
        return await deletedEvent.markAsDeleted()
      })
    }
  }
}

export default Event
