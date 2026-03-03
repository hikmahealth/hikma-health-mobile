import { Q } from "@nozbe/watermelondb"
import * as Sentry from "@sentry/react-native"
import { Option, Either } from "effect"
import { camelToSnake } from "effect/String"

import database from "@/db"
import ClinicModel from "@/db/model/Clinic"
import UserModel from "@/db/model/User"
import UserClinicPermissionModel from "@/db/model/UserClinicPermissions"
import { providerStore } from "@/store/provider"

import AppConfig from "./AppConfig"
import User from "./User"
import { ok, err, type Result, type DataError } from "../../types/data"

namespace UserClinicPermissions {
  export type T = {
    id: string
    userId: string
    clinicId: string
    // General umbrell permission capabilities
    canRegisterPatients: boolean // Whether or not a user can register a patient
    canViewHistory: boolean //Given a registered patient, can a provider view their history, including their patient files/charts
    canEditRecords: boolean // Whether or not they are allowed to edit any records of the patient at all
    canDeleteRecords: boolean // Whether or not they can delete patient records
    isClinicAdmin: boolean // Whether or not they are the clinic Admin. If they are a clinic Admin, they have all permissions for their given clinic. not for other clinics.
    // V9
    // More fine-grained capabilities
    canEditOtherProviderEvent: boolean // If a visit, event, appointment or prescription is made by a user that is not this user, can they edit it?
    canDownloadPatientReports: boolean // Whether or not the user can download the patient chart information
    canPrescribeMedications: boolean // Whether or not a user can prescribe patient medictications in the Medication screens and models
    canDispenseMedications: boolean // Given a medication prescription, can a user dispense the given medications?
    canDeletePatientVisits: boolean // Whether or not a user can delete any information of a patients visit history - this is not including the patient.
    canDeletePatientRecords: boolean // Whether or not a user can delete a patient and their chart
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
    | "canEditOtherProviderEvent"
    | "canDownloadPatientReports"
    | "canPrescribeMedications"
    | "canDispenseMedications"
    | "canDeletePatientVisits"
    | "canDeletePatientRecords"
  >

  /**
   * Function to retrieve the SQL permission name for a given permission type.
   * This function maps the permission type to its corresponding SQL column name.
   *
   * @param permission - The permission type to retrieve the SQL name for.
   * @returns The SQL permission name as a string.
   */
  export function getSQLPermissionName(permission: UserPermissionsT): string {
    switch (permission) {
      case "canRegisterPatients":
        return "can_register_patients"
      case "canViewHistory":
        return "can_view_history"
      case "canEditRecords":
        return "can_edit_records"
      case "canDeleteRecords":
        return "can_delete_records"
      case "isClinicAdmin":
        return "is_clinic_admin"
      case "canEditOtherProviderEvent":
        return "can_edit_other_provider_event"
      case "canDownloadPatientReports":
        return "can_download_patient_reports"
      case "canPrescribeMedications":
        return "can_prescribe_medications"
      case "canDispenseMedications":
        return "can_dispense_medications"
      case "canDeletePatientVisits":
        return "can_delete_patient_visits"
      case "canDeletePatientRecords":
        return "can_delete_patient_records"
      default:
        Sentry.captureEvent({
          message: `Unknown permission: ${permission}`,
          extra: {
            permission,
          },
        })
        return permission
    }
  }

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
    canEditOtherProviderEvent: false,
    canDownloadPatientReports: false,
    canPrescribeMedications: false,
    canDispenseMedications: false,
    canDeletePatientVisits: false,
    canDeletePatientRecords: false,
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
    canEditOtherProviderEvent: false,
    canDownloadPatientReports: false,
    canPrescribeMedications: false,
    canDispenseMedications: false,
    canDeletePatientVisits: false,
    canDeletePatientRecords: false,
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
      canEditOtherProviderEvent: true,
      canDownloadPatientReports: true,
      canPrescribeMedications: true,
      canDispenseMedications: true,
      canDeletePatientVisits: true,
      canDeletePatientRecords: true,
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
    canEditOtherProviderEvent: false,
    canDownloadPatientReports: false,
    canPrescribeMedications: false,
    canDispenseMedications: false,
    canDeletePatientVisits: false,
    canDeletePatientRecords: false,
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
    canEditOtherProviderEvent: false,
    canDownloadPatientReports: false,
    canPrescribeMedications: false,
    canDispenseMedications: false,
    canDeletePatientVisits: false,
    canDeletePatientRecords: false,
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
      permissions.isClinicAdmin ||
      permissions.canEditOtherProviderEvent ||
      permissions.canDownloadPatientReports ||
      permissions.canPrescribeMedications ||
      permissions.canDispenseMedications ||
      permissions.canDeletePatientVisits ||
      permissions.canDeletePatientRecords
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
    if (permissions.canEditOtherProviderEvent) {
      list.push("Edit Other Provider Events")
    }
    if (permissions.canDownloadPatientReports) {
      list.push("Download Patient Reports")
    }
    if (permissions.canPrescribeMedications) {
      list.push("Prescribe Medications")
    }
    if (permissions.canDispenseMedications) {
      list.push("Dispense Medications")
    }
    if (permissions.canDeletePatientVisits) {
      list.push("Delete Patient Visits")
    }
    if (permissions.canDeletePatientRecords) {
      list.push("Delete Patient Records")
    }
    return list
  }

