/**
 * Mutation hook for updating an event via the current DataProvider.
 * Invalidates the visit events cache on success.
 */

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useDataAccess } from "@/providers/DataAccessProvider"
import { DataProviderError } from "../../types/data"
import type { UpdateEventInput } from "../../types/event"
import { providerVisitEventsKeys } from "./useProviderVisitEvents"
import { usePermissionGuard } from "./usePermissionGuard"

export function useUpdateEvent() {
  const { provider } = useDataAccess()
  const queryClient = useQueryClient()
  const { checkOperation, checkEditEvent } = usePermissionGuard()

  return useMutation({
    mutationFn: async ({
      id,
      data,
      eventCreatedByUserId,
    }: {
      id: string
      data: UpdateEventInput
      eventCreatedByUserId?: string
    }) => {
      // If we know who created the event, use the compound check
      // (canEditRecords + canEditOtherProviderEvent for other providers' events)
      const allowed = eventCreatedByUserId
        ? checkEditEvent(eventCreatedByUserId)
        : checkOperation("event:edit")
      if (!allowed.ok) throw new DataProviderError(allowed.error)

      const result = await provider.events.update(id, data)
      if (!result.ok) throw new DataProviderError(result.error)
      return result.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: providerVisitEventsKeys.all })
    },
  })
}
