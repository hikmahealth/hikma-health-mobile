/**
 * Mutation hook for creating a problem/diagnosis via the current DataProvider.
 * Invalidates the problems cache on success.
 */

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useDataAccess } from "@/providers/DataAccessProvider"
import { DataProviderError } from "../../types/data"
import type { CreateProblemInput } from "../../types/problem"
import { providerProblemsKeys } from "./useProviderPatientProblems"
import { usePermissionGuard } from "./usePermissionGuard"

export function useCreateProblem() {
  const { provider } = useDataAccess()
  const queryClient = useQueryClient()
  const { checkOperation } = usePermissionGuard()

  return useMutation({
    mutationFn: async (data: CreateProblemInput) => {
      const allowed = checkOperation("diagnosis:create")
      if (!allowed.ok) throw new DataProviderError(allowed.error)

      const result = await provider.problems.create(data)
      if (!result.ok) throw new DataProviderError(result.error)
      return result.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: providerProblemsKeys.all })
    },
  })
}
