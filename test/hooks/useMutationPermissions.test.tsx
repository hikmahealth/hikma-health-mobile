/**
 * Permission denial tests for mutation hooks.
 *
 * These are the adversarial counterpart to useMutations.test.tsx.
 * Every mutation hook checks permissions before calling the provider.
 * When permission is denied, the provider must NEVER be called and
 * the mutation must surface a DataProviderError with _tag: "PermissionDenied".
 */

import React from "react"
import { renderHook, act, waitFor } from "@testing-library/react-native"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { useCreatePatient } from "../../app/hooks/useCreatePatient"
import { useCreateVisit } from "../../app/hooks/useCreateVisit"
import { useCreateEvent } from "../../app/hooks/useCreateEvent"
import { useUpdateEvent } from "../../app/hooks/useUpdateEvent"
import { useUpdatePatient } from "../../app/hooks/useUpdatePatient"
import { DataProviderError } from "../../types/data"
import type { DataProvider } from "../../types/data"

// ---------------------------------------------------------------------------
// Mock DataProvider — all methods are spies that should NEVER be called
// ---------------------------------------------------------------------------

const mockProvider: DataProvider = {
  patients: {
    getMany: jest.fn(),
    getById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  visits: {
    getByPatient: jest.fn(),
    create: jest.fn(),
  },
  events: {
    getByVisit: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
}

jest.mock("../../app/providers/DataAccessProvider", () => ({
  useDataAccess: () => ({
    mode: "online",
    provider: mockProvider,
    isOnline: true,
  }),
}))

// ---------------------------------------------------------------------------
// Permission guard mock — default: deny everything
// ---------------------------------------------------------------------------

const mockCheckOperation = jest.fn()
const mockCheckEditEvent = jest.fn()
const mockCheck = jest.fn()
const mockCan = jest.fn(() => false)

jest.mock("../../app/hooks/usePermissionGuard", () => ({
  usePermissionGuard: () => ({
    permissions: null,
    isLoading: false,
    check: mockCheck,
    checkOperation: mockCheckOperation,
    checkEditEvent: mockCheckEditEvent,
    can: mockCan,
  }),
}))

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function denied(permission: string) {
  return {
    ok: false,
    error: { _tag: "PermissionDenied" as const, permission, message: `Denied: ${permission}` },
  }
}

function allowed() {
  return { ok: true, data: true }
}

let activeQueryClient: QueryClient

function createWrapper() {
  activeQueryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  })
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={activeQueryClient}>{children}</QueryClientProvider>
  )
}

// ---------------------------------------------------------------------------
// Setup / Teardown
// ---------------------------------------------------------------------------

beforeEach(() => {
  jest.clearAllMocks()
  // Default: deny all operations
  mockCheckOperation.mockReturnValue(denied("default"))
  mockCheckEditEvent.mockReturnValue(denied("default"))
  mockCheck.mockReturnValue(denied("default"))
})

afterEach(() => {
  activeQueryClient?.clear()
  activeQueryClient?.unmount?.()
})

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("useCreatePatient — permission denied", () => {
  it("throws PermissionDenied and never calls provider.patients.create", async () => {
    mockCheckOperation.mockReturnValue(denied("patient:register"))

    const { result } = renderHook(() => useCreatePatient(), { wrapper: createWrapper() })

    act(() => {
      result.current.mutate({
        patient: { givenName: "Jane", surname: "Doe", dateOfBirth: "1990-01-01", sex: "female" },
        additionalAttributes: [],
      })
    })

    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(result.current.error).toBeInstanceOf(DataProviderError)
    expect((result.current.error as DataProviderError).dataError._tag).toBe("PermissionDenied")
    expect(mockCheckOperation).toHaveBeenCalledWith("patient:register")
    expect(mockProvider.patients.create).not.toHaveBeenCalled()
  })
})

describe("useCreateVisit — permission denied", () => {
  it("throws PermissionDenied and never calls provider.visits.create", async () => {
    mockCheckOperation.mockReturnValue(denied("visit:create"))

    const { result } = renderHook(() => useCreateVisit(), { wrapper: createWrapper() })

    act(() => {
      result.current.mutate({
        patientId: "p1",
        clinicId: "c1",
        providerId: "pr1",
        providerName: "Dr. Test",
        checkInTimestamp: Date.now(),
      })
    })

    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(result.current.error).toBeInstanceOf(DataProviderError)
    expect((result.current.error as DataProviderError).dataError._tag).toBe("PermissionDenied")
    expect(mockCheckOperation).toHaveBeenCalledWith("visit:create")
    expect(mockProvider.visits.create).not.toHaveBeenCalled()
  })
})

