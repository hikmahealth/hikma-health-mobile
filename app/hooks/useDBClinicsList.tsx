import database from "app/db"
import ClinicModel from "app/db/model/Clinic"
import { useEffect, useState } from "react"

/**
 * React hook that fetches a list of clinics from the database.
 * @returns {Array<ClinicModel>} A list of clinics.
 */
export const useDBClinicsList = () => {
    const [clinics, setClinics] = useState<Array<ClinicModel>>([])
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        const fetchClinics = async () => {
            const clinics = await database.get<ClinicModel>("clinics").query().fetch()
            setClinics(clinics)
            setIsLoading(false)
        }
        fetchClinics()
    }, [])

    return { clinics, isLoading }
}