import { useEffect, useState } from "react"
import { isValid, startOfDay } from "date-fns"
import { useDebounceValue } from "usehooks-ts"

import database from "@/db"
import PrescriptionModel from "@/db/model/Prescription"
import Prescription from "@/models/Prescription"

type ISOStringDate = string

export type PrescriptionsFilters = {
  status: Prescription.Status[]
  date: Date
  clinicId: string | null
  searchQuery: string
}

const initialFilters: PrescriptionsFilters = {
  status: ["pending"],
  date: startOfDay(new Date()),
  clinicId: null,
  searchQuery: "",
}

const PAGE_SIZE = 50

export function useDBPrescriptionsFilter(
  clinicId: string | null,
  date?: ISOStringDate,
): {
  filters: PrescriptionsFilters
  handleFiltersChange: (newFilters: Partial<PrescriptionsFilters>) => void
  clearFilters: () => void
  prescriptions: Prescription.T[]
  loadMore: () => Promise<void>
  isLoading: boolean
} {
  const [filters, setFilters] = useState<PrescriptionsFilters>({
    ...initialFilters,
    clinicId,
    date: date && isValid(new Date(date)) ? startOfDay(new Date(date)) : startOfDay(new Date()),
  })

  const [pagination, setPagination] = useState({
    offset: 0,
    limit: PAGE_SIZE,
  })

  const [loading, setLoading] = useState(true)
  const [prescriptionResults, setPrescriptionResults] = useState<Prescription.T[]>([])
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useDebounceValue(filters.searchQuery, 500)

  useEffect(() => {
    setDebouncedSearchQuery(filters.searchQuery)
  }, [filters.searchQuery, setDebouncedSearchQuery])

  // Extract date string for dependency array
  const dateString = filters.date.toISOString()

  useEffect(() => {
    console.log("useDBPrescriptionsFilter useEffect called")
    const { status, date, clinicId } = filters
    setLoading(true)

    // Prepare status filter - handle empty array case for "all"
    const statusFilter = status.length === 0 ? [] : status

    // Build the conditions using the helper function
    const conditions = Prescription.DB.createSearchQueryConditions(
      debouncedSearchQuery,
      clinicId,
      statusFilter,
      date,
      pagination,
    )

    // Execute query subscription
    const sub = database
      .get<PrescriptionModel>("prescriptions")
      .query(...conditions)
      .observe()
      .subscribe((prescriptions) => {
        const results = prescriptions.map(Prescription.DB.rawToT)
        setPrescriptionResults(results)
        setLoading(false)
      })

    return () => {
      sub.unsubscribe()
    }
  }, [
    filters.clinicId,
    filters.status,
    dateString,
    debouncedSearchQuery,
    pagination.limit,
    pagination.offset,
  ])

  const handleFiltersChange = (newFilters: Partial<PrescriptionsFilters>) => {
    // Reset pagination when filters change
    if (
      newFilters.status !== undefined ||
      newFilters.clinicId !== undefined ||
      newFilters.date !== undefined ||
      newFilters.searchQuery !== undefined
    ) {
      setPagination({ offset: 0, limit: PAGE_SIZE })
    }

    setFilters((prev) => ({ ...prev, ...newFilters }))
  }

  const clearFilters = () => {
    setPagination({ offset: 0, limit: PAGE_SIZE })
    setFilters({
      ...initialFilters,
      clinicId,
      date: startOfDay(new Date()),
    })
  }

  /**
   * This handles infinite scroll, so we just increase the limit and re-run
   */
  const loadMore = async () => {
    // Check if we've received fewer results than requested
    // This indicates we've reached the end of available data
    if (prescriptionResults.length < pagination.limit) {
      console.log("Reached end of prescription data")
      return
    }

    const nextPageLimit = pagination.limit + PAGE_SIZE
    setPagination((prev) => ({ ...prev, limit: nextPageLimit }))
  }

  return {
    filters,
    handleFiltersChange,
    clearFilters,
    prescriptions: prescriptionResults,
    isLoading: loading,
    loadMore,
  }
}
