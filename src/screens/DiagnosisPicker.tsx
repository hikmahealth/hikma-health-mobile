import React, { useState } from "react"
import { View, ViewStyle, Pressable, useColorScheme } from "react-native"
import { useNavigation, useRoute } from "@react-navigation/native"
import { Searchbar, Chip } from "react-native-paper"
import MiniSearch from "minisearch"
import { useDebounce } from "../hooks/useDebounce"
import { Text } from "../components/Text"
import { Screen } from "../components/Screen"
import icd10Xs from "../data/icd10-xs"
import { Button } from "../components/Button"

export type ICD10Entry = {
  code: string
  desc: string
}

let miniSearch = new MiniSearch({
  idField: "code",
  fields: ["code", "desc"], // fields to index for full-text search
  storeFields: ["code", "desc"], // fields to return with search results
  searchOptions: {
    boost: { desc: 4 },
    fuzzy: 0.35,
  },
})

miniSearch.addAll(icd10Xs)

export function DiagnosisPickerScreen() {
  const navigation = useNavigation()
  const route = useRoute()

  const { diagnoses } = route.params
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedDiagnoses, setSelectedDiagnoses] = useState<ICD10Entry[]>([...diagnoses])

  const selectDiagnosis = (diagnosis: ICD10Entry) => () => {
    setSelectedDiagnoses((sd) => [...sd, diagnosis])
    setSearchQuery("")
  }

  const createDiagnosis = () => selectDiagnosis({ code: "0000", desc: searchQuery })()

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

  return (
    <Screen preset="scroll">
      <View style={$formContainer}>
        <Searchbar placeholder="Search" onChangeText={onChangeSearch} value={searchQuery} />
        <View style={$selectedDiagnosesContainer}>
          {selectedDiagnoses.map((diagnosis, ix) => (
            <SelectedDiagnosis
              key={diagnosis.code + ix}
              {...diagnosis}
              onPress={removeDiagnosis(diagnosis.code)}
            />
          ))}
        </View>

        {searchResults
          .slice(0, 25)
          .filter(removeSelected)
          .map((result, ix) => {
            const diagnosis = result
            return (
              <DiagnosisListItem
                key={diagnosis.code + ix}
                onPress={selectDiagnosis({ code: diagnosis.code, desc: diagnosis.desc })}
                {...diagnosis}
              />
            )
          })}

        {searchQuery.length > 0 && (
          <DiagnosisListItem
            onPress={createDiagnosis}
            code="0000"
            desc={`+ Create "${searchQuery}"`}
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

function DiagnosisListItem({ onPress, code, desc }: ICD10Entry & { onPress?: () => void }) {
  // get color theme
  const isDark = useColorScheme() === "dark"
  const listItemStyle = {
    ...$diagnosisListItem,
    backgroundColor: isDark ? "#222" : "#ccc",
  }

  return (
    <Pressable style={listItemStyle} onPress={onPress}>
      <Text style={$diagnosisLabel}>{ICD10RecordLabel({ code, desc })}</Text>
    </Pressable>
  )
}

export function SelectedDiagnosis(props: ICD10Entry & { onPress?: () => void }) {
  return <Chip onPress={props.onPress}>{ICD10RecordLabel(props)}</Chip>
}

function ICD10RecordLabel(entry: ICD10Entry) {
  return `${entry.desc} (${entry.code})`
}

export function DiagnosisPickerButton({ value }: { value: ICD10Entry[] }) {
  const navigation = useNavigation()
  const openDiagnosisPicker = () => {
    navigation.navigate({ name: "DiagnosisPicker", params: { diagnoses: value } })
  }

  const diagnosesList = value.map((diagnosis) => ICD10RecordLabel(diagnosis)).join(", ")

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
