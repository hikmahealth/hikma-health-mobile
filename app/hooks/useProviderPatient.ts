/**
 * React Query hook for fetching a single patient by ID via the current DataProvider.
 */

import { useQuery } from "@tanstack/react-query"
import { useDataAccess } from "@/providers/DataAccessProvider"
import { DataProviderError } from "../../types/data"

/** Query key factory for single-patient queries */
export const providerPatientKeys = {
  all: ["provider-patient"] as const,
  detail: (id: string) => [...providerPatientKeys.all, id] as const,
}

/**
 * Fetch a single patient by ID through the active DataProvider.
 * Disabled when id is falsy.
 */
export function useProviderPatient(id: string | undefined | null) {
  const { provider } = useDataAccess()

  return useQuery({
    queryKey: providerPatientKeys.detail(id ?? ""),
    queryFn: async () => {
      const result = await provider.patients.getById(id!)
      if (!result.ok) throw new DataProviderError(result.error)
      return result.data
    },
    enabled: !!id,
  })
}
