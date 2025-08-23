import { useState, useEffect } from "react"
import { Option } from "effect"

import Patient from "@/models/Patient"

import database from "../db"

/**
 * Patient details hook that fetches a patient by their ID from the local database
 * @param patientId - The patient ID
 * @param defaultPatient - the default patient model to return while loading
 * @returns {{patient: Option.Option<Patient.T>, isLoading: boolean}} - The patient or undefined if not found
 */
export function usePatientRecord(
  patientId: string,
  defaultPatient?: Patient.T,
): {
  patient: Option.Option<Patient.DBPatient>
  isLoading: boolean
} {
  const [patient, setPatient] = useState<Option.Option<Patient.DBPatient>>(
    Option.fromNullable(defaultPatient ? (defaultPatient as unknown as Patient.DBPatient) : null),
  )
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    setIsLoading(true)
    const sub = Patient.DB.subscribe(patientId, (dbPatient, isLoading) => {
      setPatient(dbPatient)
      setIsLoading(isLoading)
    })
    return () => {
      sub.unsubscribe()
    }
  }, [patientId])

  return { patient, isLoading }
}
