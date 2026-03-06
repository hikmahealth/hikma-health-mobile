import fc from "fast-check"
import { Option } from "effect"

import UserClinicPermissions from "../../app/models/UserClinicPermissions"

type T = UserClinicPermissions.T
type UserPermissionsT = UserClinicPermissions.UserPermissionsT
const Check = UserClinicPermissions.Check
type PermissionContext = Check.PermissionContext

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

/** All boolean permission keys on UserClinicPermissions.T */
const ALL_PERMISSION_KEYS: ReadonlyArray<UserPermissionsT> = [
  "canRegisterPatients",
  "canViewHistory",
  "canEditRecords",
  "canDeleteRecords",
  "isClinicAdmin",
  "canEditOtherProviderEvent",
  "canDownloadPatientReports",
  "canPrescribeMedications",
  "canDispenseMedications",
  "canDeletePatientVisits",
  "canDeletePatientRecords",
]

/** Arbitrary that picks one of the permission keys */
const arbPermissionKey: fc.Arbitrary<UserPermissionsT> = fc.constantFrom(...ALL_PERMISSION_KEYS)

/** Arbitrary non-empty array of permission keys */
const arbPermissionKeys: fc.Arbitrary<UserPermissionsT[]> = fc
  .subarray([...ALL_PERMISSION_KEYS], { minLength: 1 })
  .map((arr) => [...arr])

/** Build a permissions object with specific overrides */
function makePermissions(overrides: Partial<T> = {}): T {
  return { ...UserClinicPermissions.empty, ...overrides }
}

/** Build a PermissionContext with overrides */
function makeCtx(overrides: Partial<PermissionContext> = {}): PermissionContext {
  return {
    userId: "user-1",
    role: "provider",
    clinicId: "clinic-1",
    isPermissionsDisabled: false,
    ...overrides,
  }
}

/** Arbitrary PermissionContext (non-admin, permissions enabled) */
const arbNormalCtx: fc.Arbitrary<PermissionContext> = fc.record({
  userId: fc.uuid(),
  role: fc.constantFrom("provider", "nurse", "pharmacist", "viewer"),
  clinicId: fc.uuid(),
  isPermissionsDisabled: fc.constant(false),
})

/** Arbitrary permissions object with randomised boolean flags */
const arbPermissions: fc.Arbitrary<T> = fc
  .record({
    canRegisterPatients: fc.boolean(),
    canViewHistory: fc.boolean(),
    canEditRecords: fc.boolean(),
    canDeleteRecords: fc.boolean(),
    isClinicAdmin: fc.boolean(),
    canEditOtherProviderEvent: fc.boolean(),
    canDownloadPatientReports: fc.boolean(),
    canPrescribeMedications: fc.boolean(),
    canDispenseMedications: fc.boolean(),
    canDeletePatientVisits: fc.boolean(),
    canDeletePatientRecords: fc.boolean(),
  })
  .map((flags) => makePermissions(flags))

// =========================================================================
// Existing pure functions
// =========================================================================

describe("UserClinicPermissions.getSQLPermissionName", () => {
  it("maps every known permission key to snake_case", () => {
    const expected: Record<UserPermissionsT, string> = {
      canRegisterPatients: "can_register_patients",
      canViewHistory: "can_view_history",
      canEditRecords: "can_edit_records",
      canDeleteRecords: "can_delete_records",
      isClinicAdmin: "is_clinic_admin",
      canEditOtherProviderEvent: "can_edit_other_provider_event",
      canDownloadPatientReports: "can_download_patient_reports",
      canPrescribeMedications: "can_prescribe_medications",
      canDispenseMedications: "can_dispense_medications",
      canDeletePatientVisits: "can_delete_patient_visits",
      canDeletePatientRecords: "can_delete_patient_records",
    }
    for (const [key, sqlName] of Object.entries(expected)) {
      expect(UserClinicPermissions.getSQLPermissionName(key as UserPermissionsT)).toBe(sqlName)
    }
  })

  it("returns the key unchanged for an unknown permission (default branch)", () => {
    // At runtime, a corrupted or future permission key could be passed
    const unknownKey = "canDoSomethingNew" as UserPermissionsT
    const result = UserClinicPermissions.getSQLPermissionName(unknownKey)
    expect(result).toBe("canDoSomethingNew")
  })
})

