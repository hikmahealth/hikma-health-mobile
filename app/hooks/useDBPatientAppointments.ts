import { useEffect, useState } from "react"
import { Q } from "@nozbe/watermelondb"

import database from "@/db"
import AppointmentModel from "@/db/model/Appointment"
import Appointment from "@/models/Appointment"

/**
 * Given a patient ID, fetches all appointments for that patient from the database.
 * @param patientId - The ID of the patient to fetch appointments for.
 * @returns An array of appointments for the given patient.
 */
export const usePatientAppointments = (patientId: string) => {
  const [appointments, setAppointments] = useState<Appointment.DBAppointment[]>([])

  useEffect(() => {
    if (!patientId) {
      setAppointments([])
      return
    }

    const subscription = database
      .get<Appointment.DBAppointment>("appointments")
      .query(Q.where("patient_id", patientId))
      .observe()
      .subscribe((appointments) => {
        setAppointments(appointments)
      })

    return () => {
      subscription.unsubscribe()
      setAppointments([])
    }
  }, [patientId])

  return { appointments }
}
