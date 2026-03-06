import { renderHook, act, waitFor } from "@testing-library/react-native"
import { Option } from "effect"
import { makePermissions } from "../helpers/permissionTestHelpers"
import UserClinicPermissions from "../../app/models/UserClinicPermissions"

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

// Mock providerStore — controls userId, role, clinicId
let mockStoreState = {
  id: "user-1",
  role: Option.some("provider" as const) as Option.Option<string>,
  clinic_id: Option.some("clinic-1") as Option.Option<string>,
}

jest.mock("@xstate/react", () => ({
  useSelector: jest.fn((_store: any, selector: (state: any) => any) => {
    return selector({ context: mockStoreState })
  }),
}))

jest.mock("@/store/provider", () => ({
  providerStore: {},
}))

// Mock AppConfig — controls the global disable toggle
let mockPermissionsDisabled: unknown = false

jest.mock("@/models/AppConfig", () => ({
  __esModule: true,
  default: {
    DB: {
      getValue: jest.fn(() => Promise.resolve(mockPermissionsDisabled)),
    },
    Namespaces: { AUTH: "AUTH" },
  },
}))

// Mock UserClinicPermissions.DB.subscribe — controls live permission updates
type SubscribeCallback = (perms: Option.Option<UserClinicPermissions.T>, loading: boolean) => void

let subscribeCallback: SubscribeCallback | null = null
const mockUnsubscribe = jest.fn()

jest.mock("@/models/UserClinicPermissions", () => {
  const actual = jest.requireActual("@/models/UserClinicPermissions")
  return {
    __esModule: true,
    default: {
      ...actual.default,
      DB: {
        ...actual.default?.DB,
        subscribe: jest.fn((_userId: string, _clinicId: string, cb: SubscribeCallback) => {
          subscribeCallback = cb
          return { unsubscribe: mockUnsubscribe }
        }),
      },
    },
  }
})

import { usePermissionGuard } from "../../app/hooks/usePermissionGuard"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
beforeEach(() => {
  mockStoreState = {
    id: "user-1",
    role: Option.some("provider" as const),
    clinic_id: Option.some("clinic-1"),
  }
  mockPermissionsDisabled = false
  subscribeCallback = null
  mockUnsubscribe.mockClear()
})

