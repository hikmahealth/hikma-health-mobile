import React, { useCallback, useEffect, useState } from "react"
import { useColorScheme, View, ViewStyle, TouchableOpacity } from "react-native"
import Icon from "react-native-vector-icons/MaterialCommunityIcons"
import { Screen } from "../components/Screen"
import { Text } from "../components/Text"
import { Button } from "../components/Button"
import { If } from "../components/If"
import { HorizontalRadioGroup } from "../components/HorizontalRadioGroup"
import { FAB, Divider, Searchbar, TextInput } from "react-native-paper"
import { useMachine } from '@xstate/react';
import { translate } from "../i18n"
import { PatientListItem } from "../components/PatientListItem"
import { Patient } from "../types/Patient"
import { NativeStackScreenProps } from "@react-navigation/native-stack"
import PatientModel from "../db/model/Patient"
import { Q } from "@nozbe/watermelondb"
import { FlashList } from "@shopify/flash-list"
import { primary } from "../styles/colors"
import { PatientFlowParamList } from "../navigators/PatientFlowNavigator"
import { patientListMachine } from "../components/state_machines/patientList"
import { useLanguageStore } from "../stores/language"
import database from "../db"
import { detectLanguage, removeSpecialCharacters } from "../utils/language"
import { remove } from "lodash"

type Props = NativeStackScreenProps<PatientFlowParamList, "PatientList">

const RESULTS_PER_PAGE = 20
const INITIAL_RESULTS_PER_PAGE = 60

const ITEM_HEIGHT = 100

type SearchForm = {
  searchQuery: string;
  sex: Patient["sex"]
  country: string;
  hometown: string;
  camp: string;
  phone: string;
  yearOfBirth: number;
  minAge: number;
  maxAge: number;
}


