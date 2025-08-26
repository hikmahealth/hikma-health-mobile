import { useState, useEffect, useRef } from "react"
import { useSelector } from "@xstate/react"
import { Option } from "effect"

import Patient from "@/models/Patient"
import { providerStore } from "@/store/provider"

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
  const { clinic_id, id: userId } = useSelector(providerStore, (state) => state.context)
  const [patient, setPatient] = useState<Option.Option<Patient.DBPatient>>(
    Option.fromNullable(defaultPatient ? (defaultPatient as unknown as Patient.DBPatient) : null),
  )
  const [isLoading, setIsLoading] = useState(true)

  const sub = useRef<{ unsubscribe: () => void }>(null)

  useEffect(() => {
    setIsLoading(true)
    Patient.DB.subscribe(
      patientId,
      { clinicId: Option.getOrElse(clinic_id, () => ""), userId },
      (dbPatient, isLoading) => {
        setPatient(dbPatient)
        setIsLoading(isLoading)
      },
    ).then((res) => {
      sub.current = res
    })
    return () => {
      sub.current?.unsubscribe()
    }
  }, [patientId, clinic_id, userId])

  return { patient, isLoading }
}
