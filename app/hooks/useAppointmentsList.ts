import { Q } from "@nozbe/watermelondb"
import { useCallback, useEffect, useMemo, useState } from "react"
import database from "../db"
import AppointmentModel from "../db/model/Appointment"
import { AppointmentStatus } from "../types"
import { startOfDay } from "date-fns"

type AppointmentsByDate = {
    date: Date
    appointments: AppointmentModel[]
}

/**
 * Builds a query for appointments based on the provided parameters
 * @param startDate 
 * @param endDate 
 * @param clinicIds 
 * @param status 
 * @param limit 
 * @returns 
 */
const buildAppointmentsQuery = (startDate: Date, endDate: Date, clinicIds?: string[], status?: AppointmentStatus | "all", limit?: number) => [
    Q.where("timestamp", Q.between(startDate.getTime(), endDate.getTime())),
    clinicIds && Q.where("clinic_id", Q.oneOf(clinicIds)),
    status && status !== "all" && Q.where("status", status),
    Q.sortBy("timestamp", Q.asc),
    Q.sortBy("created_at", Q.asc),
    limit ? Q.take(limit) : undefined,
].filter(Boolean)

/**
 * Get a list of appointments within a date range, sorted by start date
 * Also takes in an optional clinicId to filter by clinic, if no clinicId is provided, all clinic appointments are returned
 * Also takes in an optional filter by status, if no status is provided, all appointments are returned
 * @param {Date} startDate
 * @param {Date} endDate
 * @param {string[]} clinicIds (optional)
 * @param {AppointmentStatus | "all"} status (optional)
 * @param {number} pageSize (optional)
 * @returns {{appointments: AppointmentsByDate[], isLoading: boolean, refresh: () => void, loadMore: () => void, appointmentsCount: number, loadedAppointmentsCount: number}}
 */
export function useDBAppointmentsList(startDate: Date, endDate: Date, clinicIds: string[] = [], status?: AppointmentStatus | "all", pageSize = 200): {
    appointments: AppointmentsByDate[]
    isLoading: boolean
    refresh: () => void
    loadMore: () => void
    appointmentsCount: number
    loadedAppointmentsCount: number
} {
    const [appointments, setAppointments] = useState<AppointmentModel[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [page, setPage] = useState(1)
    const [totalAppointmentsCount, setTotalAppointmentsCount] = useState(0)


    const fetchAppointments = useCallback(async () => {
        if (!startDate || !endDate) {
            setAppointments([])
            return
        }

        setIsLoading(true)
        try {
            const appointmentsCollection = database.get<AppointmentModel>("appointments")
            const fetchedAppointments = await appointmentsCollection.query(
                ...buildAppointmentsQuery(startDate, endDate, clinicIds, status, pageSize * page)
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
    }, [startDate, endDate, clinicIds, status, pageSize, page])

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
            .query(...buildAppointmentsQuery(startDate, endDate, clinicIds, status, pageSize * page))
            .observeWithColumns(["timestamp", "status", "patient_id", "provider_id", "clinic_id", "created_at", "updated_at", "is_deleted"])
            .subscribe((events) => {
                setAppointments(events)
            })
        return () => {
            return sub?.unsubscribe()
        }
    }, [fetchAppointments, page])

    /**
     * Subscribe to the total count of appointments
     */
    useEffect(() => {
        const sub = database
            .get<AppointmentModel>("appointments")
            .query(...buildAppointmentsQuery(startDate, endDate, clinicIds, status))
            .observeCount()
            .subscribe((count) => {
                setTotalAppointmentsCount(count)
            })
        return () => {
            return sub?.unsubscribe()
        }
    }, [startDate, endDate, clinicIds, status])


    /**
     * Groups appointments by date.
     * 
     * @returns {AppointmentsByDate[]} An array of objects, each containing a date and an array of appointments for that date.
     * 
     * It reduces the appointments array into a new structure where appointments are grouped by their date.
     * Each group contains a date object and an array of appointments for that date.
     */
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
    }, [appointments, page])

    const refresh = useCallback(async () => {
        await fetchAppointments()
    }, [fetchAppointments, page])

    /**
     * Incrementally load more appointments
     */
    const loadMore = () => {
        if (appointments.length < totalAppointmentsCount) {
            setPage(page => page + 1)
        }
    }
    return {
        appointments: appointmentsByDate, isLoading, refresh, loadMore, appointmentsCount: totalAppointmentsCount, loadedAppointmentsCount: appointments.length
    }
}
