import React, { FC, useEffect, useMemo, useState } from "react"
import { observer } from "mobx-react-lite"
import { NativeModules, Pressable, StatusBar, ViewStyle } from "react-native"
import { AppStackScreenProps } from "app/navigators"
import { Fab, PatientListItem, Screen, Text, TextField, Toggle, View } from "app/components"
import { FlashList } from "@shopify/flash-list"
import PatientModel, { defaultPatient } from "app/db/model/Patient"
import { colors } from "app/theme"
import {
  ChevronDown,
  ChevronDownIcon,
  ChevronUpIcon,
  CrossIcon,
  PlusIcon,
  SearchIcon,
  XIcon,
} from "lucide-react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { useImmer } from "use-immer"
import database from "app/db"
import { useDebounce } from "app/hooks/useDebounce"
import { Q } from "@nozbe/watermelondb"
import { format } from "date-fns"
import { Picker } from "@react-native-picker/picker"
import { translate } from "app/i18n"
import { useIsFocused } from "@react-navigation/native"
// import { useNavigation } from "@react-navigation/native"
import { useStores } from "app/models"

type SearchFilter = {
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
}

/**
 * Patients list hook gets the most recent patients from the local database in descending order of "updatedAt" field
 * This hook supports infinite scrolling by providing a callback function to fetch the next page of patients
 *
 * Search and filtering is supported by updating a search string inside SearchFilter object
 *
 * @param {number} pageSize - The number of patients to fetch per page
 * @returns {PatientsList} - The patients list
 */
export function usePatientsList(pageSize: number): PatientsList {
  /** Whether we are listing the patients or searching the patients */
  // const [mode, setMode] = useState<"list" | "search">("list")
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

  useEffect(() => {
    const { query, yearOfBirth, sex } = debouncedSearchFilter
    const ref = database.get<PatientModel>("patients")
    setIsLoading(true)
    const queryConditions = []
    if (query.length > 1) {
      queryConditions.push(
        Q.or(
          Q.where("given_name", Q.like(`%${Q.sanitizeLikeString(query)}%`)),
          Q.where("surname", Q.like(`%${Q.sanitizeLikeString(query)}%`)),
        ),
      )
    }
    if (yearOfBirth.length > 0 && !isNaN(Number(yearOfBirth))) {
      queryConditions.push(
        Q.where("date_of_birth", Q.like(`%${Q.sanitizeLikeString(yearOfBirth)}%`)),
      )
    }
    if (sex.length > 0) {
      queryConditions.push(Q.where("sex", Q.eq(`${Q.sanitizeLikeString(sex)}`)))
    }

    const refQuery =
      queryConditions.length === 0
        ? ref.query(Q.sortBy("updated_at", "desc"), Q.take(totalShowingResults))
        : ref.query(
          Q.and(...queryConditions),
          Q.sortBy("updated_at", "desc"),
          Q.take(totalShowingResults),
        )

    const sub = refQuery.observe().subscribe((patients) => {
      setPatients(patients)
      setIsLoading(false)
    })

    ref
      .query()
      .fetchCount()
      .then((count) => {
        setTotalPatientsCount(count)
      })
      .catch((err) => {
        console.log(err)
      })

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
      sub.unsubscribe()
    }
  }, [totalShowingResults, debouncedSearchFilter])

  /** If the search query is not empty, set the mode to "search" */
  // useEffect(() => {
  //   if (searchFilter.query !== "") {
  //     setMode("search")
  //   }
  // }, [searchFilter.query])

  /** Whether or not we are in searching mode */
  const isSearchMode =
    searchFilter.query.length > 0 &&
    searchFilter.yearOfBirth.length > 0 &&
    searchFilter.sex.length > 0

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
    setIsLoading(true)
  }

  /** Fetch the next page of patients */
  const getNextPagePatients = () => {
    setPage(page + 1)
  }

  return {
    patients,
    searchFilter,
    getNextPagePatients: getNextPagePatients,
    resetSearchFilter,
    setSearchField,
    isLoading,
    totalPatientsCount,
  }
}

interface PatientsListScreenProps extends AppStackScreenProps<"PatientsList"> { }