  // -------------------------------------------------------------------------
  // Check — Pure permission checking (no DB calls, no side effects)
  // -------------------------------------------------------------------------

  export namespace Check {
    /** Minimal user context needed for permission checking (extracted from providerStore) */
    export type PermissionContext = {
      readonly userId: string
      readonly role: string | null
      readonly clinicId: string | null
      readonly isPermissionsDisabled: boolean
    }

    /** Permission requirement with single/all/any semantics */
    export type PermissionCheck =
      | { kind: "single"; permission: UserPermissionsT }
      | { kind: "all"; permissions: ReadonlyArray<UserPermissionsT> }
      | { kind: "any"; permissions: ReadonlyArray<UserPermissionsT> }

    type PermissionDeniedError = Extract<DataError, { _tag: "PermissionDenied" }>

    /** Require a single permission */
    export const requirePermission = (p: UserPermissionsT): PermissionCheck => ({
      kind: "single",
      permission: p,
    })

    /** Require all listed permissions */
    export const requireAll = (ps: ReadonlyArray<UserPermissionsT>): PermissionCheck => ({
      kind: "all",
      permissions: ps,
    })

    /** Require at least one of the listed permissions */
    export const requireAny = (ps: ReadonlyArray<UserPermissionsT>): PermissionCheck => ({
      kind: "any",
      permissions: ps,
    })

    function denied(permission: string): Result<never, PermissionDeniedError> {
      return err({
        _tag: "PermissionDenied",
        permission,
        message: `You do not have the required permission: ${permission}`,
      })
    }

    function describeCheck(check: PermissionCheck): string {
      switch (check.kind) {
        case "single":
          return check.permission
        case "all":
          return check.permissions.join(" AND ")
        case "any":
          return check.permissions.join(" OR ")
      }
    }

    /**
     * Pure permission check. No DB calls, no side effects.
     *
     * Decision cascade:
     * 1. If global permissions are disabled -> allow
     * 2. If user role is "super_admin" -> allow
     * 3. If permissions object is null -> deny
     * 4. Check the specific permission(s) via isPermissionPresent
     */
    export const checkPermission = (
      ctx: PermissionContext,
      check: PermissionCheck,
      permissions: UserClinicPermissions.T | null,
    ): Result<true, PermissionDeniedError> => {
      console.log("✅ : ", ctx.isPermissionsDisabled, ctx.role)
      if (ctx.isPermissionsDisabled) return ok(true)
      if (ctx.role === "super_admin") return ok(true)

      if (permissions === null) {
        return err({
          _tag: "PermissionDenied",
          permission: describeCheck(check),
          message: "No permissions found for user at this clinic.",
        })
      }

      switch (check.kind) {
        case "single":
          return isPermissionPresent(permissions, check.permission)
            ? ok(true)
            : denied(check.permission)

        case "all":
          for (const p of check.permissions) {
            if (!isPermissionPresent(permissions, p)) {
              return denied(p)
            }
          }
          return ok(true)

        case "any": {
          const hasAny = check.permissions.some((p) => isPermissionPresent(permissions, p))
          return hasAny ? ok(true) : denied(check.permissions.join(", "))
        }
      }
    }

