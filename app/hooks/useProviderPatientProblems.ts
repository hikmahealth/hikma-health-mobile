/**
 * React Query hook for fetching problems/diagnoses for a patient via the current DataProvider.
 */

import { useQuery } from "@tanstack/react-query"
import { useDataAccess } from "@/providers/DataAccessProvider"
import { DataProviderError } from "../../types/data"

/** Query key factory for patient problems queries */
export const providerProblemsKeys = {
  all: ["provider-problems"] as const,
  byPatient: (patientId: string) => [...providerProblemsKeys.all, patientId] as const,
}

/**
 * Fetch all problems for a patient through the active DataProvider.
 * Disabled when patientId is falsy.
 */
export function useProviderPatientProblems(patientId: string | undefined | null) {
  const { provider } = useDataAccess()

  return useQuery({
    queryKey: providerProblemsKeys.byPatient(patientId ?? ""),
    queryFn: async () => {
      const result = await provider.problems.getByPatient(patientId!)
      if (!result.ok) throw new DataProviderError(result.error)
      return result.data
    },
    enabled: !!patientId,
  })
}
