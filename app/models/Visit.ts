import { Q } from "@nozbe/watermelondb"
import { Option } from "effect"

import database from "@/db"
import VisitModel from "@/db/model/Visit"

import Event from "./Event"

namespace Visit {
  export type Metadata = {}
  export type T = {
    id: string
    patientId: string
    clinicId: string
    providerId: string
    providerName: string
    checkInTimestamp: Date
    isDeleted: boolean
    deletedAt: Option.Option<Date>
    metadata: Option.Option<Metadata>
    createdAt: number | Date
    updatedAt: number | Date
  }

  /** Default empty Visit Item */
  export const empty: T = {
    id: "",
    patientId: "",
    clinicId: "",
    providerId: "",
    providerName: "",
    checkInTimestamp: new Date(),
    isDeleted: false,
    deletedAt: Option.none(),
    metadata: Option.none(),
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  export type DBVisit = VisitModel
  export namespace DB {
    export type T = VisitModel

    /**
     * Subscribe to all the events of a visit
     * @param {string} visitId
     * @param {(events: Event.DB.T[]) => void} callback Function called when events data updates
     * @returns {{unsubscribe: () => void}} Object containing unsubscribe function
     */
    export function subscribeToEvents(
      visitId: string,
      callback: (events: Event.DB.T[]) => void,
    ): { unsubscribe: () => void } {
      const subscription = database
        .get<Event.DB.T>("events")
        .query(Q.where("visit_id", visitId))
        .observe()
        .subscribe((events) => {
          callback(events)
        })

      return {
        unsubscribe: () => subscription.unsubscribe(),
      }
    }
  }
}

export default Visit