    /**
     * Check if a user can edit a specific event.
     * Requires canEditRecords, and additionally canEditOtherProviderEvent
     * if the event was created by a different user.
     */
    export const checkEditEventPermission = (
      ctx: PermissionContext,
      permissions: UserClinicPermissions.T | null,
      eventCreatedByUserId: string,
    ): Result<true, PermissionDeniedError> => {
      const baseCheck = checkPermission(ctx, requirePermission("canEditRecords"), permissions)
      if (!baseCheck.ok) return baseCheck

      if (eventCreatedByUserId !== ctx.userId) {
        return checkPermission(ctx, requirePermission("canEditOtherProviderEvent"), permissions)
      }

      return ok(true)
    }

    /**
     * Canonical mapping of operations to their required permissions.
     * Used by mutation hooks and screens to determine which permission an action needs.
     */
    export const OPERATION_PERMISSIONS = {
      "patient:register": requirePermission("canRegisterPatients"),
      "patient:edit": requirePermission("canEditRecords"),
      "patient:delete": requirePermission("canDeletePatientRecords"),
      "patient:downloadReport": requirePermission("canDownloadPatientReports"),

      "visit:create": requirePermission("canEditRecords"),
      "visit:delete": requirePermission("canDeletePatientVisits"),

      "event:create": requirePermission("canEditRecords"),
      "event:edit": requirePermission("canEditRecords"),
      "event:delete": requirePermission("canDeleteRecords"),

      "prescription:create": requirePermission("canPrescribeMedications"),
      "prescription:updateStatus": requirePermission("canPrescribeMedications"),
      "prescription:dispense": requirePermission("canDispenseMedications"),

      "vitals:create": requirePermission("canEditRecords"),

      "diagnosis:create": requirePermission("canEditRecords"),
      "diagnosis:edit": requirePermission("canEditRecords"),

      "appointment:create": requirePermission("canEditRecords"),
      "appointment:update": requirePermission("canEditRecords"),
      "appointment:markComplete": requirePermission("canEditRecords"),
    } as const

    export type OperationName = keyof typeof OPERATION_PERMISSIONS
  }

  export namespace DB {
    export type T = UserClinicPermissionModel
    /**
     * Given a user id, a clinic id and a permission to check for, returns a Result object for whether or not the user has the permission.
     * @deprecated
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
          Q.where(getSQLPermissionName(permission), true),
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

      /**
       * isPermissionDisabled - can be set in the admin server, this effectively disables permissions checking across clinics.
       * As long as the user is signed in. all other permissions can fall back on roles.
       */
      const isPermissionDisabled =
        (await AppConfig.DB.getValue(
          AppConfig.Namespaces.AUTH,
          "disable-mobile-permissions-checking",
        )) || false

      /// SUPER ADMIN CAN ACCESS EVERYTHING.
      // If the permissions are disabled by the super admin, the users have access to all clinics
      if (userRole === "super_admin" || isPermissionDisabled) {
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
          isLoading = false
          callback(permissions, isLoading)
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
      canEditOtherProviderEvent: dbPermissions.canEditOtherProviderEvent,
      canDownloadPatientReports: dbPermissions.canDownloadPatientReports,
      canPrescribeMedications: dbPermissions.canPrescribeMedications,
      canDispenseMedications: dbPermissions.canDispenseMedications,
      canDeletePatientVisits: dbPermissions.canDeletePatientVisits,
      canDeletePatientRecords: dbPermissions.canDeletePatientRecords,
      createdBy: Option.fromNullable(dbPermissions.createdBy),
      lastModifiedBy: Option.fromNullable(dbPermissions.lastModifiedBy),
      createdAt: dbPermissions.createdAt,
      updatedAt: dbPermissions.updatedAt,
    })
  }
}

export default UserClinicPermissions
