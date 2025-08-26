import { Q } from "@nozbe/watermelondb"
import { Option, Either } from "effect"
import { camelToSnake } from "effect/String"

import database from "@/db"
import ClinicModel from "@/db/model/Clinic"
import UserModel from "@/db/model/User"
import UserClinicPermissionModel from "@/db/model/UserClinicPermissions"
import { providerStore } from "@/store/provider"

import User from "./User"

namespace UserClinicPermissions {
  export type T = {
    id: string
    userId: string
    clinicId: string
    canRegisterPatients: boolean
    canViewHistory: boolean
    canEditRecords: boolean
    canDeleteRecords: boolean
    isClinicAdmin: boolean
    createdBy: Option.Option<string>
    lastModifiedBy: Option.Option<string>
    createdAt: Date
    updatedAt: Date
  }

  /**
   * Union type representing the available permission fields that can be checked for a user
   * within a specific clinic context. These permissions control various aspects of
   * patient data management and clinic administration.
   */
  export type UserPermissionsT = keyof Pick<
    T,
    | "canRegisterPatients"
    | "canViewHistory"
    | "canEditRecords"
    | "canDeleteRecords"
    | "isClinicAdmin"
  >

  /** Default empty UserClinicPermissions Item */
  export const empty: T = {
    id: "",
    userId: "",
    clinicId: "",
    canRegisterPatients: false,
    canViewHistory: false,
    canEditRecords: false,
    canDeleteRecords: false,
    isClinicAdmin: false,
    createdBy: Option.none(),
    lastModifiedBy: Option.none(),
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  /** Default permissions for a new user (most restrictive) */
  export const defaultPermissions: Omit<
    T,
    "id" | "userId" | "clinicId" | "createdAt" | "updatedAt"
  > = {
    canRegisterPatients: false,
    canViewHistory: false,
    canEditRecords: false,
    canDeleteRecords: false,
    isClinicAdmin: false,
    createdBy: Option.none(),
    lastModifiedBy: Option.none(),
  }

  /** Admin permissions (all permissions granted) */
  export const adminPermissions: Omit<T, "id" | "userId" | "clinicId" | "createdAt" | "updatedAt"> =
    {
      canRegisterPatients: true,
      canViewHistory: true,
      canEditRecords: true,
      canDeleteRecords: true,
      isClinicAdmin: true,
      createdBy: Option.none(),
      lastModifiedBy: Option.none(),
    }

  /** Provider permissions (typical medical provider) */
  export const providerPermissions: Omit<
    T,
    "id" | "userId" | "clinicId" | "createdAt" | "updatedAt"
  > = {
    canRegisterPatients: true,
    canViewHistory: true,
    canEditRecords: true,
    canDeleteRecords: false,
    isClinicAdmin: false,
    createdBy: Option.none(),
    lastModifiedBy: Option.none(),
  }

  /** Viewer permissions (read-only access) */
  export const viewerPermissions: Omit<
    T,
    "id" | "userId" | "clinicId" | "createdAt" | "updatedAt"
  > = {
    canRegisterPatients: false,
    canViewHistory: true,
    canEditRecords: false,
    canDeleteRecords: false,
    isClinicAdmin: false,
    createdBy: Option.none(),
    lastModifiedBy: Option.none(),
  }

  /**
   * Check if a user has any permission for a clinic
   * @param permissions User clinic permissions
   * @returns True if user has at least one permission
   */
  export const hasAnyPermission = (permissions: T): boolean => {
    return (
      permissions.canRegisterPatients ||
      permissions.canViewHistory ||
      permissions.canEditRecords ||
      permissions.canDeleteRecords ||
      permissions.isClinicAdmin
    )
  }

  /**
   * Check if a user has a specific permission
   * @param permissions User clinic permissions
   * @param permission Permission to check
   * @returns True if user has the permission
   */
  export const isPermissionPresent = (permissions: T, permission: UserPermissionsT): boolean => {
    // Admin has all permissions
    if (permissions.isClinicAdmin) return true
    return permissions[permission]
  }

  /**
   * Get a human-readable list of permissions
   * @param permissions User clinic permissions
   * @returns Array of permission descriptions
   */
  export const getPermissionsList = (permissions: T): string[] => {
    const list: string[] = []
    if (permissions.isClinicAdmin) {
      list.push("Clinic Administrator")
    }
    if (permissions.canRegisterPatients) {
      list.push("Register Patients")
    }
    if (permissions.canViewHistory) {
      list.push("View Patient History")
    }
    if (permissions.canEditRecords) {
      list.push("Edit Records")
    }
    if (permissions.canDeleteRecords) {
      list.push("Delete Records")
    }
    return list
  }

  export namespace DB {
    export type T = UserClinicPermissionModel
    /**
     * Given a user id, a clinic id and a permission to check for, returns a Result object for whether or not the user has the permission.
     * @param userId User ID
     * @param clinicId Clinic ID
     * @param permission Permission to check for
     * @returns Result object for whether or not the user has the permission
     */
    export const userHasPermission = async (
      userId: string,
      clinicId: string,
      permission: UserPermissionsT,
    ): Promise<Either.Either<boolean, string>> => {
      const user = providerStore.getSnapshot().context
      const userRole = Option.getOrNull(user.role)
      /// SUPER ADMIN CAN ACCESS EVERYTHING.
      if (userRole === "super_admin") {
        return Either.right(true)
      }
      const hasPermission = await database
        .get<UserClinicPermissionModel>("user_clinic_permissions")
        .query(
          Q.where("user_id", userId),
          Q.where("clinic_id", clinicId),
          Q.where(permission, true),
          Q.take(1),
        )
        .fetch()

      const emptyPermissions = hasPermission.length === 0
      const permissionStatus = hasPermission[0]?.[permission]

      if (emptyPermissions || permissionStatus === false) {
        return Either.left("User does not have permission")
      } else {
        return Either.right(true)
      }
    }

    /**
     * Get permissions for a user at a specific clinic
     * @param userId User ID
     * @param clinicId Clinic ID
     * @returns User's permissions or none if not found
     */
    export const getForUserAndClinic = async (
      userId: string,
      clinicId: string,
    ): Promise<Option.Option<UserClinicPermissions.T>> => {
      const permissions = await database
        .get<UserClinicPermissionModel>("user_clinic_permissions")
        .query(Q.where("user_id", userId), Q.where("clinic_id", clinicId), Q.take(1))
        .fetch()

      if (permissions.length === 0) {
        return Option.none()
      }

      return Option.some(fromDB(permissions[0]))
    }

    /**
     * Get all clinics where a user has a given permission
     * @param userId User ID
     * @param permission Permission to check for
     * @returns Array of clinics where the user has the permission
     */
    export const getClinicIdsWithPermission = async (
      userId: string,
      permission: UserPermissionsT,
    ): Promise<string[]> => {
      const user = providerStore.getSnapshot().context
      const userRole = Option.getOrNull(user.role)

      /// SUPER ADMIN CAN ACCESS EVERYTHING.
      if (userRole === "super_admin") {
        return database
          .get<ClinicModel>("clinics")
          .query()
          .fetch()
          .then((clinics) => {
            return clinics.map((clinic) => clinic.id)
          })
      }

      const clinics = await database
        .get<UserClinicPermissionModel>("user_clinic_permissions")
        .query(Q.where("user_id", userId), Q.where(camelToSnake(permission), true))
        .fetch()

      return clinics.map((clinic) => clinic.clinicId)
    }

    /**
     * Get all permissions for a user across all clinics
     * @param userId User ID
     * @returns Array of user's permissions
     */
    export const getAllForUser = async (userId: string): Promise<UserClinicPermissions.T[]> => {
      const permissions = await database
        .get<UserClinicPermissionModel>("user_clinic_permissions")
        .query(Q.where("user_id", userId))
        .fetch()

      return permissions.map(fromDB)
    }

    /**
     * Get all permissions for a clinic
     * @param clinicId Clinic ID
     * @returns Array of permissions for the clinic
     */
    export const getAllForClinic = async (clinicId: string): Promise<UserClinicPermissions.T[]> => {
      const permissions = await database
        .get<UserClinicPermissionModel>("user_clinic_permissions")
        .query(Q.where("clinic_id", clinicId))
        .fetch()

      return permissions.map(fromDB)
    }

    /**
     * Subscribe to user's permissions for a specific clinic
     * @param userId User ID
     * @param clinicId Clinic ID
     * @param callback Function called when permissions update
     * @returns Object containing unsubscribe function
     */
    export function subscribe(
      userId: string,
      clinicId: string,
      callback: (permissions: Option.Option<UserClinicPermissions.T>, isLoading: boolean) => void,
    ): { unsubscribe: () => void } {
      let isLoading = true

      const subscription = database
        .get<UserClinicPermissionModel>("user_clinic_permissions")
        .query(Q.where("user_id", userId), Q.where("clinic_id", clinicId), Q.take(1))
        .observe()
        .subscribe((dbPermissions) => {
          const permissions =
            dbPermissions.length > 0 ? Option.some(fromDB(dbPermissions[0])) : Option.none()
          callback(permissions, isLoading)
          isLoading = false
        })

      return {
        unsubscribe: () => subscription.unsubscribe(),
      }
    }

    /**
     * Convert from UserClinicPermissionModel to UserClinicPermissions.T
     * @param dbPermissions The UserClinicPermissionModel to convert
     * @returns The converted UserClinicPermissions.T
     */
    export const fromDB = (dbPermissions: DB.T): UserClinicPermissions.T => ({
      id: dbPermissions.id,
      userId: dbPermissions.user.id,
      clinicId: dbPermissions.clinic.id,
      canRegisterPatients: dbPermissions.canRegisterPatients,
      canViewHistory: dbPermissions.canViewHistory,
      canEditRecords: dbPermissions.canEditRecords,
      canDeleteRecords: dbPermissions.canDeleteRecords,
      isClinicAdmin: dbPermissions.isClinicAdmin,
      createdBy: Option.fromNullable(dbPermissions.createdBy),
      lastModifiedBy: Option.fromNullable(dbPermissions.lastModifiedBy),
      createdAt: dbPermissions.createdAt,
      updatedAt: dbPermissions.updatedAt,
    })
  }
}

export default UserClinicPermissions
