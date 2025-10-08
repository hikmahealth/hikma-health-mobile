import { useEffect, useState } from "react"
import { Q } from "@nozbe/watermelondb"

import database from "../db"
import ClinicModel from "../db/model/Clinic"

/**
 * React hook that fetches a list of clinics from the database.
 * @returns {Array<ClinicModel>} A list of clinics.
 */
export const useDBClinicsList = () => {
  const [clinics, setClinics] = useState<Array<ClinicModel>>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchClinics = async () => {
      const clinics = await database
        .get<ClinicModel>("clinics")
        .query(Q.where("is_archived", false))
        .fetch()
      setClinics(clinics)
      setIsLoading(false)
    }
    fetchClinics()
  }, [])

  return { clinics, isLoading }
}
