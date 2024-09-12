import { Q } from "@nozbe/watermelondb"
import { useEffect, useState } from "react"
import database from "../db"
import AppointmentModel from "app/db/model/Appointment"
import { isValid } from "date-fns"


/**
 * Get all appointments for a patient, sorted by created_at
 * @param {string} patientId
 * @param {Date} date - start date for the appointments to fetch
 * @param {number} limit - Optional limit for the number of appointments to return
 * @returns {AppointmentModel[]}
 */
export function useDBPatientAppointments(patientId: string, date: Date, limit?: number): AppointmentModel[] {
    const [appointments, setAppointments] = useState<AppointmentModel[]>([])

    useEffect(() => {
        if (typeof patientId !== "string" || patientId.length === 0) {
            setAppointments([])
            return
        }

        console.log(isValid(date), date)
        let sub = database
            .get<AppointmentModel>("appointments")
            .query(
                ...[Q.where("patient_id", patientId),
                isValid(date) ? Q.where("timestamp", Q.gte(new Date(date).getTime())) : null,
                // sort by created at
                Q.where("status", "pending"),
                Q.sortBy("created_at", Q.desc),
                limit ? Q.take(limit) : null].filter(Boolean)
            )
            .observe()
            .subscribe((appointments) => {
                setAppointments(appointments)
            })
        return () => {
            return sub?.unsubscribe()
        }
    }, [patientId])

    return appointments
}
