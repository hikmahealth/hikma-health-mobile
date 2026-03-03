/**
 * React Query hook for fetching patient lists via the current DataProvider.
 * Named useProvider* to avoid collision with existing usePatientsList hook.
 */

import { useQuery } from "@tanstack/react-query"
import { useDataAccess } from "@/providers/DataAccessProvider"
import { DataProviderError } from "../../types/data"
import type { GetPatientsParams } from "../../types/patient"

/** Query key factory for patient list queries */
export const providerPatientsKeys = {
  all: ["provider-patients"] as const,
  list: (params: GetPatientsParams) => [...providerPatientsKeys.all, params] as const,
}

/**
 * @deprecated Use `useDataProviderPatients` instead. This hook requires manual
 * isOnline branching at the screen level. The unified hook handles both modes transparently.
 *
 * Fetch a paginated patient list through the active DataProvider.
 * In offline mode this queries WatermelonDB; in online mode it hits the server.
 */
export function useProviderPatients(params: GetPatientsParams = {}) {
  const { provider } = useDataAccess()

  return useQuery({
    queryKey: providerPatientsKeys.list(params),
    queryFn: async () => {
      const result = await provider.patients.getMany(params)
      if (!result.ok) throw new DataProviderError(result.error)
      return result.data
    },
  })
}
