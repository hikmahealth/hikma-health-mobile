import { Q } from "@nozbe/watermelondb"
import { useEffect, useState } from "react"
import database from "../db"
import EventModel from "../db/model/Event"


/**
 * Get all events for a given form, sorted by created_at
 * @param {string} formId
 * @param {string} patientId
 * @returns {EventModel[]}
 */
export function useDBFormEvents(formId: string, patientId: string): EventModel[] {
    const [events, setEvents] = useState<EventModel[]>([])

    useEffect(() => {
        let sub = database.get<EventModel>("events").query(
            Q.where("form_id", formId),
            Q.where("patient_id", patientId),
            // sort by created at
            Q.sortBy("created_at", Q.desc),
        ).observe().subscribe(events => {
            setEvents(events)
        })
        return () => {
            return sub?.unsubscribe()
        }
    }, [formId])

    return events
}