describe("UserClinicPermissions.isPermissionPresent", () => {
  it("returns true for any permission when isClinicAdmin is true (property)", () => {
    fc.assert(
      fc.property(arbPermissionKey, (perm) => {
        const perms = makePermissions({ isClinicAdmin: true })
        expect(UserClinicPermissions.isPermissionPresent(perms, perm)).toBe(true)
      }),
    )
  })

  it("returns the actual flag value when isClinicAdmin is false (property)", () => {
    fc.assert(
      fc.property(arbPermissionKey, fc.boolean(), (perm, flagValue) => {
        // Skip isClinicAdmin itself — that's the admin bypass
        if (perm === "isClinicAdmin") return
        const perms = makePermissions({ isClinicAdmin: false, [perm]: flagValue })
        expect(UserClinicPermissions.isPermissionPresent(perms, perm)).toBe(flagValue)
      }),
    )
  })
})

describe("UserClinicPermissions.hasAnyPermission", () => {
  it("returns false for empty (all-false) permissions", () => {
    expect(UserClinicPermissions.hasAnyPermission(UserClinicPermissions.empty)).toBe(false)
  })

  it("returns true when at least one permission is true (property)", () => {
    fc.assert(
      fc.property(arbPermissionKey, (perm) => {
        const perms = makePermissions({ [perm]: true })
        expect(UserClinicPermissions.hasAnyPermission(perms)).toBe(true)
      }),
    )
  })
})

describe("UserClinicPermissions.getPermissionsList", () => {
  it("returns empty for all-false permissions", () => {
    expect(UserClinicPermissions.getPermissionsList(UserClinicPermissions.empty)).toEqual([])
  })

  it("includes 'Clinic Administrator' when isClinicAdmin is true", () => {
    const perms = makePermissions({ isClinicAdmin: true })
    expect(UserClinicPermissions.getPermissionsList(perms)).toContain("Clinic Administrator")
  })

  it("length equals number of true flags (property)", () => {
    fc.assert(
      fc.property(arbPermissions, (perms) => {
        const list = UserClinicPermissions.getPermissionsList(perms)
        const trueCount = ALL_PERMISSION_KEYS.filter((k) => perms[k]).length
        expect(list.length).toBe(trueCount)
      }),
    )
  })
})

// =========================================================================
// Check namespace — constructors
// =========================================================================

describe("Check constructors", () => {
  it("requirePermission produces a single-kind check", () => {
    const check = Check.requirePermission("canEditRecords")
    expect(check).toEqual({ kind: "single", permission: "canEditRecords" })
  })

  it("requireAll produces an all-kind check", () => {
    const check = Check.requireAll(["canEditRecords", "canEditOtherProviderEvent"])
    expect(check).toEqual({
      kind: "all",
      permissions: ["canEditRecords", "canEditOtherProviderEvent"],
    })
  })

  it("requireAny produces an any-kind check", () => {
    const check = Check.requireAny(["canPrescribeMedications", "canDispenseMedications"])
    expect(check).toEqual({
      kind: "any",
      permissions: ["canPrescribeMedications", "canDispenseMedications"],
    })
  })
})

// =========================================================================
// Check.checkPermission — bypass paths
// =========================================================================

