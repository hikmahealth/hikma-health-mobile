/**
 * Mutation hook for creating an event via the current DataProvider.
 * Invalidates the visit events cache on success.
 */

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useDataAccess } from "@/providers/DataAccessProvider"
import { DataProviderError } from "../../types/data"
import type { CreateEventInput } from "../../types/event"
import { providerVisitEventsKeys } from "./useProviderVisitEvents"
import { usePermissionGuard } from "./usePermissionGuard"

export function useCreateEvent() {
  const { provider } = useDataAccess()
  const queryClient = useQueryClient()
  const { checkOperation } = usePermissionGuard()

  return useMutation({
    mutationFn: async (data: CreateEventInput) => {
      const allowed = checkOperation("event:create")
      if (!allowed.ok) throw new DataProviderError(allowed.error)

      const result = await provider.events.create(data)
      if (!result.ok) throw new DataProviderError(result.error)
      return result.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: providerVisitEventsKeys.all })
    },
  })
}
