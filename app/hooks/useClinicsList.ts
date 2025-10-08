import { useEffect, useState } from "react"
import { Q } from "@nozbe/watermelondb"

import database from "@/db"
import ClinicModel from "@/db/model/Clinic"

/**
 * Get all clinics from the database
 * @returns {{ clinics: ClinicModel[], isLoading: boolean }}
 */
export function useClinics(): { clinics: ClinicModel[]; isLoading: boolean } {
  const [isLoading, setIsLoading] = useState(true)
  const [clinics, setClinics] = useState<ClinicModel[]>([])

  useEffect(() => {
    const sub = database
      .get<ClinicModel>("clinics")
      .query(Q.where("is_archived", false))
      .observe()
      .subscribe((clinics) => {
        setClinics(clinics)
        setIsLoading(false)
      })

    return () => {
      return sub?.unsubscribe()
    }
  }, [])

  return {
    clinics,
    isLoading,
  }
}
