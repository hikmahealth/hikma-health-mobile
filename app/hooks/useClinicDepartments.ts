import { useState, useEffect } from "react"
import { Q } from "@nozbe/watermelondb"

import db from "@/db"
import Clinic from "@/models/Clinic"

/**
 * Given a clinic ID, fetches the departments associated with that clinic.
 *
 * @param clinicId - The ID of the clinic to fetch departments for
 * @returns An object containing the departments data, loading state, and error state
 *
 * @example
 * ```tsx
 * const { data, loading, error } = useClinicDepartments(clinicId);
 * ```
 */
export const useClinicDepartments = (clinicId: string) => {
  const [departments, setDepartments] = useState<Clinic.DBClinicDepartment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (!clinicId || clinicId === "") {
      setDepartments([])
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    // Set up subscription
    const subscription = db.collections
      .get<Clinic.DBClinicDepartment>("clinic_departments")
      .query(Q.where("clinic_id", clinicId))
      .observe()
      .subscribe((departments) => {
        setDepartments(departments)
        setLoading(false)
      })

    // Cleanup subscription on unmount or clinicId change
    return () => {
      subscription.unsubscribe()
    }
  }, [clinicId])

  return {
    data: departments,
    loading,
    error,
  }
}
