import * as React from "react"
import { Pressable, StyleProp, TextStyle, ViewStyle, useColorScheme } from "react-native"
import { observer } from "mobx-react-lite"
import { colors, typography } from "../theme"
import { Text } from "../components/Text"
import icd11Xs from "../data/icd11-xs" // use icd10-xs to load the icd10 codes with the arabic translations
import MiniSearch, { SearchResult } from "minisearch"
import { ICDEntry } from "../types"
import { useState } from "react"
import { useDebounce } from "../hooks/useDebounce"
import { TextField } from "./TextField"
import { Button } from "./Button"
import { View } from "./View"

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
miniSearch.addAll(icd11Xs)

export interface DiagnosisEditorProps {
  /**
   * An optional style override useful for padding & margin.
   */
  style?: StyleProp<ViewStyle>

  onSubmit: (diagnoses: ICDEntry[]) => void

  diagnoses: ICDEntry[]

  language: string
}

/**
 * Diagnosis Editor
 */
export const DiagnosisEditor = observer(function DiagnosisEditor(props: DiagnosisEditorProps) {
  const { style, diagnoses, onSubmit, language } = props
  const $styles = [$container, style]

  const [searchQuery, setSearchQuery] = useState("")
  const [selectedDiagnoses, setSelectedDiagnoses] = useState<ICDEntry[]>([...diagnoses])

  const selectDiagnosis = (diagnosis: ICDEntry) => () => {
    setSelectedDiagnoses((sd) => [...sd, diagnosis])
    setSearchQuery("")
  }

  // TODO: Make one of the descriptions an empty string
  const createDiagnosis = () =>
    selectDiagnosis({ code: "0000", desc: searchQuery, desc_ar: searchQuery })()

  const removeDiagnosis = (code: string) => () => {
    setSelectedDiagnoses((sd) => sd.filter((d) => d.code !== code))
  }

  const removeSelected = (result: ICDEntry) => {
    return !selectedDiagnoses.find((d) => d.code === result.code)
  }

  /** Get a diagnosis object from the search result item */
  const getResultDiagnosis = (res: SearchResult): ICDEntry => ({
    code: res.code,
    desc: res.desc,
    desc_ar: res.desc_ar,
  })

  const submit = () => {
    onSubmit(selectedDiagnoses)
  }
  const debouncedSearchQ = useDebounce(searchQuery, 500)

  const searchResults = miniSearch.search(debouncedSearchQ)

  return (
    <View style={$styles} pb={30}>
      <TextField placeholder="Search" onChangeText={setSearchQuery} value={searchQuery} />
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
        .slice(0, 10)
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
            desc_ar: `+ Create "${searchQuery}"`,
          }}
        />
      )}

      {searchResults.length === 0 && searchQuery.length === 0 && (
        <Button onPress={submit} style={{ marginTop: 30 }}>
          <Text text="Save" />
        </Button>
      )}
    </View>
  )
})

function DiagnosisListItem({
  onPress,
  diagnosis,
  language,
}: {
  diagnosis: ICDEntry
  onPress?: () => void
  language: string
}) {
  const { code, desc, desc_ar } = diagnosis
  // get color theme
  const isDark = false // useColorScheme() === "dark"
  const listItemStyle = {
    // ...$diagnosisListItem,
    backgroundColor: isDark ? "#222" : "#ccc",
  }

  return (
    <Pressable onPress={onPress}>
      <View
        my={10}
        py={10}
        px={14}
        style={{ backgroundColor: colors.palette.neutral300, borderRadius: 8 }}
      >
        <Text size="md">{ICD10RecordLabel({ code, desc, desc_ar }, language)}</Text>
      </View>
    </Pressable>
  )
}

/**
Show the chips of the selected diagnoses

@param {ICDEntry} diagnosis
@param {string} lagnuage
@param {() => void} onPress
*/
export function SelectedDiagnosis(props: {
  diagnosis: ICDEntry
  language: string
  onPress?: () => void
}) {
  const { diagnosis, language, onPress } = props
  return (
    <Pressable style={$chip} onPress={onPress}>
      <Text text={ICD10RecordLabel(diagnosis, language)} />
    </Pressable>
  )
}

/**
Render out a language appropriate diagnosis string

@param {ICDEntry} entry
@param {string} language
@returns {string} diagnosis display field
*/
export function ICD10RecordLabel(entry: ICDEntry, language: string): string {
  const diagField = language === "ar" ? "desc_ar" : "desc"
  if (entry[diagField]) {
    return `${entry[diagField]} (${entry.code})`
  } else {
    return `${entry.desc} (${entry.code})`
  }
}

type DiagnosisPickerButtonProps = {
  value: ICDEntry[]
  language: string
  openDiagnosisPicker: () => void
}

export function DiagnosisPickerButton({
  value,
  openDiagnosisPicker,
  language,
}: DiagnosisPickerButtonProps) {
  const diagnosesList = value.map((diagnosis) => ICD10RecordLabel(diagnosis, language)).join(", ")

  // TODO: reverse the string orientation for arabic
  return (
    <Pressable onPress={openDiagnosisPicker}>
      <Text preset="formLabel" text="Diagnosis Picker" />
      <View style={$pickerButton}>
        <Text style={{ lineHeight: 22 }} text={diagnosesList} />
      </View>
    </Pressable>
  )
}

const $chip: ViewStyle = {
  backgroundColor: "#eee",
  padding: 8,
  borderRadius: 4,
  margin: 4,
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

const $container: ViewStyle = {
  padding: 10,
}

const $text: TextStyle = {
  fontFamily: typography.primary.normal,
  fontSize: 14,
  color: colors.palette.primary500,
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
