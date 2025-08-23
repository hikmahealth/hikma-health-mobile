import { useState } from "react"
import { Pressable, StyleProp, TextStyle, ViewStyle } from "react-native"
import MiniSearch, { SearchResult } from "minisearch"

import { Button } from "@/components/Button"
import { Text } from "@/components/Text"
import { TextField } from "@/components/TextField"
import { View } from "@/components/View"
import icd11Xs from "@/data/icd11-xs"
import { useDebounce } from "@/hooks/useDebounce"
import ICDEntry from "@/models/ICDEntry"
import { colors } from "@/theme/colors"

// TOMBSTONE: Aug 3, 2025
// let miniSearch = new MiniSearch({
//   idField: "code",
//   fields: ["code", "desc", "desc_ar"], // fields to index for full-text search
//   storeFields: ["code", "desc", "desc_ar"], // fields to return with search results
//   searchOptions: {
//     boost: { desc_ar: 4 },
//     fuzzy: 0.35,
//   },
// })

const miniSearch = new MiniSearch({
  fields: ["desc", "code"], // fields to index for full-text search
  storeFields: ["desc", "code"], // fields to return with search results
  idField: "code",
  searchOptions: {
    // prefix: true,
    fuzzy: 1,
    boost: {
      desc: 5,
      code: 1,
    },
  },
})

// Initializes only once
miniSearch.addAll(icd11Xs)

export interface DiagnosisEditorProps {
  /**
   * An optional style override useful for padding & margin.
   */
  style?: StyleProp<ViewStyle>

  onSubmit: (diagnoses: ICDEntry.T[]) => void

  diagnoses: ICDEntry.T[]

  language: string
}

/**
 * Diagnosis Editor
 */
export const DiagnosisEditor = function DiagnosisEditor(props: DiagnosisEditorProps) {
  const { style, diagnoses, onSubmit, language } = props
  const $styles = [$container, style]

  const [searchQuery, setSearchQuery] = useState("")
  const [selectedDiagnoses, setSelectedDiagnoses] = useState<ICDEntry.T[]>([...diagnoses])

  const selectDiagnosis = (diagnosis: ICDEntry.T) => () => {
    setSelectedDiagnoses((sd) => [...sd, diagnosis])
    setSearchQuery("")
  }

  // TODO: Make one of the descriptions an empty string
  const createDiagnosis = () => selectDiagnosis({ code: "0000", desc: searchQuery })()

  const removeDiagnosis = (code: string) => () => {
    setSelectedDiagnoses((sd) => sd.filter((d) => d.code !== code))
  }

  const removeSelected = (result: ICDEntry.T) => {
    return !selectedDiagnoses.find((d) => d.code === result.code)
  }

  /** Get a diagnosis object from the search result item */
  const getResultDiagnosis = (res: SearchResult): ICDEntry.T => ({
    code: res.code,
    desc: res.desc,
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
}

function DiagnosisListItem({
  onPress,
  diagnosis,
  language,
}: {
  diagnosis: ICDEntry.T
  onPress?: () => void
  language: string
}) {
  const { code, desc } = diagnosis
  const $listItemStyle = {
    // ...$diagnosisListItem,
    // backgroundColor: isDark ? "#222" : "#ccc",
    backgroundColor: colors.palette.neutral300,
    borderRadius: 8,
  }

  return (
    <Pressable onPress={onPress}>
      <View my={10} py={10} px={14} style={$listItemStyle}>
        <Text size="md">{ICD10RecordLabel({ code, desc }, language)}</Text>
      </View>
    </Pressable>
  )
}

/**
Show the chips of the selected diagnoses

@param {ICDEntry.T} diagnosis
@param {string} language
@param {() => void} onPress
*/
export function SelectedDiagnosis(props: {
  diagnosis: ICDEntry.T
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

@param {ICDEntry.T} entry
@param {string} language
@returns {string} diagnosis display field
*/
export function ICD10RecordLabel(entry: ICDEntry.T, language: string): string {
  const diagField = language === "ar" ? "desc_ar" : "desc"
  if (diagField === "desc_ar" && "desc_ar" in entry && entry.desc_ar) {
    return `${entry.desc_ar} (${entry.code})`
  } else if (diagField === "desc" && entry.desc) {
    return `${entry.desc} (${entry.code})`
  } else {
    return `${entry.desc} (${entry.code})`
  }
}

type DiagnosisPickerButtonProps = {
  value: ICDEntry.T[]
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
        <Text style={$diagnosisText} text={diagnosesList} />
      </View>
    </Pressable>
  )
}

const $diagnosisText: TextStyle = {
  lineHeight: 22,
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

const $selectedDiagnosesContainer: ViewStyle = {
  display: "flex",
  flexDirection: "row",
  flexWrap: "wrap",
  rowGap: 4,
}
