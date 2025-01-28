import PrescriptionModel from "../db/model/Prescription"
import { useEffect, useState } from "react"
import { database } from "../db"
import { Q } from "@nozbe/watermelondb"

/**
 * React hook that subscribes to all the prescriptions for a patient in a specific visit
 * @param patientId
 * @param visitId
 * @returns
 */
export function usePatientVisitPrescriptions(patientId: string, visitId?: string | null) {
  const [prescriptions, setPrescriptions] = useState<PrescriptionModel[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!patientId || !visitId) {
      setIsLoading(false)
      setPrescriptions([])
      return
    }
    setIsLoading(true)
    const sub = database
      .get<PrescriptionModel>("prescriptions")
      .query(Q.where("patient_id", patientId), Q.where("visit_id", visitId))
      .observe()
      .subscribe((prescriptions) => {
        setPrescriptions(prescriptions)
        setIsLoading(false)
      })

    return () => {
      sub.unsubscribe()
    }
  }, [patientId, visitId])

  return { prescriptions, isLoading }
}
