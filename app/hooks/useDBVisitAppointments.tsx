import { Q } from "@nozbe/watermelondb"
import { useEffect, useState } from "react"
import database from "../db"
import AppointmentModel from "app/db/model/Appointment"


/**
 * Get all appointments for a visit, sorted by created_at
 * @param {string} visitId
 * @returns {EventModel[]}
 */
export function useDBVisitAppointments(visitId: string): AppointmentModel[] {
    const [appointments, setAppointments] = useState<AppointmentModel[]>([])

    useEffect(() => {
        if (typeof visitId !== "string" || visitId.length === 0) {
            setAppointments([])
            return
        }
        let sub = database
            .get<AppointmentModel>("appointments")
            .query(
                Q.where("current_visit_id", visitId),
                // sort by created at
                Q.sortBy("created_at", Q.desc),
            )
            .observe()
            .subscribe((appointments) => {
                setAppointments(appointments)
            })
        return () => {
            return sub?.unsubscribe()
        }
    }, [visitId])

    return appointments
}
