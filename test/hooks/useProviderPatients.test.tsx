/**
 * Happy-path tests for the useProviderPatients read hook.
 * Verifies it correctly wires DataProvider results through React Query.
 */

import React from "react"
import { renderHook, waitFor } from "@testing-library/react-native"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { useProviderPatients } from "../../app/hooks/useProviderPatients"
import { useProviderPatient } from "../../app/hooks/useProviderPatient"
import { useProviderPatientVisits } from "../../app/hooks/useProviderPatientVisits"
import { useProviderVisitEvents } from "../../app/hooks/useProviderVisitEvents"
import type { DataProvider } from "../../types/data"
import { ok } from "../../types/data"

// ---------------------------------------------------------------------------
// Mock DataProvider
// ---------------------------------------------------------------------------

const MOCK_PATIENT = {
  id: "p1",
  givenName: "Jane",
  surname: "Doe",
  dateOfBirth: "1990-05-15",
  citizenship: "US",
  hometown: "Portland",
  phone: "555-1234",
  sex: "female",
  camp: "",
  photoUrl: "",
  governmentId: "GOV123",
  externalPatientId: "",
  additionalData: {},
  metadata: {},
  isDeleted: false,
  deletedAt: null,
  createdAt: new Date("2024-01-01"),
  updatedAt: new Date("2024-06-01"),
}

const MOCK_VISIT = {
  id: "v1",
  patientId: "p1",
  clinicId: "c1",
  providerId: "pr1",
  providerName: "Dr. Test",
  checkInTimestamp: new Date("2024-06-01"),
  isDeleted: false,
  deletedAt: null,
  metadata: null,
  createdAt: new Date("2024-06-01"),
  updatedAt: new Date("2024-06-01"),
}

const MOCK_EVENT = {
  id: "e1",
  patientId: "p1",
  visitId: "v1",
  eventType: "form",
  formId: "f1",
  formData: [],
  metadata: {},
  isDeleted: false,
  deletedAt: null,
  createdAt: new Date("2024-06-01"),
  updatedAt: new Date("2024-06-01"),
}

/** Minimal mock provider that returns canned ok() results */
const mockProvider: DataProvider = {
  patients: {
    getMany: jest
      .fn()
      .mockResolvedValue(
        ok({
          data: [MOCK_PATIENT],
          pagination: { offset: 0, limit: 10, total: 1, hasMore: false },
        }),
      ),
    getById: jest.fn().mockResolvedValue(ok(MOCK_PATIENT)),
    create: jest.fn().mockResolvedValue(ok({ id: "p1" })),
    update: jest.fn().mockResolvedValue(ok(MOCK_PATIENT)),
  },
  visits: {
    getByPatient: jest
      .fn()
      .mockResolvedValue(
        ok({ items: [MOCK_VISIT], pagination: { offset: 0, limit: 10, total: 1, hasMore: false } }),
      ),
    create: jest.fn().mockResolvedValue(ok({ id: "v1" })),
  },
  events: {
    getByVisit: jest.fn().mockResolvedValue(ok([MOCK_EVENT])),
    create: jest.fn().mockResolvedValue(ok({ eventId: "e1", visitId: "v1" })),
    update: jest.fn().mockResolvedValue(ok(MOCK_EVENT)),
  },
}

// ---------------------------------------------------------------------------
// Mock useDataAccess to return our mock provider
// ---------------------------------------------------------------------------

jest.mock("../../app/providers/DataAccessProvider", () => ({
  useDataAccess: () => ({
    mode: "online",
    provider: mockProvider,
    isOnline: true,
  }),
}))

// ---------------------------------------------------------------------------
// Test wrapper with fresh QueryClient per test
// ---------------------------------------------------------------------------

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  })
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("useProviderPatients", () => {
  it("returns paginated patients on success", async () => {
    const { result } = renderHook(() => useProviderPatients({ limit: 10 }), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data?.data).toHaveLength(1)
    expect(result.current.data?.data[0].givenName).toBe("Jane")
    expect(result.current.data?.pagination.total).toBe(1)
    expect(mockProvider.patients.getMany).toHaveBeenCalledWith({ limit: 10 })
  })
})

describe("useProviderPatient", () => {
  it("returns a single patient by id", async () => {
    const { result } = renderHook(() => useProviderPatient("p1"), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data?.givenName).toBe("Jane")
    expect(mockProvider.patients.getById).toHaveBeenCalledWith("p1")
  })

  it("does not fetch when id is falsy", () => {
    const { result } = renderHook(() => useProviderPatient(null), {
      wrapper: createWrapper(),
    })

    expect(result.current.fetchStatus).toBe("idle")
  })
})

describe("useProviderPatientVisits", () => {
  it("returns visits for a patient", async () => {
    const { result } = renderHook(() => useProviderPatientVisits("p1"), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data?.items).toHaveLength(1)
    expect(result.current.data?.items[0].id).toBe("v1")
  })
})

describe("useProviderVisitEvents", () => {
  it("returns events for a visit", async () => {
    const { result } = renderHook(() => useProviderVisitEvents("v1", "p1"), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toHaveLength(1)
    expect(result.current.data?.[0].id).toBe("e1")
  })
})
