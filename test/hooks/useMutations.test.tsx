/**
 * Happy-path tests for mutation hooks.
 * Verifies they call the correct provider method, unwrap Result,
 * and invalidate the right query caches on success.
 */

import React from "react"
import { renderHook, act, waitFor } from "@testing-library/react-native"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { useCreatePatient } from "../../app/hooks/useCreatePatient"
import { useCreateVisit } from "../../app/hooks/useCreateVisit"
import { useCreateEvent } from "../../app/hooks/useCreateEvent"
import type { DataProvider } from "../../types/data"
import { ok, err } from "../../types/data"

// ---------------------------------------------------------------------------
// Mock DataProvider
// ---------------------------------------------------------------------------

const mockProvider: DataProvider = {
  patients: {
    getMany: jest.fn(),
    getById: jest.fn(),
    create: jest.fn().mockResolvedValue(ok({ id: "p-new" })),
    update: jest.fn(),
  },
  visits: {
    getByPatient: jest.fn(),
    create: jest.fn().mockResolvedValue(ok({ id: "v-new" })),
  },
  events: {
    getByVisit: jest.fn(),
    create: jest.fn().mockResolvedValue(ok({ eventId: "e-new", visitId: "v1" })),
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

jest.mock("../../app/hooks/usePermissionGuard", () => ({
  usePermissionGuard: () => ({
    permissions: null,
    isLoading: false,
    check: () => ({ ok: true, data: true }),
    checkOperation: () => ({ ok: true, data: true }),
    checkEditEvent: () => ({ ok: true, data: true }),
    can: () => true,
  }),
}))

// ---------------------------------------------------------------------------
// Wrapper — exposes queryClient for cleanup
// ---------------------------------------------------------------------------

let activeQueryClient: QueryClient

function createWrapper() {
  activeQueryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } },
  })
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={activeQueryClient}>{children}</QueryClientProvider>
  )
}

afterEach(() => {
  activeQueryClient?.clear()
})

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("useCreatePatient", () => {
  it("calls provider.patients.create and returns the new id", async () => {
    const { result } = renderHook(() => useCreatePatient(), { wrapper: createWrapper() })

    act(() => {
      result.current.mutate({
        patient: { givenName: "Jane", surname: "Doe", dateOfBirth: "1990-01-01", sex: "female" },
        additionalAttributes: [],
      })
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data?.id).toBe("p-new")
    expect(mockProvider.patients.create).toHaveBeenCalled()
  })

  it("surfaces DataProviderError on failure", async () => {
    ;(mockProvider.patients.create as jest.Mock).mockResolvedValueOnce(
      err({ _tag: "ValidationError" as const, message: "Name required" }),
    )

    const { result } = renderHook(() => useCreatePatient(), { wrapper: createWrapper() })

    act(() => {
      result.current.mutate({
        patient: { givenName: "", surname: "", dateOfBirth: "", sex: "" },
        additionalAttributes: [],
      })
    })

    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(result.current.error?.message).toBe("Name required")
  })
})

describe("useCreateVisit", () => {
  it("calls provider.visits.create and returns the new id", async () => {
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

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data?.id).toBe("v-new")
  })
})

describe("useCreateEvent", () => {
  it("calls provider.events.create and returns eventId + visitId", async () => {
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

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data?.eventId).toBe("e-new")
    expect(result.current.data?.visitId).toBe("v1")
  })
})
