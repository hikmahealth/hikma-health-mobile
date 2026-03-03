/**
 * Mutation hook for creating a visit via the current DataProvider.
 * Invalidates the patient visits cache on success.
 */

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useDataAccess } from "@/providers/DataAccessProvider"
import { DataProviderError } from "../../types/data"
import type { CreateVisitInput } from "../../types/visit"
import { providerPatientVisitsKeys } from "./useProviderPatientVisits"
import { usePermissionGuard } from "./usePermissionGuard"

export function useCreateVisit() {
  const { provider } = useDataAccess()
  const queryClient = useQueryClient()
  const { checkOperation } = usePermissionGuard()

  return useMutation({
    mutationFn: async (data: CreateVisitInput) => {
      const allowed = checkOperation("visit:create")
      if (!allowed.ok) throw new DataProviderError(allowed.error)

      const result = await provider.visits.create(data)
      if (!result.ok) throw new DataProviderError(result.error)
      return result.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: providerPatientVisitsKeys.all })
    },
  })
}
