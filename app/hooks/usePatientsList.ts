import { useEffect, useState } from "react"
import { Q } from "@nozbe/watermelondb"
import { omit } from "es-toolkit"
import { useImmer } from "use-immer"

import database from "@/db"
import PatientModel from "@/db/model/Patient"
import PatientAdditionalAttribute from "@/db/model/PatientAdditionalAttribute"
import { RegistrationFormField } from "@/db/model/PatientRegistrationForm"
import Patient from "@/models/Patient"
import UserClinicPermissions from "@/models/UserClinicPermissions"
import { extendedSanitizeLikeString } from "@/utils/parsers"

import { useDebounce } from "./useDebounce"

export type SearchFilter = {
  query: string
  yearOfBirth: string
  sex: "male" | "female" | ""
}

type PatientsList = {
  patients: PatientModel[]
  searchFilter: SearchFilter
  getNextPagePatients: () => void
  resetSearchFilter: () => void
  setSearchField: (field: keyof SearchFilter, value: string | number) => void
  isLoading: boolean
  totalPatientsCount: number
  searchParams: Record<string, string>
  onChangeSearchParam: (id: string, value: string) => void
  resetSearchParams: () => void
}

/**
 * @deprecated Use `useDataProviderPatients` instead. This hook only works in offline mode
 * and returns PatientModel[] instead of Patient.T[]. The unified hook handles both
 * online and offline modes transparently.
 *
 * Patients list hook gets the most recent patients from the local database in descending order of "updatedAt" field
 * This hook supports infinite scrolling by providing a callback function to fetch the next page of patients
 *
 * Search and filtering is supported by updating a search string inside SearchFilter object
 *
 * @param {number} pageSize - The number of patients to fetch per page
 * @param {RegistrationFormField[]} formFields - The form fields to filter by
 * @param {string} userId - The current logged in provider
 * @returns {PatientsList} - The patients list
 */