function simulatePermissionUpdate(perms: UserClinicPermissions.T | null, loading = false) {
  if (subscribeCallback) {
    act(() => {
      subscribeCallback!(Option.fromNullable(perms), loading)
    })
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("usePermissionGuard", () => {
  describe("loading states", () => {
    it("starts with isLoading true", () => {
      const { result } = renderHook(() => usePermissionGuard())
      expect(result.current.isLoading).toBe(true)
    })

    it("can() returns false while isLoading", () => {
      const { result } = renderHook(() => usePermissionGuard())
      expect(result.current.can("patient:register")).toBe(false)
    })

    it("isLoading becomes false after subscription fires", async () => {
      const { result } = renderHook(() => usePermissionGuard())
      const perms = makePermissions({ canRegisterPatients: true })
      simulatePermissionUpdate(perms, false)
      await waitFor(() => expect(result.current.isLoading).toBe(false))
    })
  })

  describe("context edge cases", () => {
    it("sets permissions to null and isLoading to false when clinicId is null", async () => {
      mockStoreState.clinic_id = Option.none()
      const { result } = renderHook(() => usePermissionGuard())
      await waitFor(() => expect(result.current.isLoading).toBe(false))
      expect(result.current.permissions).toBeNull()
    })

    it("sets permissions to null when userId is empty", async () => {
      mockStoreState.id = ""
      const { result } = renderHook(() => usePermissionGuard())
      await waitFor(() => expect(result.current.isLoading).toBe(false))
      expect(result.current.permissions).toBeNull()
    })

    it("super_admin role allows all checks even with null permissions", async () => {
      mockStoreState.role = Option.some("super_admin")
      mockStoreState.clinic_id = Option.none()
      const { result } = renderHook(() => usePermissionGuard())
      await waitFor(() => expect(result.current.isLoading).toBe(false))
      // permissions are null, but super_admin bypasses
      const res = result.current.checkOperation("patient:register")
      expect(res.ok).toBe(true)
    })
  })

  describe("global disable toggle", () => {
    it("allows all checks when isPermissionsDisabled is true", async () => {
      mockPermissionsDisabled = true
      const { result } = renderHook(() => usePermissionGuard())
      // Wait for AppConfig effect to resolve
      await waitFor(() => {
        const res = result.current.checkOperation("patient:register")
        expect(res.ok).toBe(true)
      })
    })

    it('allows all checks when isPermissionsDisabled is "true" (string)', async () => {
      mockPermissionsDisabled = "true"
      const { result } = renderHook(() => usePermissionGuard())
      await waitFor(() => {
        const res = result.current.checkOperation("patient:register")
        expect(res.ok).toBe(true)
      })
    })

    it("normal checking when isPermissionsDisabled is false", async () => {
      mockPermissionsDisabled = false
      const { result } = renderHook(() => usePermissionGuard())
      // Permissions are null at this point (no subscription fired yet)
      // Normal user with null permissions → denied
      const res = result.current.checkOperation("patient:register")
      expect(res.ok).toBe(false)
    })

    it("normal checking when isPermissionsDisabled is undefined", async () => {
      mockPermissionsDisabled = undefined
      const { result } = renderHook(() => usePermissionGuard())
      const res = result.current.checkOperation("patient:register")
      expect(res.ok).toBe(false)
    })
  })

  describe("permission checks", () => {
    it("check() returns ok for an allowed permission", async () => {
      const { result } = renderHook(() => usePermissionGuard())
      const perms = makePermissions({ canEditRecords: true })
      simulatePermissionUpdate(perms)
      await waitFor(() => expect(result.current.isLoading).toBe(false))

      const res = result.current.check(
        UserClinicPermissions.Check.requirePermission("canEditRecords"),
      )
      expect(res.ok).toBe(true)
    })

    it("check() returns err for a denied permission", async () => {
      const { result } = renderHook(() => usePermissionGuard())
      const perms = makePermissions({ canEditRecords: false })
      simulatePermissionUpdate(perms)
      await waitFor(() => expect(result.current.isLoading).toBe(false))

      const res = result.current.check(
        UserClinicPermissions.Check.requirePermission("canEditRecords"),
      )
      expect(res.ok).toBe(false)
      if (!res.ok) {
        expect(res.error._tag).toBe("PermissionDenied")
      }
    })

    it("checkOperation returns ok when the operation's permission is granted", async () => {
      const { result } = renderHook(() => usePermissionGuard())
      const perms = makePermissions({ canRegisterPatients: true })
      simulatePermissionUpdate(perms)
      await waitFor(() => expect(result.current.isLoading).toBe(false))

      expect(result.current.checkOperation("patient:register").ok).toBe(true)
    })

    it("checkOperation returns err when the operation's permission is denied", async () => {
      const { result } = renderHook(() => usePermissionGuard())
      const perms = makePermissions({ canRegisterPatients: false })
      simulatePermissionUpdate(perms)
      await waitFor(() => expect(result.current.isLoading).toBe(false))

      const res = result.current.checkOperation("patient:register")
      expect(res.ok).toBe(false)
    })

    it("checkEditEvent allows editing own event with canEditRecords", async () => {
      const { result } = renderHook(() => usePermissionGuard())
      const perms = makePermissions({ canEditRecords: true })
      simulatePermissionUpdate(perms)
      await waitFor(() => expect(result.current.isLoading).toBe(false))

      // "user-1" matches the store's userId
      expect(result.current.checkEditEvent("user-1").ok).toBe(true)
    })

    it("checkEditEvent denies editing other provider's event without canEditOtherProviderEvent", async () => {
      const { result } = renderHook(() => usePermissionGuard())
      const perms = makePermissions({
        canEditRecords: true,
        canEditOtherProviderEvent: false,
      })
      simulatePermissionUpdate(perms)
      await waitFor(() => expect(result.current.isLoading).toBe(false))

      const res = result.current.checkEditEvent("other-user")
      expect(res.ok).toBe(false)
    })

    it("checkEditEvent allows editing other provider's event with both permissions", async () => {
      const { result } = renderHook(() => usePermissionGuard())
      const perms = makePermissions({
        canEditRecords: true,
        canEditOtherProviderEvent: true,
      })
      simulatePermissionUpdate(perms)
      await waitFor(() => expect(result.current.isLoading).toBe(false))

      expect(result.current.checkEditEvent("other-user").ok).toBe(true)
    })

    it("checkEditEvent with empty string eventCreatedByUserId treated as other provider", async () => {
      const { result } = renderHook(() => usePermissionGuard())
      const perms = makePermissions({
        canEditRecords: true,
        canEditOtherProviderEvent: false,
      })
      simulatePermissionUpdate(perms)
      await waitFor(() => expect(result.current.isLoading).toBe(false))

      // "" !== "user-1", so it's treated as another provider's event
      const res = result.current.checkEditEvent("")
      expect(res.ok).toBe(false)
    })

    it("can() returns boolean true for allowed operation", async () => {
      const { result } = renderHook(() => usePermissionGuard())
      const perms = makePermissions({ canEditRecords: true })
      simulatePermissionUpdate(perms)
      await waitFor(() => expect(result.current.isLoading).toBe(false))

      expect(result.current.can("event:create")).toBe(true)
    })

    it("can() returns boolean false for denied operation", async () => {
      const { result } = renderHook(() => usePermissionGuard())
      const perms = makePermissions({ canEditRecords: false })
      simulatePermissionUpdate(perms)
      await waitFor(() => expect(result.current.isLoading).toBe(false))

      expect(result.current.can("event:create")).toBe(false)
    })

    it("isClinicAdmin grants all operations", async () => {
      const { result } = renderHook(() => usePermissionGuard())
      const perms = makePermissions({ isClinicAdmin: true })
      simulatePermissionUpdate(perms)
      await waitFor(() => expect(result.current.isLoading).toBe(false))

      expect(result.current.can("patient:register")).toBe(true)
      expect(result.current.can("prescription:create")).toBe(true)
      expect(result.current.can("prescription:dispense")).toBe(true)
      expect(result.current.can("event:delete")).toBe(true)
    })
  })

  describe("subscription lifecycle", () => {
    it("calls unsubscribe on unmount", () => {
      const { unmount } = renderHook(() => usePermissionGuard())
      unmount()
      expect(mockUnsubscribe).toHaveBeenCalled()
    })
  })
})
