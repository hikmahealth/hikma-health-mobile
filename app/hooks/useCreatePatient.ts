/**
 * Mutation hook for creating a patient via the current DataProvider.
 * Invalidates the patient list cache on success.
 */

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useDataAccess } from "@/providers/DataAccessProvider"
import { DataProviderError } from "../../types/data"
import type { CreatePatientInput } from "../../types/patient"
import { providerPatientsKeys } from "./useProviderPatients"
import { dataProviderPatientsKeys } from "./useDataProviderPatients"
import { usePermissionGuard } from "./usePermissionGuard"

export function useCreatePatient() {
  const { provider } = useDataAccess()
  const queryClient = useQueryClient()
  const { checkOperation } = usePermissionGuard()

  return useMutation({
    mutationFn: async (data: CreatePatientInput) => {
      const allowed = checkOperation("patient:register")
      if (!allowed.ok) throw new DataProviderError(allowed.error)

      const result = await provider.patients.create(data)
      if (!result.ok) throw new DataProviderError(result.error)
      return result.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: providerPatientsKeys.all })
      queryClient.invalidateQueries({ queryKey: dataProviderPatientsKeys.all })
    },
  })
}
