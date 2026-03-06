/**
 * Tests for the new entity hooks: vitals, problems, and form events.
 * Covers both read hooks and mutation hooks.
 */

import React from "react"
import { renderHook, act, waitFor } from "@testing-library/react-native"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { Option } from "effect"
import { useProviderVitals } from "../../app/hooks/useProviderVitals"
import { useProviderPatientProblems } from "../../app/hooks/useProviderPatientProblems"
import { useProviderFormEvents } from "../../app/hooks/useProviderFormEvents"
import { useCreateVitals } from "../../app/hooks/useCreateVitals"
import { useCreateProblem } from "../../app/hooks/useCreateProblem"
import { useUpdateProblem } from "../../app/hooks/useUpdateProblem"
import { useDeleteEvent } from "../../app/hooks/useDeleteEvent"
import type { DataProvider } from "../../types/data"
import { ok, err } from "../../types/data"

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------

const MOCK_VITAL = {
  id: "vit-1",
  patientId: "p1",
  timestamp: new Date("2024-06-01"),
  systolicBp: Option.some(120),
  diastolicBp: Option.some(80),
  bpPosition: Option.some("sitting"),
  pulseRate: Option.some(72),
  temperatureCelsius: Option.some(37.0),
  oxygenSaturation: Option.some(98),
  respiratoryRate: Option.some(16),
  painLevel: Option.some(2),
  heightCm: Option.some(175),
  weightKg: Option.some(70),
  bmi: Option.some(22.9),
  waistCircumferenceCm: Option.none(),
  isDeleted: false,
  deletedAt: Option.none(),
  createdAt: new Date("2024-06-01"),
  updatedAt: new Date("2024-06-01"),
}

const MOCK_PROBLEM = {
  id: "prob-1",
  patientId: "p1",
  icdCode: "J06.9",
  description: "Upper respiratory infection",
  severity: "moderate",
  status: "active" as const,
  onsetDate: Option.some(new Date("2024-05-15")),
  resolvedDate: Option.none(),
  notes: Option.some("Patient presented with cough"),
  isDeleted: false,
  deletedAt: Option.none(),
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
  deletedAt: Option.none(),
  recordedByUserId: "user-1",
  createdAt: new Date("2024-06-01"),
  updatedAt: new Date("2024-06-01"),
}

// ---------------------------------------------------------------------------
// Mock DataProvider
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
    getByFormAndPatient: jest.fn().mockResolvedValue(ok([MOCK_EVENT])),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn().mockResolvedValue(ok(undefined)),
  },
  vitals: {
    getByPatient: jest.fn().mockResolvedValue(ok([MOCK_VITAL])),
    create: jest.fn().mockResolvedValue(ok({ id: "vit-new" })),
  },
  problems: {
    getByPatient: jest.fn().mockResolvedValue(ok([MOCK_PROBLEM])),
    getById: jest.fn().mockResolvedValue(ok(MOCK_PROBLEM)),
    create: jest.fn().mockResolvedValue(ok({ id: "prob-new" })),
    update: jest.fn().mockResolvedValue(ok(MOCK_PROBLEM)),
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
// Test wrapper
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
  jest.clearAllMocks()
})

// ---------------------------------------------------------------------------
// Read hook tests
// ---------------------------------------------------------------------------

