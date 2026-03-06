/**
 * React Query hook for fetching visits for a patient via the current DataProvider.
 */

import { useQuery } from "@tanstack/react-query"
import { useDataAccess } from "@/providers/DataAccessProvider"
import { DataProviderError } from "../../types/data"
import type { PaginationParams } from "../../types/data"

/** Query key factory for patient-visit queries */
export const providerPatientVisitsKeys = {
  all: ["provider-patient-visits"] as const,
  byPatient: (patientId: string, params?: PaginationParams) =>
    [...providerPatientVisitsKeys.all, patientId, params] as const,
}

/**
 * Fetch paginated visits for a patient through the active DataProvider.
 * Disabled when patientId is falsy.
 */
export function useProviderPatientVisits(
  patientId: string | undefined | null,
  params?: PaginationParams,
) {
  const { provider } = useDataAccess()

  return useQuery({
    queryKey: providerPatientVisitsKeys.byPatient(patientId ?? "", params),
    queryFn: async () => {
      const result = await provider.visits.getByPatient(patientId!, params)
      if (!result.ok) throw new DataProviderError(result.error)
      return result.data
    },
    enabled: !!patientId,
  })
}
