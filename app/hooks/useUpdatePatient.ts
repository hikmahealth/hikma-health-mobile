/**
 * Mutation hook for updating a patient via the current DataProvider.
 * Invalidates both the patient list and the specific patient detail cache on success.
 */

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useDataAccess } from "@/providers/DataAccessProvider"
import { DataProviderError } from "../../types/data"
import type { UpdatePatientInput } from "../../types/patient"
import { providerPatientsKeys } from "./useProviderPatients"
import { dataProviderPatientsKeys } from "./useDataProviderPatients"
import { providerPatientKeys } from "./useProviderPatient"
import { usePermissionGuard } from "./usePermissionGuard"

export function useUpdatePatient() {
  const { provider } = useDataAccess()
  const queryClient = useQueryClient()
  const { checkOperation } = usePermissionGuard()

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdatePatientInput }) => {
      const allowed = checkOperation("patient:edit")
      if (!allowed.ok) throw new DataProviderError(allowed.error)

      const result = await provider.patients.update(id, data)
      if (!result.ok) throw new DataProviderError(result.error)
      return result.data
    },
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: providerPatientsKeys.all })
      queryClient.invalidateQueries({ queryKey: dataProviderPatientsKeys.all })
      queryClient.invalidateQueries({ queryKey: providerPatientKeys.detail(id) })
    },
  })
}
