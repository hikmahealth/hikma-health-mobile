import React, { useState } from "react"
import { View, ViewStyle, Pressable, useColorScheme } from "react-native"
import { useNavigation, useRoute } from "@react-navigation/native"
import { Searchbar, Chip } from "react-native-paper"
import MiniSearch, { SearchResult } from "minisearch"
import { useDebounce } from "../hooks/useDebounce"
import { Text } from "../components/Text"
import { Screen } from "../components/Screen"
import icd10Xs from "../data/icd10-xs"
import { Button } from "../components/Button"
import { useLanguageStore } from "../stores/language"

export type ICD10Entry = {
  code: string
  desc: string
  desc_ar: string
}

let miniSearch = new MiniSearch({
  idField: "code",
  fields: ["code", "desc", "desc_ar"], // fields to index for full-text search
  storeFields: ["code", "desc", "desc_ar"], // fields to return with search results
  searchOptions: {
    boost: { desc_ar: 4 },
    fuzzy: 0.35,
  },
})

// Initializes only once
miniSearch.addAll(icd10Xs)

export function DiagnosisPickerScreen() {
  const navigation = useNavigation()
  const route = useRoute()
  const [isRtl, language] = useLanguageStore((state) => [state.isRtl, state.language])

  // field that determines the diagnosis language to be presented
  const diagnosisFieldKey = language === "ar" ? 'desc_ar' : 'desc'

  const { diagnoses } = route.params
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedDiagnoses, setSelectedDiagnoses] = useState<ICD10Entry[]>([...diagnoses])

  const selectDiagnosis = (diagnosis: ICD10Entry) => () => {
    setSelectedDiagnoses((sd) => [...sd, diagnosis])
    setSearchQuery("")
  }

  // TODO: Make one of the descriptions an empty string
  const createDiagnosis = () => selectDiagnosis({ code: "0000", desc: searchQuery, desc_ar: searchQuery })()

  const removeDiagnosis = (code: string) => () => {
    setSelectedDiagnoses((sd) => sd.filter((d) => d.code !== code))
  }

  const removeSelected = (result: ICD10Entry) => {
    return !selectedDiagnoses.find((d) => d.code === result.code)
  }

  const submit = () => {
    navigation.navigate({
      name: "EventForm",
      params: {
        diagnoses: selectedDiagnoses,
      },
      merge: true,
    })
  }
  const debouncedSearchQ = useDebounce(searchQuery, 500)

  const searchResults = miniSearch.search(debouncedSearchQ)

  const onChangeSearch = (query) => setSearchQuery(query)

  /** Get a diagnosis object from the search result item */
  const getResultDiagnosis = (res: SearchResult): ICD10Entry => ({ code: res.code, desc: res.desc, desc_ar: res.desc_ar })

  return (
    <Screen preset="scroll">
      <View style={$formContainer}>
        <Searchbar placeholder="Search" onChangeText={onChangeSearch} value={searchQuery} />
        <View style={$selectedDiagnosesContainer}>
          {selectedDiagnoses.map((diagnosis, ix) => (
            <SelectedDiagnosis
              key={diagnosis.code + ix}
              diagnosis={diagnosis}
              language={language}
              onPress={removeDiagnosis(diagnosis.code)}
            />
          ))}
        </View>

        {searchResults
          .slice(0, 25)
          .filter(removeSelected)
          .map((result, ix) => {
            const diagnosis = getResultDiagnosis(result)
            return (
              <DiagnosisListItem
                key={diagnosis.code + ix}
                onPress={selectDiagnosis(diagnosis)}
                language={language}
                diagnosis={diagnosis}
              />
            )
          })}

        {searchQuery.length > 0 && (
          <DiagnosisListItem
            onPress={createDiagnosis}
            language={language}
            diagnosis={{
              code: "0000",
              desc: `+ Create "${searchQuery}"`,
              desc_ar: `+ Create "${searchQuery}"`
            }}
          />
        )}

        {searchResults.length === 0 && searchQuery.length === 0 && (
          <Button mode="contained" onPress={submit}>
            Submit
          </Button>
        )}
      </View>
    </Screen>
  )
}

function DiagnosisListItem({ onPress, diagnosis, language }: { diagnosis: ICD10Entry, onPress?: () => void, language: string }) {
  const { code, desc, desc_ar } = diagnosis
  // get color theme
  const isDark = useColorScheme() === "dark"
  const listItemStyle = {
    ...$diagnosisListItem,
    backgroundColor: isDark ? "#222" : "#ccc",
  }

  return (
    <Pressable style={listItemStyle} onPress={onPress}>
      <Text style={$diagnosisLabel}>{ICD10RecordLabel({ code, desc, desc_ar }, language)}</Text>
    </Pressable>
  )
}


/**
Show the chips of the selected diagnoses

@param {ICD10Entry} diagnosis
@param {string} lagnuage
@param {() => void} onPress
*/
export function SelectedDiagnosis(props: { diagnosis: ICD10Entry, language: string, onPress?: () => void }) {
  const { diagnosis, language, onPress } = props
  return <Chip onPress={onPress}>{ICD10RecordLabel(diagnosis, language)}</Chip>
}

/**
Render out a language appropriate diagnosis string

@param {ICD10Entry} entry
@param {string} language
@returns {string} diagnosis display field
*/
export function ICD10RecordLabel(entry: ICD10Entry, language: string): string {
  const diagField = language === "ar" ? 'desc_ar' : 'desc'
  return `${entry[diagField]} (${entry.code})`
}

export function DiagnosisPickerButton({ value }: { value: ICD10Entry[] }) {
  const navigation = useNavigation()
  const [isRtl, language] = useLanguageStore((state) => [state.isRtl, state.language])

  const openDiagnosisPicker = () => {
    navigation.navigate({ name: "DiagnosisPicker", params: { diagnoses: value } })
  }

  const diagnosesList = value.map((diagnosis) => ICD10RecordLabel(diagnosis, language)).join(", ")

  // TODO: reverse the string orientation for arabic
  return (
    <Pressable onPress={openDiagnosisPicker}>
      <Text variant="labelLarge" text="Diagnosis Picker" />
      <View style={$pickerButton}>
        <Text style={{ lineHeight: 22 }} variant="bodyLarge" text={diagnosesList} />
      </View>
    </Pressable>
  )
}

const $pickerButton: ViewStyle = {
  display: "flex",
  borderWidth: 1,
  borderColor: "#555",
  padding: 14,
  marginVertical: 4,
  borderRadius: 4,
  flexDirection: "row",
  flexWrap: "wrap",
  rowGap: 4,
}

const $selectedDiagnosesContainer: ViewStyle = {
  display: "flex",
  flexDirection: "row",
  flexWrap: "wrap",
  rowGap: 4,
}

const $formContainer: ViewStyle = {
  rowGap: 10,
  padding: 8,
}

const $diagnosisListItem: ViewStyle = {
  padding: 12,
  paddingVertical: 24,
  marginVertical: 4,
  borderRadius: 4,
  borderWidth: 1,
  backgroundColor: "#222",
}

const $diagnosisLabel: ViewStyle = {
  fontSize: 16,
}
