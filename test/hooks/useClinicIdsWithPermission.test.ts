/**
 * Tests for useClinicIdsWithPermission hook.
 *
 * Validates reactive permission subscription via WatermelonDB observables,
 * including super_admin bypass and globally-disabled-permissions paths.
 */

import { act, renderHook, waitFor } from "@testing-library/react-native"
import fc from "fast-check"
import { BehaviorSubject } from "rxjs"

// ── Mocks ────────────────────────────────────────────────────────────

// Jest requires mock-factory variables to start with "mock"
let mockPermissionSubject: BehaviorSubject<{ clinicId: string }[]>
let mockClinicSubject: BehaviorSubject<{ id: string }[]>

const mockPermissionQuery = jest.fn()
const mockClinicQuery = jest.fn()

jest.mock("../../app/db", () => ({
  __esModule: true,
  default: {
    get: (table: string) => {
      if (table === "user_clinic_permissions") {
        return {
          query: (...args: any[]) => {
            mockPermissionQuery(...args)
            return { observe: () => mockPermissionSubject.asObservable() }
          },
        }
      }
      if (table === "clinics") {
        return {
          query: (...args: any[]) => {
            mockClinicQuery(...args)
            return { observe: () => mockClinicSubject.asObservable() }
          },
        }
      }
      throw new Error(`Unexpected table: ${table}`)
    },
  },
}))

let mockRole: string | null = null
jest.mock("@xstate/react", () => ({
  useSelector: (_store: any, selector: any) => {
    return selector({
      context: {
        role: mockRole ? { _tag: "Some", value: mockRole } : { _tag: "None" },
      },
    })
  },
}))

jest.mock("effect", () => ({
  Option: {
    getOrNull: (opt: any) => {
      if (opt && opt._tag === "Some") return opt.value
      return null
    },
  },
}))

let mockAppConfigValue: any = false
jest.mock("../../app/models/AppConfig", () => ({
  __esModule: true,
  default: {
    DB: {
      getValue: jest.fn(() => Promise.resolve(mockAppConfigValue)),
    },
    Namespaces: { AUTH: "auth" },
  },
}))

jest.mock("../../app/store/provider", () => ({
  providerStore: {},
}))

// Import after mocks
import { useClinicIdsWithPermission } from "../../app/hooks/useClinicIdsWithPermission"

// ── Helpers ──────────────────────────────────────────────────────────

function resetSubjects() {
  mockPermissionSubject = new BehaviorSubject<{ clinicId: string }[]>([])
  mockClinicSubject = new BehaviorSubject<{ id: string }[]>([])
}

// ── Tests ────────────────────────────────────────────────────────────

