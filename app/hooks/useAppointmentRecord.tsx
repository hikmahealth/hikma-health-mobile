import { Q } from "@nozbe/watermelondb"
import { useIsFocused } from "@react-navigation/native"
import database from "app/db"
import AppointmentModel from "app/db/model/Appointment"
import PatientModel from "app/db/model/Patient"
import { useEffect, useState } from "react"


/**
 * Returns information about an appointment and the patient that the appointment is for
 * @param appointmentId 
 * @param patientId (optional)
 * @returns {appointment: AppointmentModel | null, patient: PatientModel | null, isLoading: boolean}
 */
export const useAppointmentRecord = (appointmentId: string, patientId?: string): {
    appointment: AppointmentModel | null,
    patient: PatientModel | null,
    isLoading: boolean,
    refresh: () => void
} => {
    const isFocused = useIsFocused()
    const [appointment, setAppointment] = useState<AppointmentModel | null>(null)
    const [patient, setPatient] = useState<PatientModel | null>(null)
    const [isLoadingAppointment, setIsLoadingAppointment] = useState(true)
    const [isLoadingPatient, setIsLoadingPatient] = useState(true)

    const [refreshTrigger, setRefreshTrigger] = useState(0)

    const refresh = () => {
        setRefreshTrigger(prev => prev + 1)
        setIsLoadingAppointment(true)
        setIsLoadingPatient(true)
    }

    useEffect(() => {
        let subscription: any;
        if (isFocused) {
            subscription = database.get<AppointmentModel>("appointments").query(
                Q.where("id", appointmentId)
            ).observe().subscribe((results) => {
                if (results.length > 1) {
                    console.warn("There are multiple appointments with the same id. This could be an error.")
                }
                const res = results[0]
                setAppointment(res)
                setIsLoadingAppointment(false)
            })
        }

        return () => subscription?.unsubscribe()
    }, [appointmentId, refreshTrigger, isFocused])


    useEffect(() => {
        const fetchPatient = (id: string) => {
            database.get<PatientModel>("patients").find(id).then(patient => {
                setPatient(patient)
            }).catch(error => {
                console.error("Error fetching patient:", error)
            }).finally(() => {
                setIsLoadingPatient(false)
            })
        }

        if (isFocused) {
            if (patientId) {
                fetchPatient(patientId)
            } else if (appointment) {
                fetchPatient(appointment.patientId)
            } else {
                setPatient(null)
                setIsLoadingPatient(false)
            }
        }
    }, [patientId, appointment, refreshTrigger, isFocused])

    return { appointment, patient, isLoading: isLoadingAppointment || isLoadingPatient, refresh }
}