export function usePatientsList(
  pageSize: number,
  formFields: RegistrationFormField[],
  userId: string,
): PatientsList {
  /** Whether we are listing the patients or searching the patients */
  // const [mode, setMode] = useState<"list" | "search">("list")
  const [canViewHistoryClinicIds, setCanViewHistoryClinicIds] = useState<string[]>([])
  const [page, setPage] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [patients, setPatients] = useState<PatientModel[]>([])
  const [totalPatientsCount, setTotalPatientsCount] = useState(0)
  const [searchFilter, setSearchFilter] = useImmer<SearchFilter>({
    query: "",
    yearOfBirth: "",
    sex: "",
  })

  const totalShowingResults = pageSize * page

  /** Debounced search filters improves performance by reducing the number of queries */
  const debouncedSearchFilter = useDebounce(searchFilter, 750)

  // TOMBSTONE: Aug 14. Whole useEffect block only does the count monitoring
  useEffect(() => {
    const { query, yearOfBirth, sex } = debouncedSearchFilter
    const ref = database.get<PatientModel>("patients")
    setIsLoading(true)
    const queryConditions = []
    if (query.length > 1) {
      queryConditions.push(
        Q.or(
          Q.where("given_name", Q.like(`%${extendedSanitizeLikeString(query)}%`)),
          Q.where("surname", Q.like(`%${extendedSanitizeLikeString(query)}%`)),
        ),
      )
    }
    if (yearOfBirth.length > 0 && !isNaN(Number(yearOfBirth))) {
      queryConditions.push(
        Q.where("date_of_birth", Q.like(`%${Q.sanitizeLikeString(yearOfBirth)}%`)),
      )
    }
    if (sex.length > 0) {
      queryConditions.push(Q.where("sex", Q.eq(`${extendedSanitizeLikeString(sex)}`)))
    }

    // const refQuery =
    //   queryConditions.length === 0
    //     ? ref.query(Q.sortBy("updated_at", "desc"), Q.take(totalShowingResults))
    //     : ref.query(
    //         Q.and(...queryConditions),
    //         Q.sortBy("updated_at", "desc"),
    //         Q.take(totalShowingResults),
    //       )

    // const sub = refQuery.observe().subscribe((patients) => {
    //   setPatients(patients)
    //   setIsLoading(false)
    // })

    const patientCountSub = ref.query().observeCount().subscribe(setTotalPatientsCount)

    // const minDate = format(new Date(debouncedSearchFilter.yearOfBirth, 0, 1), "yyyy-MM-dd")
    // const maxDate = format(new Date(debouncedSearchFilter.yearOfBirth, 11, 31), "yyyy-MM-dd")
    // if (mode === "search") {
    //   ref
    //     .query(
    //       Q.and(
    //         Q.where("sex", debouncedSearchFilter.sex),
    //         Q.or(
    //           Q.where("given_name", Q.like(`%${debouncedSearchFilter.query}%`)),
    //           Q.where("surname", Q.like(`%${debouncedSearchFilter.query}%`)),
    //         ),
    //         Q.where("dateOfBirth", Q.gte(minDate)),
    //         Q.where("dateOfBirth", Q.lte(maxDate)),
    //       ),
    //       Q.sortBy("updated_at", "desc"),
    //       Q.take(totalShowingResults),
    //     )
    //     .fetch()
    //     .then((patients) => {
    //       setPatients(patients)
    //     })
    // } else {
    //   ref
    //     .query(Q.sortBy("updated_at", "desc"), Q.take(totalShowingResults))
    //     .observe()
    //     .subscribe((patients) => {
    //       setPatients(patients)
    //     })
    // }

    return () => {
      // sub.unsubscribe()
      patientCountSub.unsubscribe()
    }
  }, [totalShowingResults, debouncedSearchFilter])

  /** If the search query is not empty, set the mode to "search" */
  // useEffect(() => {
  //   if (searchFilter.query !== "") {
  //     setMode("search")
  //   }
  // }, [searchFilter.query])

  /** Whether or not we are in searching mode */
  // const isSearchMode =
  //   searchFilter.query.length > 0 &&
  //   searchFilter.yearOfBirth.length > 0 &&
  //   searchFilter.sex.length > 0

  /** reset the search filter */
  const resetSearchFilter = () => {
    // setMode("list")
    setSearchFilter((draft) => {
      draft.query = ""
      draft.yearOfBirth = ""
      draft.sex = ""
    })
  }

  /** Set a search field */
  const setSearchField = (field: keyof SearchFilter, value: string | number) => {
    setSearchFilter((draft) => {
      draft[field] = value as never
    })

    // set the loading state.
    // setIsLoading(true)
  }

  /** Fetch the next page of patients */
  const getNextPagePatients = () => {
    setPage(page + 1)
  }

  ////////

  const [searchParams, setSearchParams] = useState<Record<string, string>>({})
  const onChangeParam = (id: string, value: string) => {
    setIsLoading(true)
    setSearchParams((prev) => {
      if (value.length === 0) {
        return { ...prev, [id]: "" }
      }
      return { ...prev, [id]: value }
    })
  }

  useEffect(() => {
    // Only the clinic patients that the user has access to
    UserClinicPermissions.DB.getClinicIdsWithPermission(userId, "canViewHistory")
      .then((res) => {
        setCanViewHistoryClinicIds(res)
      })
      .catch((err) => {
        console.error(err)
        setCanViewHistoryClinicIds([])
      })
  }, [userId])

  /** Debounced search filters improves performance by reducing the number of queries */
  const debouncedSearchParams = useDebounce(searchParams, 750)
  useEffect(() => {
    // get the patients: use the baseFields and get the patients
    // const baseFields = formFields
    //   .filter((f) => {
    //     if (!f.baseField) return false
    //     // check if the basefield is one of the search fields
    //     if (f.id in debouncedSearchParams) {
    //       return true
    //     }
    //     return false
    //   })
    //   .map((field) => ({ ...field, value: debouncedSearchParams[field.id] }))

    // const attrFields = formFields
    //   .filter((f) => {
    //     if (f.baseField) return false
    //     // check if the basefield is one of the search fields
    //     if (f.id in debouncedSearchParams) {
    //       return true
    //     }
    //     return false
    //   })
    //   .map((field) => ({ ...field, value: debouncedSearchParams[field.id] }))

    const baseFields = formFields
      .filter((f) => {
        if (!f.baseField) return false
        // check if the field has a non-empty value in search params
        if (f.id in debouncedSearchParams && debouncedSearchParams[f.id].trim().length > 0) {
          return true
        }
        return false
      })
      .map((field) => ({ ...field, value: debouncedSearchParams[field.id] }))

    const attrFields = formFields
      .filter((f) => {
        if (f.baseField) return false
        // check if the field has a non-empty value in search params
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
    const patientQueryConditions = baseFields.map((field) => {
      let val = field.value
      if (field.fieldType === "number") {
        val = isNaN(+field.value) ? field.value : +field.value
      } else if (field.fieldType === "date") {
        // FIXME: how do we deal with dates?
        val = field.value
      } else {
        // all else marked as strings
        val = field.value
      }

      // fields that are `select` type are dropdowns and/or checkboxes
      // such as `sex`
      let likeQuery = `%${extendedSanitizeLikeString(val)}%`
      if (field.fieldType === "select") {
        // Select fields only search for matches at end of string not at begining
        // solves the: "returns 'female' when 'male' is searched for"
        likeQuery = `${extendedSanitizeLikeString(val)}%`
      }

      return Q.where(field.column, Q.like(likeQuery))
    })

    const patientAttrsQueryConditions = attrFields.map((field) => {
      let val = field.value
      let col: Patient.PatientValueColumn = "string_value"
      if (field.fieldType === "number") {
        val = isNaN(+field.value) ? field.value : +field.value
        col = "number_value"
      } else if (field.fieldType === "date") {
        // FIXME: how do we deal with dates?
        val = field.value
        col = "date_value"
      } else {
        // all else marked as strings
        val = field.value
        col = "string_value"
      }
      // fields that are `select` type are dropdowns and/or checkboxes
      // such as `sex`
      let likeQuery = `%${extendedSanitizeLikeString(val)}%`
      if (field.fieldType === "select") {
        // Select fields only search for matches at end of string not at begining
        likeQuery = `${extendedSanitizeLikeString(val)}%`
      }

      return Q.where(col, Q.like(likeQuery))
    })

    let ptQueryConditionsWithStr = []
    if (searchFilter.query.length > 1) {
      const query = searchFilter.query
      const terms = query.split(" ")
      ptQueryConditionsWithStr = [
        Q.and(
          // Q.or(
          //   Q.where("given_name", Q.like(`%${extendedSanitizeLikeString(query)}%`)),
          //   Q.where("surname", Q.like(`%${extendedSanitizeLikeString(query)}%`)),
          // ),

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

    // If the user is doing any kind of search, sort by given name and last name, otherwise show most recent first
    // Always sort by updated_at in descending order first
    const ptQueryConditions = [Q.sortBy("updated_at", "desc")]
    if (ptQueryConditionsWithStr.length > 0) {
      ptQueryConditions.push(Q.sortBy("given_name", "asc"))
      ptQueryConditions.push(Q.sortBy("surname", "asc"))
    }

    const sub = patientsRef
      .query(
        ...ptQueryConditionsWithStr,
        ...ptQueryConditions,
        // PERMISSIONS CHECK FOR VIEWING PATIENT HISTORY
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

        const attrRes =
          patientAttrsQueryConditions.length === 0
            ? []
            : await patientAttrsRef
                .query(
                  ...patientAttrsQueryConditions,
                  ...queryPtIds,
                  Q.sortBy("updated_at"),
                  Q.take(totalShowingResults),
                )
                .fetch()
        const attrPatientIds = attrRes.map((attrRes) => attrRes.patientId)

        const missingPatientIds = attrRes
          .filter((attr) => !patientIds.includes(attr.patientId))
          .map((f) => f.id)

        const patientsRes2 =
          missingPatientIds.length === 0
            ? []
            : await patientsRef
                .query(Q.where("id", Q.oneOf(missingPatientIds)), Q.sortBy("updated_at"))
                .fetch()

        // the subset of patientRes that actually matches the search results for the other parameters;
        const filteredPatients =
          attrPatientIds.length === 0
            ? patientRes
            : patientRes.filter((pt) => attrPatientIds.includes(pt.id))

        setPatients([...filteredPatients, ...patientsRes2])
        setIsLoading(false)
        // FIXME: add error handling
      })

    return () => {
      sub.unsubscribe()
      setIsLoading(false)
    }
  }, [debouncedSearchParams, searchFilter.query, totalShowingResults, canViewHistoryClinicIds])

  ////

  return {
    patients,
    searchFilter,
    getNextPagePatients: getNextPagePatients,
    resetSearchFilter,
    setSearchField,
    isLoading,
    totalPatientsCount,
    searchParams,
    onChangeSearchParam: onChangeParam,
    resetSearchParams() {
      setSearchParams({})
    },
  }
}