describe("useProviderVitals", () => {
  it("returns vitals for a patient", async () => {
    const { result } = renderHook(() => useProviderVitals("p1"), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toHaveLength(1)
    expect(result.current.data?.[0].id).toBe("vit-1")
    expect(mockProvider.vitals.getByPatient).toHaveBeenCalledWith("p1")
  })

  it("does not fetch when patientId is null", () => {
    const { result } = renderHook(() => useProviderVitals(null), {
      wrapper: createWrapper(),
    })

    expect(result.current.fetchStatus).toBe("idle")
    expect(mockProvider.vitals.getByPatient).not.toHaveBeenCalled()
  })
})

describe("useProviderPatientProblems", () => {
  it("returns problems for a patient", async () => {
    const { result } = renderHook(() => useProviderPatientProblems("p1"), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toHaveLength(1)
    expect(result.current.data?.[0].id).toBe("prob-1")
    expect(result.current.data?.[0].icdCode).toBe("J06.9")
    expect(mockProvider.problems.getByPatient).toHaveBeenCalledWith("p1")
  })

  it("does not fetch when patientId is undefined", () => {
    const { result } = renderHook(() => useProviderPatientProblems(undefined), {
      wrapper: createWrapper(),
    })

    expect(result.current.fetchStatus).toBe("idle")
    expect(mockProvider.problems.getByPatient).not.toHaveBeenCalled()
  })
})

describe("useProviderFormEvents", () => {
  it("returns events for a form and patient", async () => {
    const { result } = renderHook(() => useProviderFormEvents("f1", "p1"), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toHaveLength(1)
    expect(result.current.data?.[0].id).toBe("e1")
    expect(result.current.data?.[0].formId).toBe("f1")
    expect(mockProvider.events.getByFormAndPatient).toHaveBeenCalledWith("f1", "p1")
  })

  it("does not fetch when formId is null", () => {
    const { result } = renderHook(() => useProviderFormEvents(null, "p1"), {
      wrapper: createWrapper(),
    })

    expect(result.current.fetchStatus).toBe("idle")
    expect(mockProvider.events.getByFormAndPatient).not.toHaveBeenCalled()
  })

  it("does not fetch when patientId is null", () => {
    const { result } = renderHook(() => useProviderFormEvents("f1", null), {
      wrapper: createWrapper(),
    })

    expect(result.current.fetchStatus).toBe("idle")
    expect(mockProvider.events.getByFormAndPatient).not.toHaveBeenCalled()
  })
})

// ---------------------------------------------------------------------------
// Mutation hook tests
// ---------------------------------------------------------------------------

describe("useCreateVitals", () => {
  it("calls provider.vitals.create and returns the new id", async () => {
    const { result } = renderHook(() => useCreateVitals(), { wrapper: createWrapper() })

    act(() => {
      result.current.mutate({
        patientId: "p1",
        timestamp: new Date("2024-06-01"),
        systolicBp: Option.some(120),
        diastolicBp: Option.some(80),
        bpPosition: Option.some("sitting"),
        pulseRate: Option.some(72),
        temperatureCelsius: Option.some(37.0),
        oxygenSaturation: Option.some(98),
        respiratoryRate: Option.some(16),
        painLevel: Option.some(2),
        heightCm: Option.some(175),
        weightKg: Option.some(70),
        bmi: Option.some(22.9),
        waistCircumferenceCm: Option.none(),
        isDeleted: false,
      })
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data?.id).toBe("vit-new")
    expect(mockProvider.vitals.create).toHaveBeenCalled()
  })

  it("surfaces DataProviderError on failure", async () => {
    ;(mockProvider.vitals.create as jest.Mock).mockResolvedValueOnce(
      err({ _tag: "ServerError" as const, message: "Internal error" }),
    )

    const { result } = renderHook(() => useCreateVitals(), { wrapper: createWrapper() })

    act(() => {
      result.current.mutate({
        patientId: "p1",
        timestamp: new Date(),
        systolicBp: Option.none(),
        diastolicBp: Option.none(),
        bpPosition: Option.none(),
        pulseRate: Option.none(),
        temperatureCelsius: Option.none(),
        oxygenSaturation: Option.none(),
        respiratoryRate: Option.none(),
        painLevel: Option.none(),
        heightCm: Option.none(),
        weightKg: Option.none(),
        bmi: Option.none(),
        waistCircumferenceCm: Option.none(),
        isDeleted: false,
      })
    })

    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(result.current.error?.message).toBe("Internal error")
  })
})

describe("useCreateProblem", () => {
  it("calls provider.problems.create and returns the new id", async () => {
    const { result } = renderHook(() => useCreateProblem(), { wrapper: createWrapper() })

    act(() => {
      result.current.mutate({
        patientId: "p1",
        icdCode: "J06.9",
        description: "Upper respiratory infection",
        severity: "moderate",
        status: "active",
        onsetDate: Option.some(new Date("2024-05-15")),
        resolvedDate: Option.none(),
        notes: Option.some("Cough and sore throat"),
        isDeleted: false,
      })
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data?.id).toBe("prob-new")
    expect(mockProvider.problems.create).toHaveBeenCalled()
  })
})

describe("useUpdateProblem", () => {
  it("calls provider.problems.update and returns updated problem", async () => {
    const { result } = renderHook(() => useUpdateProblem(), { wrapper: createWrapper() })

    act(() => {
      result.current.mutate({
        id: "prob-1",
        data: { status: "resolved", resolvedDate: Option.some(new Date("2024-06-15")) },
      })
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data?.id).toBe("prob-1")
    expect(mockProvider.problems.update).toHaveBeenCalledWith("prob-1", {
      status: "resolved",
      resolvedDate: Option.some(new Date("2024-06-15")),
    })
  })
})

describe("useDeleteEvent", () => {
  it("calls provider.events.delete", async () => {
    const { result } = renderHook(() => useDeleteEvent(), { wrapper: createWrapper() })

    act(() => {
      result.current.mutate("e1")
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(mockProvider.events.delete).toHaveBeenCalledWith("e1")
  })
})
