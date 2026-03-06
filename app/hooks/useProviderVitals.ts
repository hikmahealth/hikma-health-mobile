/**
 * React Query hook for fetching vitals for a patient via the current DataProvider.
 */

import { useQuery } from "@tanstack/react-query"
import { useDataAccess } from "@/providers/DataAccessProvider"
import { DataProviderError } from "../../types/data"

/** Query key factory for patient vitals queries */
export const providerVitalsKeys = {
  all: ["provider-vitals"] as const,
  byPatient: (patientId: string) => [...providerVitalsKeys.all, patientId] as const,
}

/**
 * Fetch all vitals for a patient through the active DataProvider.
 * Disabled when patientId is falsy.
 */
export function useProviderVitals(patientId: string | undefined | null) {
  const { provider } = useDataAccess()

  return useQuery({
    queryKey: providerVitalsKeys.byPatient(patientId ?? ""),
    queryFn: async () => {
      const result = await provider.vitals.getByPatient(patientId!)
      if (!result.ok) throw new DataProviderError(result.error)
      return result.data
    },
    enabled: !!patientId,
  })
}