describe("useCreateEvent — permission denied", () => {
  it("throws PermissionDenied and never calls provider.events.create", async () => {
    mockCheckOperation.mockReturnValue(denied("event:create"))

    const { result } = renderHook(() => useCreateEvent(), { wrapper: createWrapper() })

    act(() => {
      result.current.mutate({
        patientId: "p1",
        visitId: "v1",
        eventType: "form",
        formId: "f1",
        formData: [],
      })
    })

    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(result.current.error).toBeInstanceOf(DataProviderError)
    expect((result.current.error as DataProviderError).dataError._tag).toBe("PermissionDenied")
    expect(mockCheckOperation).toHaveBeenCalledWith("event:create")
    expect(mockProvider.events.create).not.toHaveBeenCalled()
  })
})

describe("useUpdateEvent — permission denied", () => {
  it("denies via checkOperation when no eventCreatedByUserId", async () => {
    mockCheckOperation.mockReturnValue(denied("event:edit"))

    const { result } = renderHook(() => useUpdateEvent(), { wrapper: createWrapper() })

    act(() => {
      result.current.mutate({
        id: "e1",
        data: { formData: [], metadata: {} },
      })
    })

    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(result.current.error).toBeInstanceOf(DataProviderError)
    expect((result.current.error as DataProviderError).dataError._tag).toBe("PermissionDenied")
    expect(mockCheckOperation).toHaveBeenCalledWith("event:edit")
    expect(mockCheckEditEvent).not.toHaveBeenCalled()
    expect(mockProvider.events.update).not.toHaveBeenCalled()
  })

  it("denies via checkEditEvent when eventCreatedByUserId is provided (other provider's event)", async () => {
    mockCheckEditEvent.mockReturnValue(denied("event:editOtherProvider"))

    const { result } = renderHook(() => useUpdateEvent(), { wrapper: createWrapper() })

    act(() => {
      result.current.mutate({
        id: "e1",
        data: { formData: [], metadata: {} },
        eventCreatedByUserId: "other-user-999",
      })
    })

    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(result.current.error).toBeInstanceOf(DataProviderError)
    expect((result.current.error as DataProviderError).dataError._tag).toBe("PermissionDenied")
    expect(mockCheckEditEvent).toHaveBeenCalledWith("other-user-999")
    expect(mockCheckOperation).not.toHaveBeenCalled()
    expect(mockProvider.events.update).not.toHaveBeenCalled()
  })
})

describe("useUpdatePatient — permission denied", () => {
  it("throws PermissionDenied and never calls provider.patients.update", async () => {
    mockCheckOperation.mockReturnValue(denied("patient:edit"))

    const { result } = renderHook(() => useUpdatePatient(), { wrapper: createWrapper() })

    act(() => {
      result.current.mutate({
        id: "p1",
        data: { givenName: "Updated" },
      })
    })

    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(result.current.error).toBeInstanceOf(DataProviderError)
    expect((result.current.error as DataProviderError).dataError._tag).toBe("PermissionDenied")
    expect(mockCheckOperation).toHaveBeenCalledWith("patient:edit")
    expect(mockProvider.patients.update).not.toHaveBeenCalled()
  })
})

describe("permission allowed but provider fails — error propagation", () => {
  it("useCreatePatient propagates provider error when permission is allowed", async () => {
    mockCheckOperation.mockReturnValue(allowed())
    ;(mockProvider.patients.create as jest.Mock).mockResolvedValueOnce({
      ok: false,
      error: { _tag: "ServerError" as const, message: "DB connection lost" },
    })

    const { result } = renderHook(() => useCreatePatient(), { wrapper: createWrapper() })

    act(() => {
      result.current.mutate({
        patient: { givenName: "Jane", surname: "Doe", dateOfBirth: "1990-01-01", sex: "female" },
        additionalAttributes: [],
      })
    })

    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(result.current.error).toBeInstanceOf(DataProviderError)
    expect((result.current.error as DataProviderError).dataError._tag).toBe("ServerError")
    expect(mockProvider.patients.create).toHaveBeenCalled()
  })

  it("useUpdateEvent propagates provider error when permission is allowed", async () => {
    mockCheckOperation.mockReturnValue(allowed())
    ;(mockProvider.events.update as jest.Mock).mockResolvedValueOnce({
      ok: false,
      error: { _tag: "NotFound" as const, entity: "Event", id: "e-gone" },
    })

    const { result } = renderHook(() => useUpdateEvent(), { wrapper: createWrapper() })

    act(() => {
      result.current.mutate({
        id: "e-gone",
        data: { formData: [], metadata: {} },
      })
    })

    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(result.current.error).toBeInstanceOf(DataProviderError)
    expect((result.current.error as DataProviderError).dataError._tag).toBe("NotFound")
    expect(mockProvider.events.update).toHaveBeenCalled()
  })
})