describe("Check.checkPermission — bypass paths", () => {
  it("super_admin always passes for any permission check (property)", () => {
    const ctx = makeCtx({ role: "super_admin" })
    fc.assert(
      fc.property(arbPermissionKey, arbPermissions, (perm, perms) => {
        const result = Check.checkPermission(ctx, Check.requirePermission(perm), perms)
        expect(result.ok).toBe(true)
      }),
    )
  })

  it("super_admin passes even when permissions are null", () => {
    const ctx = makeCtx({ role: "super_admin" })
    const result = Check.checkPermission(ctx, Check.requirePermission("canEditRecords"), null)
    expect(result.ok).toBe(true)
  })

  it("isPermissionsDisabled always passes for any permission check (property)", () => {
    const ctx = makeCtx({ isPermissionsDisabled: true, role: "provider" })
    fc.assert(
      fc.property(arbPermissionKey, (perm) => {
        const result = Check.checkPermission(ctx, Check.requirePermission(perm), null)
        expect(result.ok).toBe(true)
      }),
    )
  })

  it("isClinicAdmin always passes for any permission via isPermissionPresent (property)", () => {
    const ctx = makeCtx({ role: "provider" })
    const perms = makePermissions({ isClinicAdmin: true })
    fc.assert(
      fc.property(arbPermissionKey, (perm) => {
        const result = Check.checkPermission(ctx, Check.requirePermission(perm), perms)
        expect(result.ok).toBe(true)
      }),
    )
  })
})

// =========================================================================
// Check.checkPermission — null permissions
// =========================================================================

describe("Check.checkPermission — null permissions", () => {
  it("denies when permissions are null and no bypass applies (property)", () => {
    fc.assert(
      fc.property(arbNormalCtx, arbPermissionKey, (ctx, perm) => {
        const result = Check.checkPermission(ctx, Check.requirePermission(perm), null)
        expect(result.ok).toBe(false)
        if (!result.ok) {
          expect(result.error._tag).toBe("PermissionDenied")
        }
      }),
    )
  })
})

// =========================================================================
// Check.checkPermission — single permission
// =========================================================================

describe("Check.checkPermission — single permission", () => {
  it("allows when the specific permission flag is true (property)", () => {
    fc.assert(
      fc.property(arbNormalCtx, arbPermissionKey, (ctx, perm) => {
        if (perm === "isClinicAdmin") return // isClinicAdmin is a bypass, skip
        const perms = makePermissions({ [perm]: true })
        const result = Check.checkPermission(ctx, Check.requirePermission(perm), perms)
        expect(result.ok).toBe(true)
      }),
    )
  })

  it("denies when the specific permission flag is false (property)", () => {
    fc.assert(
      fc.property(arbNormalCtx, arbPermissionKey, (ctx, perm) => {
        if (perm === "isClinicAdmin") return // isClinicAdmin=false doesn't cause denial by itself
        const perms = makePermissions({ [perm]: false, isClinicAdmin: false })
        const result = Check.checkPermission(ctx, Check.requirePermission(perm), perms)
        expect(result.ok).toBe(false)
        if (!result.ok) {
          expect(result.error._tag).toBe("PermissionDenied")
          expect(result.error.permission).toBe(perm)
        }
      }),
    )
  })
})

// =========================================================================
// Check.checkPermission — requireAll
// =========================================================================

describe("Check.checkPermission — requireAll", () => {
  it("allows when all permissions are true", () => {
    const ctx = makeCtx()
    const perms = makePermissions({
      canEditRecords: true,
      canEditOtherProviderEvent: true,
    })
    const check = Check.requireAll(["canEditRecords", "canEditOtherProviderEvent"])
    expect(Check.checkPermission(ctx, check, perms).ok).toBe(true)
  })

  it("denies when any single permission in the set is false (property)", () => {
    // Exclude isClinicAdmin from the key pool: when isClinicAdmin is true in the
    // permissions object, isPermissionPresent grants everything — so setting another
    // key to false still passes. We test the admin bypass separately.
    const nonAdminKeys = ALL_PERMISSION_KEYS.filter((k) => k !== "isClinicAdmin")
    const arbNonAdminKeys = fc
      .subarray([...nonAdminKeys], { minLength: 2 })
      .map((arr) => [...arr] as UserPermissionsT[])

    fc.assert(
      fc.property(arbNormalCtx, arbNonAdminKeys, (ctx, keys) => {
        // Set all to true, then pick the last one to set to false
        const overrides: Partial<T> = { isClinicAdmin: false }
        for (const k of keys) overrides[k] = true
        const falseKey = keys[keys.length - 1]
        overrides[falseKey] = false

        const perms = makePermissions(overrides)
        const check = Check.requireAll(keys)
        const result = Check.checkPermission(ctx, check, perms)
        expect(result.ok).toBe(false)
      }),
    )
  })
})