export default function PatientList(props: Props) {
  const { navigation } = props
  const [current, send] = useMachine(patientListMachine);
  const [isSearching, setIsSearching] = useState(false)
  const [currentPage, setCurrentPage] = useState(0)
  const [totalPatientsCount, setTotalPatientsCount] = useState(0)
  const [patients, setPatients] = useState<Patient[]>([])

  const isRtl = useLanguageStore(state => state.isRtl)

  const openPatientFile = useCallback((patient: Patient) => {
    return navigation.navigate("PatientView", {
      patient: {
        id: patient.id,
        sex: patient.sex,
        camp: patient.camp,
        phone: patient.phone,
        country: patient.country,
        surname: patient.surname,
        hometown: patient.hometown,
        givenName: patient.givenName,
        dateOfBirth: patient.dateOfBirth,
        additionalData: patient.additionalData,
        createdAt: new Date(patient.createdAt).getTime(),
        updatedAt: new Date(patient.updatedAt).getTime(),
      },
    })
  }, [])

  const goToNewPatient = useCallback(() => {
    navigation.navigate("NewPatient", { patient: undefined })
  }, [])

  useEffect(() => {
    const patientsSubscribe = database
      .get<PatientModel>("patients")
      .query(
        // Q.skip(RESULTS_PER_PAGE * currentPage),
        Q.sortBy("updated_at", Q.desc),
        Q.take(INITIAL_RESULTS_PER_PAGE + RESULTS_PER_PAGE * currentPage),
      )
      .observe()
      .subscribe((patients: PatientModel[]) => {
        // console.warn('sub');
        setPatients(patients as unknown as Patient[])
      })

    // database.get<EventModel>('events').query().fetch().then(console.log);
    return () => {
      patientsSubscribe.unsubscribe()
    }
  }, [currentPage])



  const performSearch = useCallback((form: SearchForm, isAdvanced: boolean) => {
    console.log("perform search", form)

    // if the search string is empty and it is not an advanced field, exit the search mode
    if (form.searchQuery.trim().length === 0 && isAdvanced === false) {
      console.warn("reseting")
      return send({ type: "RESET" })
    }

    if (form.searchQuery.length === 0) return;


    // Set state to searching
    send({ type: 'SEARCH' });

    const queries = !isAdvanced ? [] : [
      form.sex.length > 0 && Q.where("sex", Q.eq(form.sex)),
      form.country.length > 0 && Q.where("country", Q.like(`${Q.sanitizeLikeString(form.country)}%`)),
      form.yearOfBirth > 1900 && typeof form.yearOfBirth === "number" && Number.isSafeInteger(form.yearOfBirth) && form.yearOfBirth <= new Date().getFullYear() && Q.where(
        "date_of_birth",
        // date of birth is stored as a string like: `yyyy-mm-dd`
        Q.like(`${Q.sanitizeLikeString(form.yearOfBirth.toString())}%`)
      )
    ].filter(v => typeof v !== "boolean");


    // Create a query string that searches first and last name.
    const language = detectLanguage(form.searchQuery)
    const queryStr = (() => {
      const searchQ =
        language === "en" ?
          Q.sanitizeLikeString(form.searchQuery)
          : removeSpecialCharacters(form.searchQuery)
      return Q.or(
        Q.where("given_name", Q.like(`%${searchQ}%`)),
        Q.where("surname", Q.like(`%${searchQ}%`))
      )
    })()


    console.log({ queries, searchQuery: form.searchQuery })
    console.warn(language, removeSpecialCharacters(form.searchQuery))

    // Perform search on database
    database.get<PatientModel>("patients")
      .query(
        // Add or support for first or last name match
        // Q.or(
        // Q.where("given_name", Q.like(`%${Q.sanitizeLikeString(form.searchQuery)}%`)),
        // Q.where("given_name", Q.like(`%${form.searchQuery}%`)),
        // Q.where("surname", Q.like(`%${Q.sanitizeLikeString(form.searchQuery)}%`)),
        // ),
        // Q.where("given_name", Q.like(`%${Q.sanitizeLikeString(form.searchQuery)}%`)),
        queryStr,
        ...queries,
        Q.sortBy("created_at", Q.desc),
        Q.take(50),
      )
      .fetch()
      .then((patients: PatientModel[]) => {
        // console.warn('sub');
        console.log("PATIENTS: ")
        console.log({ patients })
        // setPatients(patients as unknown as Patient[])
        // Set state to results with the result findings
        send({ type: 'RESULTS', results: patients });
      })
    // Set state to results with the result findings
  }, [])

  const cancelSearch = useCallback(() => {
    send({ type: 'RESET' });
  }, [])


  useEffect(() => {
    const sub = database
      .get<PatientModel>("patients")
      .query()
      .observeCount()
      .subscribe((res) => setTotalPatientsCount(res))

    return () => {
      sub.unsubscribe()
    }
  }, [])

  const getNextPagePatients = () => {
    console.log("fetch more patients")
    if (current.matches("idle") === false) {
      return
    }
    setCurrentPage((currentPage) => currentPage + 1)
  }

  return (
    <>
      <Screen preset="fullScreenFixed">
        <FlashList
          onRefresh={getNextPagePatients}
          refreshing={false}
          disableAutoLayout={true}
          ItemSeparatorComponent={() => <View style={$separator} />}
          ListHeaderComponent={
            <HeaderSearch cancelSearch={cancelSearch} submitSearch={performSearch} totalPatientsCount={totalPatientsCount} />
          }
          ListFooterComponent={() => <View style={{ height: 40 }} />}
          horizontal={false}
          data={current.matches("idle") ? patients : current.context.searchResults}
          estimatedItemSize={120}
          onEndReached={getNextPagePatients}
          renderItem={({ item }: { item: Patient }) => (
            <PatientListItem
              patient={item}
              onPatientSelected={openPatientFile}
            />
          )}
        />
      </Screen>
      <If condition={current.matches("idle")}>
        <FAB
          icon="plus"
          color="white"
          testID="newPatientBtn"
          label={translate("patientList.newPatient")}
          style={[$fab, isRtl ? { left: 4 } : { right: 4 }]}
          onPress={goToNewPatient}
        />
      </If>
    </>
  )
}

type HeaderSearchProps = {
  cancelSearch: () => void;
  submitSearch: (form: SearchForm, isAdvanced: boolean) => void;
  totalPatientsCount: number;
}

