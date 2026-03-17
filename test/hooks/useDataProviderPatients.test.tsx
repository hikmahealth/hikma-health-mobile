/**
 * Tests for the unified useDataProviderPatients hook.
 *
 * Online mode: verifies React Query integration with mock DataProvider.
 * Offline mode: verifies WatermelonDB observable subscription is set up and
 * data is transformed through Patient.DB.fromDB.
 */

import React from "react"
import { renderHook, waitFor, act } from "@testing-library/react-native"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { Subject } from "rxjs"
import { Option } from "effect"

import {
  useDataProviderPatients,
  dataProviderPatientsKeys,
} from "../../app/hooks/useDataProviderPatients"
import type { DataProvider } from "../../types/data"
import { ok } from "../../types/data"
import Patient from "../../app/models/Patient"

// ---------------------------------------------------------------------------
// Mock Patient data
// ---------------------------------------------------------------------------

const MOCK_PATIENT_T: Patient.T = {
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
  deletedAt: Option.none(),
  createdAt: new Date("2024-01-01"),
  updatedAt: new Date("2024-06-01"),
}

const MOCK_PATIENT_DB = {
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
  primaryClinicId: "c1",
  lastModifiedBy: "u1",
}

// ---------------------------------------------------------------------------
// Mock provider
// ---------------------------------------------------------------------------

const mockProvider: DataProvider = {
  patients: {
    getMany: jest.fn().mockResolvedValue(
      ok({
        data: [MOCK_PATIENT_T],
        pagination: { offset: 0, limit: 30, total: 1, hasMore: false },
      }),
    ),
    getById: jest.fn().mockResolvedValue(ok(MOCK_PATIENT_T)),
    create: jest.fn().mockResolvedValue(ok({ id: "p1" })),
    update: jest.fn().mockResolvedValue(ok(MOCK_PATIENT_T)),
  },
  visits: {
    getByPatient: jest.fn().mockResolvedValue(ok({ items: [], pagination: { offset: 0, limit: 10, total: 0, hasMore: false } })),
    create: jest.fn().mockResolvedValue(ok({ id: "v1" })),
  },
  events: {
    getByVisit: jest.fn().mockResolvedValue(ok([])),
    getByFormAndPatient: jest.fn().mockResolvedValue(ok([])),
    create: jest.fn().mockResolvedValue(ok({ eventId: "e1", visitId: "v1" })),
    update: jest.fn().mockResolvedValue(ok({})),
    delete: jest.fn().mockResolvedValue(ok(undefined)),
  },
  vitals: {
    getByPatient: jest.fn().mockResolvedValue(ok([])),
    create: jest.fn().mockResolvedValue(ok({ id: "vt1" })),
  },
  problems: {
    getByPatient: jest.fn().mockResolvedValue(ok([])),
    getById: jest.fn().mockResolvedValue(ok(null)),
    create: jest.fn().mockResolvedValue(ok({ id: "pr1" })),
    update: jest.fn().mockResolvedValue(ok({})),
  },
}

// ---------------------------------------------------------------------------
// Mock WatermelonDB
// ---------------------------------------------------------------------------

const patientSubject = new Subject<any[]>()
const countSubject = new Subject<number>()

const mockQuery = jest.fn().mockReturnValue({
  observe: () => patientSubject.asObservable(),
  observeCount: () => countSubject.asObservable(),
  fetch: jest.fn().mockResolvedValue([]),
})

jest.mock("../../app/db", () => ({
  __esModule: true,
  default: {
    get: jest.fn().mockReturnValue({
      query: (...args: any[]) => mockQuery(...args),
    }),
  },
}))

// ---------------------------------------------------------------------------
// Mock useClinicIdsWithPermission (replaces old UserClinicPermissions mock)
// ---------------------------------------------------------------------------

// Stable reference to avoid infinite re-render loops in useEffect dependencies
const mockClinicIds = ["c1", "c2"]
const mockPermissionResult = { clinicIds: mockClinicIds, isLoading: false }

jest.mock("../../app/hooks/useClinicIdsWithPermission", () => ({
  useClinicIdsWithPermission: () => mockPermissionResult,
}))

// ---------------------------------------------------------------------------
// Mock Patient.DB.fromDB
// ---------------------------------------------------------------------------

jest.mock("../../app/models/Patient", () => ({
  __esModule: true,
  default: {
    DB: {
      fromDB: jest.fn((dbPatient: any) => ({
        ...dbPatient,
        deletedAt: { _tag: "None" },
      })),
    },
  },
}))

// ---------------------------------------------------------------------------
// Configurable mock for useDataAccess
// ---------------------------------------------------------------------------

let mockIsOnline = true

jest.mock("../../app/providers/DataAccessProvider", () => ({
  useDataAccess: () => ({
    mode: mockIsOnline ? "online" : "offline",
    provider: mockProvider,
    isOnline: mockIsOnline,
  }),
}))

