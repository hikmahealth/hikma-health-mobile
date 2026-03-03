import { Option } from "effect"
import UserClinicPermissions from "../../app/models/UserClinicPermissions"

/**
 * Build a full UserClinicPermissions.T with sensible defaults.
 * All boolean permissions default to false; override as needed.
 */
export function makePermissions(
  overrides: Partial<UserClinicPermissions.T> = {},
): UserClinicPermissions.T {
  return {
    ...UserClinicPermissions.empty,
    id: "perm-1",
    userId: "user-1",
    clinicId: "clinic-1",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

/**
 * Build a permission context for pure Check functions.
 */
export function makePermissionContext(
  overrides: Partial<UserClinicPermissions.Check.PermissionContext> = {},
): UserClinicPermissions.Check.PermissionContext {
  return {
    userId: "user-1",
    role: null,
    clinicId: "clinic-1",
    isPermissionsDisabled: false,
    ...overrides,
  }
}
