/**
 * Unified hook for fetching patient lists in both offline and online modes.
 *
 * - Offline: WatermelonDB observable subscriptions (native reactivity preserved)
 * - Online: React Query via DataProvider.patients.getMany()
 *
 * Screens use this single hook — no isOnline branching needed.
 */

import { useCallback, useEffect, useState } from "react"
import { Q } from "@nozbe/watermelondb"
import { useQuery } from "@tanstack/react-query"
import { useImmer } from "use-immer"

import database from "@/db"
import PatientModel from "@/db/model/Patient"
import PatientAdditionalAttribute from "@/db/model/PatientAdditionalAttribute"
import type { RegistrationFormField } from "@/db/model/PatientRegistrationForm"
import Patient from "@/models/Patient"
import { useDataAccess } from "@/providers/DataAccessProvider"
import { DataProviderError } from "../../types/data"
import type { DataProvider } from "../../types/data"
import { extendedSanitizeLikeString } from "@/utils/parsers"

import { useClinicIdsWithPermission } from "./useClinicIdsWithPermission"
import { useDebounce } from "./useDebounce"

// Re-export SearchFilter so screens can reference it without importing the old hook
export type SearchFilter = {
  query: string
  yearOfBirth: string
  sex: "male" | "female" | ""
}

export type DataProviderPatientsResult = {
  patients: Patient.T[]
  totalCount: number
  isLoading: boolean
  searchFilter: SearchFilter
  setSearchField: (field: keyof SearchFilter, value: string | number) => void
  resetSearchFilter: () => void
  loadMore: () => void
  expandedSearchAvailable: boolean
  searchParams: Record<string, string>
  onChangeSearchParam: (id: string, value: string) => void
  resetSearchParams: () => void
}

/** Query key factory for the unified patients hook */
export const dataProviderPatientsKeys = {
  all: ["data-provider-patients"] as const,
  list: (params: { search: string; limit: number }) =>
    [...dataProviderPatientsKeys.all, params] as const,
}

/**
 * Unified patient list hook. Internally selects between WatermelonDB observables
 * (offline, with full attribute search + permissions) and React Query (online).
 *
 * Both internal paths always run their hooks (React rules), but only one
 * actively fetches data based on `isOnline`.
 */