// ---------------------------------------------------------------------------
// Test wrapper
// ---------------------------------------------------------------------------

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  })
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

const EMPTY_FORM_FIELDS: any[] = []

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

afterAll(() => {
  patientSubject.complete()
  countSubject.complete()
})

describe("useDataProviderPatients", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockIsOnline = true
  })

  describe("online mode", () => {
    it("returns patients from DataProvider via React Query", async () => {
      const { result } = renderHook(
        () => useDataProviderPatients(30, EMPTY_FORM_FIELDS, "user1"),
        { wrapper: createWrapper() },
      )

      await waitFor(() => expect(result.current.isLoading).toBe(false))

      expect(result.current.patients).toHaveLength(1)
      expect(result.current.patients[0].givenName).toBe("Jane")
      expect(result.current.totalCount).toBe(1)
      expect(mockProvider.patients.getMany).toHaveBeenCalled()
    })

    it("expandedSearchAvailable is false in online mode", async () => {
      const { result } = renderHook(
        () => useDataProviderPatients(30, EMPTY_FORM_FIELDS, "user1"),
        { wrapper: createWrapper() },
      )

      expect(result.current.expandedSearchAvailable).toBe(false)
    })

    it("loadMore increases limit for online mode", async () => {
      const { result } = renderHook(
        () => useDataProviderPatients(30, EMPTY_FORM_FIELDS, "user1"),
        { wrapper: createWrapper() },
      )

      await waitFor(() => expect(result.current.isLoading).toBe(false))

      // Reset mock call count
      ;(mockProvider.patients.getMany as jest.Mock).mockClear()

      act(() => {
        result.current.loadMore()
      })

      await waitFor(() => {
        // Default limit is pageSize (30), loadMore adds another pageSize → 60
        expect(mockProvider.patients.getMany).toHaveBeenCalledWith(
          expect.objectContaining({ limit: 60 }),
        )
      })
    })
  })

  describe("offline mode", () => {
    beforeEach(() => {
      mockIsOnline = false
    })

    it("expandedSearchAvailable is true in offline mode", () => {
      const { result } = renderHook(
        () => useDataProviderPatients(30, EMPTY_FORM_FIELDS, "user1"),
        { wrapper: createWrapper() },
      )

      expect(result.current.expandedSearchAvailable).toBe(true)
    })

    it("subscribes to WatermelonDB observables for patient data", async () => {
      const { result } = renderHook(
        () => useDataProviderPatients(30, EMPTY_FORM_FIELDS, "user1"),
        { wrapper: createWrapper() },
      )

      // Emit patient data through the observable
      act(() => {
        patientSubject.next([MOCK_PATIENT_DB])
      })

      await waitFor(() => expect(result.current.patients).toHaveLength(1))
      expect(result.current.patients[0].givenName).toBe("Jane")
    })

    it("subscribes to count observable for totalCount", async () => {
      const { result } = renderHook(
        () => useDataProviderPatients(30, EMPTY_FORM_FIELDS, "user1"),
        { wrapper: createWrapper() },
      )

      act(() => {
        countSubject.next(42)
      })

      await waitFor(() => expect(result.current.totalCount).toBe(42))
    })

    it("does not call DataProvider.patients.getMany in offline mode", async () => {
      renderHook(
        () => useDataProviderPatients(30, EMPTY_FORM_FIELDS, "user1"),
        { wrapper: createWrapper() },
      )

      // Give time for any async calls to settle
      await waitFor(() => {})
      expect(mockProvider.patients.getMany).not.toHaveBeenCalled()
    })
  })

  describe("search", () => {
    it("exposes searchFilter and setSearchField", () => {
      const { result } = renderHook(
        () => useDataProviderPatients(30, EMPTY_FORM_FIELDS, "user1"),
        { wrapper: createWrapper() },
      )

      expect(result.current.searchFilter).toEqual({
        query: "",
        yearOfBirth: "",
        sex: "",
      })

      act(() => {
        result.current.setSearchField("query", "test")
      })

      expect(result.current.searchFilter.query).toBe("test")
    })

    it("resetSearchFilter clears all fields", () => {
      const { result } = renderHook(
        () => useDataProviderPatients(30, EMPTY_FORM_FIELDS, "user1"),
        { wrapper: createWrapper() },
      )

      act(() => {
        result.current.setSearchField("query", "test")
        result.current.setSearchField("yearOfBirth", "1990")
      })

      act(() => {
        result.current.resetSearchFilter()
      })

      expect(result.current.searchFilter).toEqual({
        query: "",
        yearOfBirth: "",
        sex: "",
      })
    })
  })

  describe("query keys", () => {
    it("exports query key factory for cache invalidation", () => {
      expect(dataProviderPatientsKeys.all).toEqual(["data-provider-patients"])
      expect(dataProviderPatientsKeys.list({ search: "test", limit: 50 })).toEqual([
        "data-provider-patients",
        { search: "test", limit: 50 },
      ])
    })
  })
})