export const HeaderSearch = ({ submitSearch, totalPatientsCount, cancelSearch }: HeaderSearchProps) => {
  const [form, setForm] = useState<SearchForm>({
    searchQuery: "",
    sex: "male",
    country: "",
    hometown: "",
    yearOfBirth: 0,
    camp: "",
    phone: "",
    minAge: 0,
    maxAge: 0,
  })

  // const theme = useColorScheme()

  // const isDark = theme === "dark"
  const [isAdvancedSearch, setIsAdvancedSearch] = useState(false)

  const toggleAdvancedSearch = () => setIsAdvancedSearch(s => !s)

  const setFormField = (field: keyof SearchForm) => (value: string | number) => {
    setForm(f => ({ ...f, [field]: value }))
  }

  const clearForm = () => {
    setForm({
      searchQuery: "",
      country: "",
      hometown: "",
      camp: "",
      phone: "",
      sex: "",
      yearOfBirth: 0,
      minAge: 0,
      maxAge: 0,
    })

    cancelSearch()
  }


  return (
    <View style={$searchBarContainer}>
      <Searchbar
        placeholder={translate("patientSearch")}
        onChangeText={setFormField("searchQuery")}
        clearButtonMode="always"
        clearIcon={"close"}
        onClearIconPress={cancelSearch}
        onIconPress={() => submitSearch(form, isAdvancedSearch)}
        onSubmitEditing={() => submitSearch(form, isAdvancedSearch)}
        value={form.searchQuery}
      />
      <View style={$subSearchRow}>
        <Text variant="bodyLarge">{totalPatientsCount.toLocaleString()} {translate("patients")}</Text>

        <TouchableOpacity style={$row} testID="advancedFilters" onPress={toggleAdvancedSearch}>
          <Text variant="bodyLarge">{translate("advancedFilters")}</Text>
          <Icon name={isAdvancedSearch ? "chevron-up" : "chevron-down"} size={20} />
        </TouchableOpacity>
      </View>

      <If condition={isAdvancedSearch}>
        <View style={{ rowGap: 12 }}>
          <View style={{ display: "flex", flexDirection: "row", columnGap: 8 }}>
            <TextInput testID="country" mode="outlined" onChangeText={setFormField("country")} value={form.country} style={$searchInput} label={translate("country")} />
            <TextInput testID="yearOfBirth" mode="outlined" onChangeText={setFormField("yearOfBirth")} value={textInputNumber(form.yearOfBirth)} style={$searchInput} label={translate("patientList.yearOfBirth")} />
          </View>

          {/*<View style={{ display: "flex", flexDirection: "row", columnGap: 8 }}>
            <TextInput mode="outlined" onChangeText={setFormField("camp")} value={form.camp} style={$searchInput} label={translate("camp")} />
            <TextInput mode="outlined" onChangeText={setFormField("phone")} value={form.phone} style={$searchInput} label={translate("phone")} />
          </View>*/}

          {/* <View style={{ display: "flex", flexDirection: "row", columnGap: 8 }}>
          <TextInput mode="outlined" onChangeText={setFormField("minAge")} value={String(form.minAge)} keyboardType="number-pad" style={$searchInput} label="Min Age" />
          <TextInput mode="outlined" onChangeText={setFormField("maxAge")} value={String(form.maxAge)} keyboardType="number-pad" style={$searchInput} label="Max Age" />
        </View> */}

          <View style={{ display: "flex", flexDirection: "row", columnGap: 8, paddingHorizontal: 8 }}>
            <HorizontalRadioGroup
              options={[{ label: translate("male"), value: "male" }, { label: translate("female"), value: "female" }]}
              value={form.sex}
              onChange={setFormField("sex")}
              label={translate("sex")} />
          </View>

          <View style={{ display: "flex", flexDirection: "row", columnGap: 8 }}>
            <Button mode="contained" onPress={() => submitSearch(form)} labelStyle={{ color: "#fff" }} style={$flex1}>{translate("patientList.search")}</Button>
            <Button mode="outlined" onPress={clearForm} style={$flex1}>{translate("patientList.clear")}</Button>

          </View>

        </View>
        <Divider style={{ marginVertical: 28 }} />
      </If>

    </View>
  )
}


/**
Function takes in a number and converts it into a userfirendly string that can be seen on the input.
If the input is 0, the output is an empty string
*/
function textInputNumber(num: number): string {
  if (num === 0 || typeof num !== "number") {
    return "";
  }
  return num.toString()
}


const $subSearchRow: ViewStyle = {
  display: "flex",
  flexDirection: "row",
  justifyContent: "space-between",
  paddingVertical: 8
}

const $searchInput: ViewStyle = {
  flex: 1,
}

const $flex1: ViewStyle = {
  flex: 1,
}


const $row: ViewStyle = {
  display: "flex",
  flexDirection: "row",
  alignItems: "center"
}

const $fab: ViewStyle = {
  position: "absolute",
  backgroundColor: primary,
  margin: 16,
  // right: 4, // this is overwriten on the screen
  bottom: 10,
}

const $searchBarContainer: ViewStyle = {
  backgroundColor: "transparent",
  padding: 10,
  paddingBottom: 10,
}

const $separator: ViewStyle = {
  height: 1,
  backgroundColor: "#ECECEC",
  marginVertical: 24,
}
