import { useEffect, useState } from "react"
import { Q } from "@nozbe/watermelondb"

import database from "@/db"
import PatientVitals from "@/db/model/PatientVitals"

/**
 * Get all vital entries sorted by created_at
 * @param {string} patientId
 * @returns {PatientVitals[]}
 */
export function useDBVitals(patientId: string): PatientVitals[] {
  const [vitals, setVitals] = useState<PatientVitals[]>([])

  useEffect(() => {
    if (!patientId || typeof patientId !== "string" || patientId.length === 0) {
      setVitals([])
      return
    }
    // FIXME: add support for incremental loading ...
    const sub = database
      .get<PatientVitals>("patient_vitals")
      .query(
        Q.where("patient_id", patientId),
        // sort by created at
        Q.sortBy("created_at", Q.desc),
      )
      .observe()
      .subscribe((events) => {
        setVitals(events)
      })
    return () => {
      return sub?.unsubscribe()
    }
  }, [patientId])

  return vitals
}