// =========================================================================
// Check.checkPermission — requireAny
// =========================================================================

describe("Check.checkPermission — requireAny", () => {
  it("allows when at least one permission is true (property)", () => {
    fc.assert(
      fc.property(
        arbNormalCtx,
        arbPermissionKeys.filter((keys) => keys.length >= 2),
        fc.nat(),
        (ctx, keys, seed) => {
          // Set all false, then pick one to set true
          const overrides: Partial<T> = { isClinicAdmin: false }
          for (const k of keys) overrides[k] = false
          const trueKey = keys[seed % keys.length]
          overrides[trueKey] = true

          const perms = makePermissions(overrides)
          const check = Check.requireAny(keys)
          expect(Check.checkPermission(ctx, check, perms).ok).toBe(true)
        },
      ),
    )
  })

  it("denies when all permissions are false", () => {
    const ctx = makeCtx()
    const perms = makePermissions({
      isClinicAdmin: false,
      canPrescribeMedications: false,
      canDispenseMedications: false,
    })
    const check = Check.requireAny(["canPrescribeMedications", "canDispenseMedications"])
    const result = Check.checkPermission(ctx, check, perms)
    expect(result.ok).toBe(false)
  })
})

// =========================================================================
// Check.checkEditEventPermission
// =========================================================================

describe("Check.checkEditEventPermission", () => {
  it("allows editing own event with canEditRecords", () => {
    const ctx = makeCtx({ userId: "user-1" })
    const perms = makePermissions({ canEditRecords: true })
    const result = Check.checkEditEventPermission(ctx, perms, "user-1")
    expect(result.ok).toBe(true)
  })

  it("denies editing own event without canEditRecords", () => {
    const ctx = makeCtx({ userId: "user-1" })
    const perms = makePermissions({ canEditRecords: false })
    const result = Check.checkEditEventPermission(ctx, perms, "user-1")
    expect(result.ok).toBe(false)
  })

  it("allows editing another provider's event with both permissions", () => {
    const ctx = makeCtx({ userId: "user-1" })
    const perms = makePermissions({
      canEditRecords: true,
      canEditOtherProviderEvent: true,
    })
    const result = Check.checkEditEventPermission(ctx, perms, "user-2")
    expect(result.ok).toBe(true)
  })

  it("denies editing another provider's event without canEditOtherProviderEvent", () => {
    const ctx = makeCtx({ userId: "user-1" })
    const perms = makePermissions({
      canEditRecords: true,
      canEditOtherProviderEvent: false,
    })
    const result = Check.checkEditEventPermission(ctx, perms, "user-2")
    expect(result.ok).toBe(false)
  })

  it("denies editing another provider's event without canEditRecords", () => {
    const ctx = makeCtx({ userId: "user-1" })
    const perms = makePermissions({
      canEditRecords: false,
      canEditOtherProviderEvent: true,
    })
    const result = Check.checkEditEventPermission(ctx, perms, "user-2")
    expect(result.ok).toBe(false)
  })

  it("super_admin can always edit any event (property)", () => {
    const ctx = makeCtx({ userId: "user-1", role: "super_admin" })
    fc.assert(
      fc.property(fc.uuid(), arbPermissions, (creatorId, perms) => {
        const result = Check.checkEditEventPermission(ctx, perms, creatorId)
        expect(result.ok).toBe(true)
      }),
    )
  })

  it("isClinicAdmin can always edit any event (property)", () => {
    fc.assert(
      fc.property(arbNormalCtx, fc.uuid(), (ctx, creatorId) => {
        const perms = makePermissions({ isClinicAdmin: true })
        const result = Check.checkEditEventPermission(ctx, perms, creatorId)
        expect(result.ok).toBe(true)
      }),
    )
  })

  // --- Edge cases ---

  it("empty string eventCreatedByUserId with non-empty userId → treated as other provider", () => {
    const ctx = makeCtx({ userId: "user-1" })
    const perms = makePermissions({
      canEditRecords: true,
      canEditOtherProviderEvent: false,
    })
    // Empty string !== "user-1", so it's another provider's event
    const result = Check.checkEditEventPermission(ctx, perms, "")
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.permission).toBe("canEditOtherProviderEvent")
    }
  })

  it("both userId and eventCreatedByUserId empty strings → treated as own event", () => {
    const ctx = makeCtx({ userId: "" })
    const perms = makePermissions({
      canEditRecords: true,
      canEditOtherProviderEvent: false,
    })
    // "" === "" → own event, only canEditRecords needed
    const result = Check.checkEditEventPermission(ctx, perms, "")
    expect(result.ok).toBe(true)
  })

  it("null eventCreatedByUserId at runtime → treated as other provider (never matches userId)", () => {
    const ctx = makeCtx({ userId: "user-1" })
    const perms = makePermissions({
      canEditRecords: true,
      canEditOtherProviderEvent: false,
    })
    // TypeScript says string, but runtime could pass null
    const result = Check.checkEditEventPermission(ctx, perms, null as unknown as string)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.permission).toBe("canEditOtherProviderEvent")
    }
  })

  it("null eventCreatedByUserId + canEditOtherProviderEvent true → allowed", () => {
    const ctx = makeCtx({ userId: "user-1" })
    const perms = makePermissions({
      canEditRecords: true,
      canEditOtherProviderEvent: true,
    })
    const result = Check.checkEditEventPermission(ctx, perms, null as unknown as string)
    expect(result.ok).toBe(true)
  })

  it("null permissions → denied regardless of eventCreatedByUserId", () => {
    const ctx = makeCtx({ userId: "user-1" })
    const result = Check.checkEditEventPermission(ctx, null, "user-1")
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error._tag).toBe("PermissionDenied")
    }
  })
})

