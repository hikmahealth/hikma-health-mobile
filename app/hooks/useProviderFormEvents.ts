/**
 * React Query hook for fetching events by form and patient via the current DataProvider.
 */

import { useQuery } from "@tanstack/react-query"
import { useDataAccess } from "@/providers/DataAccessProvider"
import { DataProviderError } from "../../types/data"

/** Query key factory for form-event queries */
export const providerFormEventsKeys = {
  all: ["provider-form-events"] as const,
  byFormAndPatient: (formId: string, patientId: string) =>
    [...providerFormEventsKeys.all, formId, patientId] as const,
}

/**
 * Fetch all events for a given form and patient through the active DataProvider.
 * Disabled when formId or patientId is falsy.
 */
export function useProviderFormEvents(
  formId: string | undefined | null,
  patientId: string | undefined | null,
) {
  const { provider } = useDataAccess()

  return useQuery({
    queryKey: providerFormEventsKeys.byFormAndPatient(formId ?? "", patientId ?? ""),
    queryFn: async () => {
      const result = await provider.events.getByFormAndPatient(formId!, patientId!)
      if (!result.ok) throw new DataProviderError(result.error)
      return result.data
    },
    enabled: !!formId && !!patientId,
  })
}