export const PatientsListScreen: FC<PatientsListScreenProps> = observer(
  function PatientsListScreen({ navigation }) {
    // const { provider } = useStores()

    const isFocused = useIsFocused()

    const {
      patients,
      searchFilter,
      getNextPagePatients,
      resetSearchFilter,
      totalPatientsCount,
      setSearchField,
    } = usePatientsList(30)
    const [isExpandedSearch, setIsExpandedSearch] = useState(false)

    // On colapse expanded search, set year of birth and sex to empty
    useEffect(() => {
      if (!isExpandedSearch) {
        setSearchField("yearOfBirth", "")
        setSearchField("sex", "")
      }
    }, [isExpandedSearch])

    /**
     * Open patient details screen by forwarding the patientID to the patient details screen
     * @param {string} patientId - The patient ID
     */
    const openPatientDetails = (patientId: string) => {
      navigation.navigate("PatientView", { patientId })
    }

    /**
     * Open patient register form screen
     */
    const openPatientRegisterForm = () => {
      navigation.navigate("PatientRegistrationForm")
    }

    console.log(patients.map(p => p.sex))

    return (
      <SafeAreaView
        edges={
          NativeModules.PlatformConstants?.InterfaceOrientation?.portrait
            ? ["top", "bottom"]
            : ["left", "right"]
        }
        style={$root}
      >
        <StatusBar barStyle="dark-content" backgroundColor={colors.palette.neutral200} />
        <FlashList
          contentContainerStyle={$patientList}
          onRefresh={getNextPagePatients}
          refreshing={false}
          disableAutoLayout={true}
          ListHeaderComponent={
            <View pb={10} gap={10}>
              <TextField
                RightAccessory={() =>
                  searchFilter.query.length > 0 ? (
                    <Pressable
                      style={{ alignSelf: "center", marginRight: 10, marginLeft: 10 }}
                      onPress={resetSearchFilter}
                    >
                      <XIcon color={colors.palette.neutral700} size={16} />
                    </Pressable>
                  ) : (
                    <SearchIcon
                      style={{ alignSelf: "center", marginRight: 10, marginLeft: 10 }}
                      color={colors.palette.neutral700}
                      size={16}
                    />
                  )
                }
                value={searchFilter.query}
                onChangeText={(query) => setSearchField("query", query)}
                placeholder="Search"
              />

              <View>
                {isExpandedSearch && (
                  <View direction="row" gap={8}>
                    <View flex={1}>
                      <TextField
                        value={searchFilter.yearOfBirth}
                        onChangeText={(yob) => setSearchField("yearOfBirth", yob)}
                        placeholder="Year of Birth"
                        keyboardType="number-pad"
                      />
                    </View>

                    <View flex={1}>
                      <Picker
                        selectedValue={searchFilter.sex}
                        onValueChange={(sex) => setSearchField("sex", sex)}
                      >
                        <Picker.Item label={translate("sex")} value="" />
                        <Picker.Item label={translate("male")} value="male" />
                        <Picker.Item label={translate("female")} value="female" />
                      </Picker>
                    </View>
                  </View>
                )}
              </View>

              <View direction="row" justifyContent="space-between" alignItems="flex-end">
                <Text
                  text={`Showing ${patients.length} of ${totalPatientsCount.toLocaleString()}`}
                />
                <Pressable onPress={() => setIsExpandedSearch((ex) => !ex)}>
                  <View direction="row" alignItems="flex-end" gap={8}>
                    <Text size="xs" text={isExpandedSearch ? "Hide Options" : "Search Options"} />
                    {!isExpandedSearch ? (
                      <ChevronDownIcon size={18} color={colors.palette.neutral800} />
                    ) : (
                      <ChevronUpIcon size={18} color={colors.palette.neutral800} />
                    )}
                  </View>
                </Pressable>
              </View>
            </View>
          }
          ItemSeparatorComponent={() => <View style={$separator} />}
          ListFooterComponent={() => <View style={{ height: 40 }} />}
          data={patients}
          estimatedItemSize={113}
          extraData={isFocused}
          renderItem={({ item }) => (
            <PatientListItem patient={item} onPatientSelected={openPatientDetails} />
          )}
        />

        <Pressable onPress={openPatientRegisterForm} style={$newVisitFAB}>
          <PlusIcon color={"white"} size={20} style={{ marginRight: 10 }} />
          <Text color="white" size="sm" text={translate("newPatient.newPatient")} />
        </Pressable>
      </SafeAreaView>
    )
  },
)

const $root: ViewStyle = {
  flex: 1,
  paddingTop: 10,
  backgroundColor: colors.background,
}

const $patientList = {
  paddingHorizontal: 12,
}

const $newVisitFAB: ViewStyle = {
  display: "flex",
  flexDirection: "row",
  position: "absolute",
  bottom: 60,
  right: 24,
  elevation: 4,
  zIndex: 100,
  borderRadius: 10,
  padding: 14,
  backgroundColor: colors.palette.primary500,
  justifyContent: "center",
  alignItems: "center",
}

const $separator: ViewStyle = {
  height: 1,
  backgroundColor: colors.border,
  marginVertical: 6,
}
