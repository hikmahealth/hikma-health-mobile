/**
 * Reactive hook that returns all clinic IDs where a user holds a given permission.
 *
 * Unlike the one-shot `getClinicIdsWithPermission`, this subscribes to
 * WatermelonDB observables so the list updates live when permissions change.
 *
 * Handles super_admin and globally-disabled-permissions bypasses (returns all clinic IDs).
 */

import { useEffect, useState } from "react"
import { Q } from "@nozbe/watermelondb"
import { useSelector } from "@xstate/react"
import { Option } from "effect"
import { camelToSnake } from "effect/String"

import database from "@/db"
import ClinicModel from "@/db/model/Clinic"
import UserClinicPermissionModel from "@/db/model/UserClinicPermissions"
import AppConfig from "@/models/AppConfig"
import type UserClinicPermissions from "@/models/UserClinicPermissions"
import { providerStore } from "@/store/provider"

type UserPermissionsT = UserClinicPermissions.UserPermissionsT

type ClinicIdsWithPermissionResult = {
  /** null while loading; string[] once resolved */
  clinicIds: string[] | null
  isLoading: boolean
}

export function useClinicIdsWithPermission(
  userId: string | null,
  permission: UserPermissionsT,
): ClinicIdsWithPermissionResult {
  const role = useSelector(providerStore, (state) => Option.getOrNull(state.context.role))

  const [clinicIds, setClinicIds] = useState<string[] | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isPermissionsDisabled, setIsPermissionsDisabled] = useState<boolean | null>(null)

  // Load the global disable toggle once
  useEffect(() => {
    let cancelled = false
    AppConfig.DB.getValue(AppConfig.Namespaces.AUTH, "disable-mobile-permissions-checking").then(
      (value) => {
        if (!cancelled) {
          setIsPermissionsDisabled(value === true || value === "true")
        }
      },
    )
    return () => {
      cancelled = true
    }
  }, [])

  // Subscribe to permission changes reactively
  useEffect(() => {
    if (!userId || isPermissionsDisabled === null) return

    setIsLoading(true)

    // Super admin or disabled permissions: observe ALL clinics
    if (role === "super_admin" || isPermissionsDisabled) {
      const sub = database
        .get<ClinicModel>("clinics")
        .query()
        .observe()
        .subscribe((clinics) => {
          setClinicIds(clinics.map((c) => c.id))
          setIsLoading(false)
        })
      return () => sub.unsubscribe()
    }

    // Standard: observe permission records where the specific flag is true
    const column = camelToSnake(permission)
    const sub = database
      .get<UserClinicPermissionModel>("user_clinic_permissions")
      .query(Q.where("user_id", userId), Q.where(column, true))
      .observe()
      .subscribe((records) => {
        setClinicIds(records.map((r) => r.clinicId))
        setIsLoading(false)
      })

    return () => sub.unsubscribe()
  }, [userId, role, permission, isPermissionsDisabled])

  return { clinicIds, isLoading }
}