// =========================================================================
// OPERATION_PERMISSIONS
// =========================================================================

describe("Check.OPERATION_PERMISSIONS", () => {
  it("every operation maps to a valid PermissionCheck", () => {
    for (const [opName, check] of Object.entries(Check.OPERATION_PERMISSIONS)) {
      expect(check).toBeDefined()
      expect(["single", "all", "any"]).toContain(check.kind)

      // Verify all referenced permission keys exist on the T type
      if (check.kind === "single") {
        expect(ALL_PERMISSION_KEYS).toContain(check.permission)
      } else {
        for (const p of check.permissions) {
          expect(ALL_PERMISSION_KEYS).toContain(p)
        }
      }
    }
  })

  it("contains all expected operations", () => {
    const expectedOps: Check.OperationName[] = [
      "patient:register",
      "patient:edit",
      "patient:delete",
      "patient:downloadReport",
      "visit:create",
      "visit:delete",
      "event:create",
      "event:edit",
      "event:delete",
      "prescription:create",
      "prescription:updateStatus",
      "prescription:dispense",
      "vitals:create",
      "diagnosis:create",
      "diagnosis:edit",
      "appointment:create",
      "appointment:update",
      "appointment:markComplete",
    ]
    for (const op of expectedOps) {
      expect(Check.OPERATION_PERMISSIONS).toHaveProperty(op)
    }
  })

  it("every operation check succeeds for super_admin with null permissions (property)", () => {
    const ctx = makeCtx({ role: "super_admin" })
    fc.assert(
      fc.property(
        fc.constantFrom(...(Object.keys(Check.OPERATION_PERMISSIONS) as Check.OperationName[])),
        (opName) => {
          const check = Check.OPERATION_PERMISSIONS[opName]
          const result = Check.checkPermission(ctx, check, null)
          expect(result.ok).toBe(true)
        },
      ),
    )
  })

  it("every operation check denies for null permissions with normal user (property)", () => {
    fc.assert(
      fc.property(
        arbNormalCtx,
        fc.constantFrom(...(Object.keys(Check.OPERATION_PERMISSIONS) as Check.OperationName[])),
        (ctx, opName) => {
          const check = Check.OPERATION_PERMISSIONS[opName]
          const result = Check.checkPermission(ctx, check, null)
          expect(result.ok).toBe(false)
        },
      ),
    )
  })
})
