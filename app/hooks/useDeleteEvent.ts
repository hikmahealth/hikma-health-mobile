/**
 * Mutation hook for deleting an event via the current DataProvider.
 * Invalidates the form events and visit events caches on success.
 */

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useDataAccess } from "@/providers/DataAccessProvider"
import { DataProviderError } from "../../types/data"
import { providerFormEventsKeys } from "./useProviderFormEvents"
import { providerVisitEventsKeys } from "./useProviderVisitEvents"
import { usePermissionGuard } from "./usePermissionGuard"

export function useDeleteEvent() {
  const { provider } = useDataAccess()
  const queryClient = useQueryClient()
  const { checkOperation } = usePermissionGuard()

  return useMutation({
    mutationFn: async (eventId: string) => {
      const allowed = checkOperation("event:edit")
      if (!allowed.ok) throw new DataProviderError(allowed.error)

      const result = await provider.events.delete(eventId)
      if (!result.ok) throw new DataProviderError(result.error)
      return result.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: providerFormEventsKeys.all })
      queryClient.invalidateQueries({ queryKey: providerVisitEventsKeys.all })
    },
  })
}
