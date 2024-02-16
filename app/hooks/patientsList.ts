import { useState } from "react"
import Patient from "app/db/model/Patient"
import { useImmer } from "use-immer"

type PatientsListResult = {
  patients: Patient[]
  isLoading: boolean
  // Whether or not the list of patients is the result of a search
  isSearchResults: boolean
  error: Error | null
  searchQuery: string
  setSearchQuery: (searchQuery: string) => void
  // set a filter field to a value
  setFilter: (field: string, value: string) => void
  clearSearch: () => void
}

type PatientSearchFilter = {
  name?: string
  sex?: string
  yearOfBirth?: number
  citizenship?: string
}

/**
 * List of patients that are currently in the database, with support for searching and filtering from WatermelonDB.
 * The hook keeps track of the current search query and filters, and updates the list of patients accordingly.
 * @param {string} initialSearchQuery The current search query to filter patients by
 * @returns {PatientsListResult} The list of patients, and some metadata about the list
 */
export function usePatientsList(initialSearchQuery: string): PatientsListResult {
  const [patients, setPatients] = useState<Patient[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [isSearchResults, setIsSearchResults] = useState<boolean>(false)
  const [error, setError] = useState<Error | null>(null)
  const [filters, updateFilters] = useImmer<PatientSearchFilter>({
    name: undefined,
  })

  const [searchQuery, setSearchQuery] = useState<string>(initialSearchQuery)

  /** Resets the search query and filters */
  const clearSearch = () => {
    setSearchQuery("")
  }

  return {
    patients,
    isLoading,
    isSearchResults,
    error,
    searchQuery,
    setSearchQuery,
    setFilter: (field: string, value: string) => {
      updateFilters((draft) => {
        draft[field] = value
      })
    },
    clearSearch,
  }
}
