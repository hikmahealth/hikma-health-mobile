/**
 * Mutation hook for creating vitals via the current DataProvider.
 * Invalidates the vitals cache on success.
 */

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useDataAccess } from "@/providers/DataAccessProvider"
import { DataProviderError } from "../../types/data"
import type { CreateVitalsInput } from "../../types/vitals"
import { providerVitalsKeys } from "./useProviderVitals"
import { usePermissionGuard } from "./usePermissionGuard"

export function useCreateVitals() {
  const { provider } = useDataAccess()
  const queryClient = useQueryClient()
  const { checkOperation } = usePermissionGuard()

  return useMutation({
    mutationFn: async (data: CreateVitalsInput) => {
      const allowed = checkOperation("vitals:create")
      if (!allowed.ok) throw new DataProviderError(allowed.error)

      const result = await provider.vitals.create(data)
      if (!result.ok) throw new DataProviderError(result.error)
      return result.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: providerVitalsKeys.all })
    },
  })
}
