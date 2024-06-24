import { Q } from "@nozbe/watermelondb"
import { useEffect, useState } from "react"
import database from "../db"
import EventModel from "../db/model/Event"

/**
 * Get all events for a visit, sorted by created_at
 * @param {string} visitId
 * @param {string} patientId
 * @returns {EventModel[]}
 */
export function useDBVisitEvents(visitId: string, patientId: string): EventModel[] {
  const [events, setEvents] = useState<EventModel[]>([])

  useEffect(() => {
    if (typeof visitId !== "string" || visitId.length === 0) {
      setEvents([])
      return
    }
    // FIXME: add support for incremental loading ...
    let sub = database
      .get<EventModel>("events")
      .query(
        Q.where("visit_id", visitId),
        // Q.where("patient_id", patientId),
        // sort by created at
        Q.sortBy("created_at", Q.desc),
      )
      .observe()
      .subscribe((events) => {
        setEvents(events)
      })
    return () => {
      return sub?.unsubscribe()
    }
  }, [visitId])

  return events
}
