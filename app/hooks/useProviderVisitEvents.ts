/**
 * React Query hook for fetching events for a visit via the current DataProvider.
 */

import { useQuery } from "@tanstack/react-query"
import { useDataAccess } from "@/providers/DataAccessProvider"
import { DataProviderError } from "../../types/data"

/** Query key factory for visit-event queries */
export const providerVisitEventsKeys = {
  all: ["provider-visit-events"] as const,
  byVisit: (visitId: string, patientId: string) =>
    [...providerVisitEventsKeys.all, visitId, patientId] as const,
}

/**
 * Fetch all events for a visit through the active DataProvider.
 * Disabled when visitId or patientId is falsy.
 */
export function useProviderVisitEvents(
  visitId: string | undefined | null,
  patientId: string | undefined | null,
) {
  const { provider } = useDataAccess()

  return useQuery({
    queryKey: providerVisitEventsKeys.byVisit(visitId ?? "", patientId ?? ""),
    queryFn: async () => {
      const result = await provider.events.getByVisit(visitId!, patientId!)
      if (!result.ok) throw new DataProviderError(result.error)
      return result.data
    },
    enabled: !!visitId && !!patientId,
  })
}