export function useDataProviderPatients(
  pageSize: number,
  formFields: RegistrationFormField[],
  userId: string,
): DataProviderPatientsResult {
  const { provider, isOnline } = useDataAccess()

  // ── Shared search state (always runs) ──
  const [searchFilter, setSearchFilter] = useImmer<SearchFilter>({
    query: "",
    yearOfBirth: "",
    sex: "",
  })

  const [searchParams, setSearchParams] = useState<Record<string, string>>({})

  const debouncedSearchFilter = useDebounce(searchFilter, 750)
  const debouncedSearchParams = useDebounce(searchParams, 750)

  const setSearchField = useCallback((field: keyof SearchFilter, value: string | number) => {
    setSearchFilter((draft) => {
      draft[field] = value as never
    })
  }, [])

  const resetSearchFilter = useCallback(() => {
    setSearchFilter((draft) => {
      draft.query = ""
      draft.yearOfBirth = ""
      draft.sex = ""
    })
    setSearchParams({})
  }, [])

  const onChangeSearchParam = useCallback((id: string, value: string) => {
    setSearchParams((prev) => ({ ...prev, [id]: value.length === 0 ? "" : value }))
  }, [])

  const resetSearchParams = useCallback(() => setSearchParams({}), [])

  // ── Offline path (WatermelonDB observables) ──
  const offline = useOfflinePatients(
    isOnline
      ? null
      : {
          pageSize,
          formFields,
          userId,
          debouncedSearchFilter,
          debouncedSearchParams,
          searchFilterQuery: searchFilter.query,
        },
  )

  // ── Online path (React Query) ──
  const online = useOnlinePatients(
    isOnline ? { provider, searchQuery: debouncedSearchFilter.query, pageSize } : null,
  )

  return {
    patients: isOnline ? online.patients : offline.patients,
    totalCount: isOnline ? online.totalCount : offline.totalCount,
    isLoading: isOnline ? online.isLoading : offline.isLoading,
    searchFilter,
    setSearchField,
    resetSearchFilter,
    loadMore: isOnline ? online.loadMore : offline.loadMore,
    expandedSearchAvailable: !isOnline,
    searchParams,
    onChangeSearchParam,
    resetSearchParams,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Internal: Offline (WatermelonDB observable with permission + attribute search)
// ─────────────────────────────────────────────────────────────────────────────

type OfflineParams = {
  pageSize: number
  formFields: RegistrationFormField[]
  userId: string
  debouncedSearchFilter: SearchFilter
  debouncedSearchParams: Record<string, string>
  searchFilterQuery: string
}

function useOfflinePatients(params: OfflineParams | null) {
  const [patients, setPatients] = useState<Patient.T[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [page, setPage] = useState(1)

  // Reactive permission subscription — updates live when permissions change
  const { clinicIds: canViewHistoryClinicIds } = useClinicIdsWithPermission(
    params?.userId ?? null,
    "canViewHistory",
  )

  const totalShowingResults = (params?.pageSize ?? 30) * page

  // Total count subscription
  useEffect(() => {
    if (!params) return
    const sub = database
      .get<PatientModel>("patients")
      .query()
      .observeCount()
      .subscribe(setTotalCount)
    return () => sub.unsubscribe()
  }, [params !== null])

  // Main patient list subscription — waits for permissions before querying
  useEffect(() => {
    if (!params) {
      setPatients([])
      return
    }

    // Don't subscribe until permissions have loaded
    if (canViewHistoryClinicIds === null) return

    setIsLoading(true)
    const { debouncedSearchFilter, debouncedSearchParams, formFields, searchFilterQuery } = params

    // Separate base fields (direct patient columns) from attribute fields
    const baseFields = formFields
      .filter((f) => {
        if (!f.baseField) return false
        if (f.id in debouncedSearchParams && debouncedSearchParams[f.id].trim().length > 0) {
          return true
        }
        return false
      })
      .map((field) => ({ ...field, value: debouncedSearchParams[field.id] }))

    const attrFields = formFields
      .filter((f) => {
        if (f.baseField) return false
        if (f.id in debouncedSearchParams && debouncedSearchParams[f.id].trim().length > 0) {
          return true
        }
        return false
      })
      .map((field) => ({ ...field, value: debouncedSearchParams[field.id] }))

    const patientsRef = database.get<PatientModel>("patients")
    const patientAttrsRef = database.get<PatientAdditionalAttribute>(
      "patient_additional_attributes",
    )

    // Build base field query conditions
    const patientQueryConditions = baseFields.map((field) => {
      let val = field.value
      if (field.fieldType === "number") {
        val = isNaN(+field.value) ? field.value : +field.value
      } else if (field.fieldType === "date") {
        val = field.value
      } else {
        val = field.value
      }

      let likeQuery = `%${extendedSanitizeLikeString(val)}%`
      if (field.fieldType === "select") {
        likeQuery = `${extendedSanitizeLikeString(val)}%`
      }

      return Q.where(field.column, Q.like(likeQuery))
    })

    // Build attribute field query conditions
    const patientAttrsQueryConditions = attrFields.map((field) => {
      let val = field.value
      let col: Patient.PatientValueColumn = "string_value"
      if (field.fieldType === "number") {
        val = isNaN(+field.value) ? field.value : +field.value
        col = "number_value"
      } else if (field.fieldType === "date") {
        val = field.value
        col = "date_value"
      } else {
        val = field.value
        col = "string_value"
      }

      let likeQuery = `%${extendedSanitizeLikeString(val)}%`
      if (field.fieldType === "select") {
        likeQuery = `${extendedSanitizeLikeString(val)}%`
      }

      return Q.where(col, Q.like(likeQuery))
    })

    // Build name search conditions
    let ptQueryConditionsWithStr: any[] = []
    if (searchFilterQuery.length > 1) {
      const terms = searchFilterQuery.split(" ")
      ptQueryConditionsWithStr = [
        Q.and(
          Q.or(
            ...terms.flatMap((t) => [
              Q.where("given_name", Q.like(`%${extendedSanitizeLikeString(t)}%`)),
              Q.where("surname", Q.like(`%${extendedSanitizeLikeString(t)}%`)),
            ]),
          ),
        ),
        ...patientQueryConditions,
      ]
    } else {
      ptQueryConditionsWithStr = patientQueryConditions
    }

    // Sort order: when searching, sort by name; otherwise most recent first
    const ptQueryConditions = [Q.sortBy("updated_at", "desc")]
    if (ptQueryConditionsWithStr.length > 0) {
      ptQueryConditions.push(Q.sortBy("given_name", "asc"))
      ptQueryConditions.push(Q.sortBy("surname", "asc"))
    }

    const sub = patientsRef
      .query(
        ...ptQueryConditionsWithStr,
        ...ptQueryConditions,
        // Permission check: only patients from clinics user can view
        Q.or(
          Q.where("primary_clinic_id", Q.oneOf(canViewHistoryClinicIds)),
          Q.where("primary_clinic_id", null),
        ),
        Q.take(totalShowingResults),
      )
      .observe()
      .subscribe(async (patientRes) => {
        const patientIds = patientRes.map((p) => p.id)
        const queryPtIds =
          patientIds.length === 0 ? [] : [Q.where("patient_id", Q.oneOf(patientIds))]

        // If there are attribute search conditions, filter by them
        const attrRes =
          patientAttrsQueryConditions.length === 0
            ? []
            : await patientAttrsRef
                .query(
                  ...patientAttrsQueryConditions,
                  ...queryPtIds,
                  Q.sortBy("updated_at", "desc"),
                  Q.take(totalShowingResults),
                )
                .fetch()

        const attrPatientIds = attrRes.map((a) => a.patientId)

        const missingPatientIds = attrRes
          .filter((attr) => !patientIds.includes(attr.patientId))
          .map((f) => f.id)

        const patientsRes2 =
          missingPatientIds.length === 0
            ? []
            : await patientsRef
                .query(Q.where("id", Q.oneOf(missingPatientIds)), Q.sortBy("updated_at"))
                .fetch()

        // Intersect: patients that match both base and attribute conditions
        const filteredPatients =
          attrPatientIds.length === 0
            ? patientRes
            : patientRes.filter((pt) => attrPatientIds.includes(pt.id))

        // Convert to Patient.T via fromDB transformer
        setPatients([...filteredPatients, ...patientsRes2].map(Patient.DB.fromDB))
        setIsLoading(false)
      })

    return () => {
      sub.unsubscribe()
      setIsLoading(false)
    }
  }, [
    params?.debouncedSearchParams,
    params?.searchFilterQuery,
    totalShowingResults,
    canViewHistoryClinicIds,
  ])

  return {
    patients,
    totalCount,
    isLoading,
    loadMore: useCallback(() => setPage((p) => p + 1), []),
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Internal: Online (React Query via DataProvider)
// ─────────────────────────────────────────────────────────────────────────────

type OnlineParams = {
  provider: DataProvider
  searchQuery: string
  pageSize: number
}

function useOnlinePatients(params: OnlineParams | null) {
  const [limit, setLimit] = useState(params?.pageSize ?? 50)

  const query = useQuery({
    queryKey: dataProviderPatientsKeys.list({
      search: params?.searchQuery ?? "",
      limit,
    }),
    queryFn: async () => {
      const result = await params!.provider.patients.getMany({
        search: params!.searchQuery,
        filters: {},
        offset: 0,
        limit,
      })
      if (!result.ok) throw new DataProviderError(result.error)
      return result.data
    },
    enabled: params !== null,
  })

  return {
    patients: query.data?.data ?? [],
    totalCount: query.data?.pagination?.total ?? 0,
    isLoading: query.isLoading,
    loadMore: useCallback(() => setLimit((l) => l + (params?.pageSize ?? 50)), [params?.pageSize]),
  }
}
