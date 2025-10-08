import { useState, useEffect } from "react"

import database from "@/db"
import Appointment from "@/models/Appointment"
import Clinic from "@/models/Clinic"
import Patient from "@/models/Patient"

/**
 * Fetches an appointment from the database given its ID.
 * @param appointmentId The ID of the appointment to fetch.
 * @returns The appointment object.
 */
export const useAppointment = (appointmentId: string) => {
  const [appointment, setAppointment] = useState<Appointment.DBAppointment | null>(null)
  const [clinic, setClinic] = useState<Clinic.DBClinic | null>(null)
  const [patient, setPatient] = useState<Patient.DBPatient | null>(null)
  const [isLoadingAppointment, setIsLoadingAppointment] = useState(false)
  const [isLoadingPatient, setIsLoadingPatient] = useState(false)
  const [isLoadingClinic, setIsLoadingClinic] = useState(false)

  const resetPatient = () => {
    setPatient(null)
    setIsLoadingPatient(false)
  }

  const resetClinic = () => {
    setClinic(null)
    setIsLoadingClinic(false)
  }

  useEffect(() => {
    if (!appointmentId || appointmentId === "") {
      setAppointment(null)
      return
    }

    setIsLoadingAppointment(true)
    try {
      database
        .get<Appointment.DBAppointment>("appointments")
        .findAndObserve(appointmentId)
        .subscribe((apt) => {
          const { getPatient, getClinic } = apt
          setAppointment(apt)
          console.log("🎉 Change happened to appointment")
          getPatient
            .then((res) => {
              setPatient(res?.[0])
              setIsLoadingPatient(false)
            })
            .catch(resetPatient)
          getClinic
            .then((res) => {
              setClinic(res?.[0])
              setIsLoadingClinic(false)
            })
            .catch(resetClinic)
        })
    } catch (error) {
      console.error(error)
      setAppointment(null)
      setClinic(null)
      setPatient(null)
    } finally {
      setIsLoadingAppointment(false)
    }

    return () => {
      setAppointment(null)
      setIsLoadingAppointment(false)
    }
  }, [appointmentId])

  const isLoading = isLoadingAppointment || isLoadingPatient || isLoadingClinic

  return { appointment, isLoading, clinic, patient }
}
