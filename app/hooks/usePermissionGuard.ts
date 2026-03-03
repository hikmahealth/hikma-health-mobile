import { useCallback, useEffect, useMemo, useState } from "react"
import { useSelector } from "@xstate/react"
import { Option } from "effect"

import AppConfig from "@/models/AppConfig"
import UserClinicPermissions from "@/models/UserClinicPermissions"
import { providerStore } from "@/store/provider"

import type { Result } from "../../types/data"
import type { DataError } from "../../types/data"

type PermissionContext = UserClinicPermissions.Check.PermissionContext
type PermissionCheck = UserClinicPermissions.Check.PermissionCheck
type OperationName = UserClinicPermissions.Check.OperationName
type PermissionDeniedError = Extract<DataError, { _tag: "PermissionDenied" }>

const Check = UserClinicPermissions.Check

/**
 * Bridges the pure permission-checking functions to live app context.
 *
 * - Reads userId, role, clinicId from providerStore
 * - Loads global disable toggle from AppConfig
 * - Subscribes to live permission updates via UserClinicPermissions.DB.subscribe
 * - Exposes check/can/checkOperation/checkEditEvent helpers
 */
export function usePermissionGuard() {
  // Use separate selectors so each returns a stable primitive (string | null).
  // A single selector returning an object would create a new reference on every
  // store emission, defeating the built-in Object.is equality check and causing
  // unnecessary re-renders.
  const userId = useSelector(providerStore, (state) => state.context.id)
  const role = useSelector(providerStore, (state) => Option.getOrNull(state.context.role))
  const clinicId = useSelector(providerStore, (state) => Option.getOrNull(state.context.clinic_id))

  const [permissions, setPermissions] = useState<UserClinicPermissions.T | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isPermissionsDisabled, setIsPermissionsDisabled] = useState(false)

  // Load the global disable toggle once
  useEffect(() => {
    let cancelled = false
    AppConfig.DB.getValue(AppConfig.Namespaces.AUTH, "disable-mobile-permissions-checking").then(
      (value) => {
        if (!cancelled) {
          const disabled = value === true || value === "true"
          setIsPermissionsDisabled(disabled)
        }
      },
    )
    return () => {
      cancelled = true
    }
  }, [])

  // Subscribe to live permission updates
  useEffect(() => {
    if (!userId || !clinicId) {
      setPermissions(null)
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    const { unsubscribe } = UserClinicPermissions.DB.subscribe(
      userId,
      clinicId,
      (optPerms, loading) => {
        const perms = Option.getOrNull(optPerms)
        setPermissions(perms)
        setIsLoading(loading)
      },
    )

    return () => {
      unsubscribe()
    }
  }, [userId, clinicId])

  const ctx: PermissionContext = useMemo(
    () => ({
      userId,
      role,
      clinicId,
      isPermissionsDisabled,
    }),
    [userId, role, clinicId, isPermissionsDisabled],
  )

  const check = useCallback(
    (requirement: PermissionCheck): Result<true, PermissionDeniedError> => {
      return Check.checkPermission(ctx, requirement, permissions)
    },
    [ctx, permissions],
  )

  const checkOperation = useCallback(
    (operationName: OperationName): Result<true, PermissionDeniedError> => {
      const requirement = Check.OPERATION_PERMISSIONS[operationName]
      return Check.checkPermission(ctx, requirement, permissions)
    },
    [ctx, permissions],
  )

  const checkEditEvent = useCallback(
    (eventCreatedByUserId: string): Result<true, PermissionDeniedError> => {
      return Check.checkEditEventPermission(ctx, permissions, eventCreatedByUserId)
    },
    [ctx, permissions],
  )

  const can = useCallback(
    (operationName: OperationName): boolean => {
      if (isLoading) {
        return false
      }
      return checkOperation(operationName).ok
    },
    [isLoading, checkOperation],
  )

  return {
    permissions,
    isLoading,
    check,
    checkOperation,
    checkEditEvent,
    can,
  } as const
}
