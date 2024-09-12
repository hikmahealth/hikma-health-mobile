import { Q } from "@nozbe/watermelondb"
import { useCallback, useEffect, useMemo, useState } from "react"
import database from "../db"
import AppointmentModel from "app/db/model/Appointment"
import { AppointmentStatus } from "app/types"
import { startOfDay } from "date-fns"

type AppointmentsByDate = {
    date: Date
    appointments: AppointmentModel[]
}

// TODO: abstract the query string building into a separate function

/**
 * Get a list of appointments within a date range, sorted by start date
 * Also takes in an optional clinicId to filter by clinic, if no clinicId is provided, all clinic appointments are returned
 * Also takes in an optional filter by status, if no status is provided, all appointments are returned
 * @param {Date} startDate
 * @param {Date} endDate
 * @param {string} clinicId (optional)
 * @param {AppointmentStatus | "all"} status (optional)
 * @param {number} limit (optional)
 * @returns {{appointments: AppointmentsByDate[], isLoading: boolean, refresh: () => void}}
 */
export function useDBAppointmentsList(startDate: Date, endDate: Date, clinicId?: string, status?: AppointmentStatus | "all", limit = 25): {
    appointments: AppointmentsByDate[]
    isLoading: boolean
    refresh: () => void
} {
    const [appointments, setAppointments] = useState<AppointmentModel[]>([])
    const [isLoading, setIsLoading] = useState(false)

    const fetchAppointments = useCallback(async () => {
        if (!startDate || !endDate) {
            setAppointments([])
            return
        }
        setIsLoading(true)
        try {
            const appointmentsCollection = database.get<AppointmentModel>("appointments")
            const fetchedAppointments = await appointmentsCollection.query(
                ...[
                    // Q.where("timestamp", Q.between(startDate.getTime(), endDate.getTime())),
                    // Q.where("timestamp", Q.gte(startDate.getTime())),
                    // Q.where("timestamp", Q.lte(endDate.getTime())),
                    clinicId && Q.where("clinic_id", clinicId),
                    status && status !== "all" && Q.where("status", status),
                    Q.sortBy("timestamp", Q.asc),
                    Q.sortBy("created_at", Q.asc),
                    limit ? Q.take(limit) : undefined,
                ].filter(Boolean)
            ).fetch()

            // Fetch related patients (assuming there's a patients collection)
            const patientIds = [...new Set(fetchedAppointments.map(a => a.patientId))]
            await database.get("patients").query(Q.where("id", Q.oneOf(patientIds))).fetch()

            setAppointments(fetchedAppointments)
        } catch (error) {
            console.error("Error fetching appointments:", error)
        } finally {
            setIsLoading(false)
        }
    }, [startDate, endDate, clinicId, status, limit])

    useEffect(() => {
        // if startDate or endDate are not provided, return an empty array
        if (!startDate || !endDate) {
            setAppointments([])
            return
        }
        fetchAppointments();

        // FIXME: add support for incremental loading ...
        // Set up subscription for real-time updates
        let sub = database
            .get<AppointmentModel>("appointments")
            .query(
                ...[
                    Q.where("timestamp", Q.between(startDate.getTime(), endDate.getTime())),
                    clinicId && Q.where("clinic_id", clinicId),
                    status && status !== "all" && Q.where("status", status),
                    Q.sortBy("timestamp", Q.asc),
                    Q.sortBy("created_at", Q.asc),
                    limit ? Q.take(limit) : undefined,
                ].filter(Boolean),
            )
            .observeWithColumns(["timestamp", "status", "patient_id", "provider_id", "clinic_id", "created_at", "updated_at", "is_deleted"])
            .subscribe((events) => {
                setAppointments(events)
            })
        return () => {
            return sub?.unsubscribe()
        }
    }, [fetchAppointments])


    const appointmentsByDate = useMemo(() => {
        return appointments.reduce((prev, appointment) => {
            const date = startOfDay(appointment.timestamp).getTime() // Use timestamp for comparison
            const existingIndex = prev.findIndex(item => item.date.getTime() === date)

            if (existingIndex !== -1) {
                return [
                    ...prev.slice(0, existingIndex),
                    {
                        ...prev[existingIndex],
                        appointments: [...prev[existingIndex].appointments, appointment]
                    },
                    ...prev.slice(existingIndex + 1)
                ]
            } else {
                return [...prev, { date: new Date(date), appointments: [appointment] }]
            }
        }, [] as AppointmentsByDate[])
    }, [appointments])

    const refresh = useCallback(async () => {
        await fetchAppointments()
    }, [fetchAppointments])



    return {
        appointments: appointmentsByDate, isLoading, refresh
    }
}
