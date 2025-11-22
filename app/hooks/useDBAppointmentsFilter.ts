import { useEffect, useState } from "react"
import { isValid, startOfDay } from "date-fns"
import { useDebounceValue } from "usehooks-ts"

import database from "@/db"
import Appointment from "@/models/Appointment"

type FilterState = {
  selectedClinicId: string | null
  selectedDepartmentIds: string[]
  selectedStatuses: Appointment.Status[]
  searchQuery: string
}

export type AppointmentsFilters = {
  status: Appointment.Status | "all"
  date: Date
  clinicId: string
  searchQuery: string
  departmentIds: string[]
}

const initialFilters: AppointmentsFilters = {
  status: "pending",
  date: startOfDay(new Date()),
  clinicId: "",
  searchQuery: "",
  departmentIds: [],
}

const PAGE_SIZE = 150

type ISOStringDate = string

export function useDBAppointmentsFilter(
  clinicId: string,
  date?: ISOStringDate,
): {
  filters: AppointmentsFilters
  handleFiltersChange: (newFilters: Partial<AppointmentsFilters>) => void
  clearFilters: () => void
  appointments: Appointment.T[]
  loadMore: () => Promise<void>
  isLoading: boolean
} {
  const [filters, setFilters] = useState<AppointmentsFilters>({
    ...initialFilters,
    clinicId,
    date: date && isValid(date) ? startOfDay(new Date(date)) : startOfDay(new Date()),
  })
  const [pagination, setPagination] = useState({
    offset: 0,
    limit: PAGE_SIZE,
  })
  const [loading, setLoading] = useState(true)
  const [appointmentResults, setAppointmentResults] = useState<Appointment.T[]>([])
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useDebounceValue(filters.searchQuery, 500)
  useEffect(() => {
    setDebouncedSearchQuery(filters.searchQuery)
  }, [filters.searchQuery])

  useEffect(() => {
    const { status, date, clinicId, searchQuery, departmentIds } = filters
    setLoading(true)

    // build the conditions
    const conditions = Appointment.DB.createSearchQueryConditions(
      searchQuery,
      clinicId,
      [status],
      date,
      pagination,
    )

    // Execute query subscription
    const sub = database
      .get<Appointment.DBAppointment>("appointments")
      .query(...conditions)
      .observe()
      .subscribe((appointments) => {
        const results = (() => {
          const mappedAppointments = appointments.map(Appointment.DB.rawToT)
          // Filter by department IDs if provided (client-side filtering)
          if (departmentIds.length > 0) {
            return mappedAppointments.filter((appointment) =>
              appointment.departments.some((dept) => departmentIds.includes(dept.id)),
            )
          }
          return mappedAppointments
        })()
        setAppointmentResults(results)
        setLoading(false)
      })

    return () => {
      sub.unsubscribe()
    }
  }, [
    filters.clinicId,
    filters.date.toISOString(),
    debouncedSearchQuery,
    filters.departmentIds,
    filters.status,
    pagination.limit,
  ])

  const handleFiltersChange = (newFilters: Partial<FilterState>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }))
  }

  const clearFilters = () => {
    setFilters({ ...initialFilters, clinicId, date: startOfDay(new Date()) })
  }

  /**
   * This handles infinite scroll like, so we just increase the limit and re-run
   */
  const loadMore = async () => {
    // Check if we've received fewer results than requested
    // This indicates we've reached the end of available data
    if (appointmentResults.length < pagination.limit) {
      return
    }
    const nextPageLimit = pagination.limit + PAGE_SIZE
    setPagination((prev) => ({ ...prev, limit: nextPageLimit }))
  }

  return {
    filters,
    handleFiltersChange,
    clearFilters,
    appointments: appointmentResults,
    isLoading: loading,
    loadMore,
  }
}