describe("useClinicIdsWithPermission", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    resetSubjects()
    mockRole = null
    mockAppConfigValue = false
  })

  it("returns null clinicIds when userId is null", async () => {
    const { result } = renderHook(() => useClinicIdsWithPermission(null, "canViewHistory"))

    await waitFor(() => {
      expect(result.current.clinicIds).toBeNull()
    })
  })

  it("subscribes to permission records for a normal user", async () => {
    mockRole = "provider"
    mockPermissionSubject = new BehaviorSubject([
      { clinicId: "clinic-1" },
      { clinicId: "clinic-2" },
    ])

    const { result } = renderHook(() =>
      useClinicIdsWithPermission("user-123", "canViewHistory"),
    )

    await waitFor(() => {
      expect(result.current.clinicIds).toEqual(["clinic-1", "clinic-2"])
      expect(result.current.isLoading).toBe(false)
    })
  })

  it("returns all clinic IDs for super_admin", async () => {
    mockRole = "super_admin"
    mockClinicSubject = new BehaviorSubject([
      { id: "clinic-a" },
      { id: "clinic-b" },
      { id: "clinic-c" },
    ])

    const { result } = renderHook(() =>
      useClinicIdsWithPermission("admin-1", "canViewHistory"),
    )

    await waitFor(() => {
      expect(result.current.clinicIds).toEqual(["clinic-a", "clinic-b", "clinic-c"])
      expect(result.current.isLoading).toBe(false)
    })
  })

  it("returns all clinic IDs when permissions are globally disabled", async () => {
    mockRole = "provider"
    mockAppConfigValue = "true"
    mockClinicSubject = new BehaviorSubject([{ id: "clinic-x" }])

    const { result } = renderHook(() =>
      useClinicIdsWithPermission("user-1", "canEditRecords"),
    )

    await waitFor(() => {
      expect(result.current.clinicIds).toEqual(["clinic-x"])
      expect(result.current.isLoading).toBe(false)
    })
  })

  it("reacts to permission changes pushed through the observable", async () => {
    mockRole = "provider"
    mockPermissionSubject = new BehaviorSubject([{ clinicId: "clinic-1" }])

    const { result } = renderHook(() =>
      useClinicIdsWithPermission("user-123", "canViewHistory"),
    )

    await waitFor(() => {
      expect(result.current.clinicIds).toEqual(["clinic-1"])
    })

    // Simulate a live permission change in the DB
    act(() => {
      mockPermissionSubject.next([{ clinicId: "clinic-1" }, { clinicId: "clinic-new" }])
    })

    await waitFor(() => {
      expect(result.current.clinicIds).toEqual(["clinic-1", "clinic-new"])
    })
  })

  it("reacts to clinic additions for super_admin", async () => {
    mockRole = "super_admin"
    mockClinicSubject = new BehaviorSubject([{ id: "clinic-a" }])

    const { result } = renderHook(() =>
      useClinicIdsWithPermission("admin-1", "canViewHistory"),
    )

    await waitFor(() => {
      expect(result.current.clinicIds).toEqual(["clinic-a"])
    })

    act(() => {
      mockClinicSubject.next([{ id: "clinic-a" }, { id: "clinic-b" }])
    })

    await waitFor(() => {
      expect(result.current.clinicIds).toEqual(["clinic-a", "clinic-b"])
    })
  })

  it("returns empty array when user has no matching permissions", async () => {
    mockRole = "provider"
    mockPermissionSubject = new BehaviorSubject<{ clinicId: string }[]>([])

    const { result } = renderHook(() =>
      useClinicIdsWithPermission("user-no-perms", "canDeleteRecords"),
    )

    await waitFor(() => {
      expect(result.current.clinicIds).toEqual([])
      expect(result.current.isLoading).toBe(false)
    })
  })

  // ── Property-based tests ─────────────────────────────────────────

  describe("properties", () => {
    it("clinicIds always matches the IDs from the observable (normal user)", async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(fc.uuid(), { minLength: 0, maxLength: 20 }),
          async (ids) => {
            mockRole = "provider"
            mockAppConfigValue = false
            mockPermissionSubject = new BehaviorSubject(ids.map((id) => ({ clinicId: id })))

            const { result, unmount } = renderHook(() =>
              useClinicIdsWithPermission("user-prop", "canViewHistory"),
            )

            await waitFor(() => {
              expect(result.current.isLoading).toBe(false)
            })

            expect(result.current.clinicIds).toEqual(ids)
            unmount()
          },
        ),
        { numRuns: 20 },
      )
    })

    it("super_admin always sees all clinics regardless of permission name", async () => {
      const permissionArb = fc.constantFrom(
        "canViewHistory" as const,
        "canEditRecords" as const,
        "canDeleteRecords" as const,
        "canRegisterPatients" as const,
      )

      await fc.assert(
        fc.asyncProperty(
          fc.array(fc.uuid(), { minLength: 1, maxLength: 10 }),
          permissionArb,
          async (ids, permission) => {
            mockRole = "super_admin"
            mockAppConfigValue = false
            mockClinicSubject = new BehaviorSubject(ids.map((id) => ({ id })))

            const { result, unmount } = renderHook(() =>
              useClinicIdsWithPermission("admin-prop", permission),
            )

            await waitFor(() => {
              expect(result.current.isLoading).toBe(false)
            })

            expect(result.current.clinicIds).toEqual(ids)
            unmount()
          },
        ),
        { numRuns: 20 },
      )
    })
  })
})
