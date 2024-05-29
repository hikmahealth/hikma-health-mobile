import * as React from "react"
import { Pressable, StyleProp, TextStyle, ViewStyle } from "react-native"
import { observer } from "mobx-react-lite"
import { colors, typography } from "../theme"
import { Text } from "../components/Text"
import { MapOrEntries, useMap } from "usehooks-ts"
import { TextField } from "./TextField"
import { Picker } from "@react-native-picker/picker"
import { View } from "./View"
import { upperFirst } from "lodash"
import { useStores } from "../models"
import { Button } from "./Button"
import {
  MedicationEntry,
  doseUnitOptions,
  medicineFormOptions,
  medicineRouteOptions,
} from "../types"
import medicationsList from "../data/medicationsList"
import { useNavigation } from "@react-navigation/native"
import { PlusIcon } from "lucide-react-native"

export interface MedicationEditorProps {
  /**
   * An optional style override useful for padding & margin.
   */
  style?: StyleProp<ViewStyle>

  onSubmit: (medication: MedicationEntry) => void

  medication?: MedicationEntry
}

/** Filter out the medications list using the search query. This supports english and arabic fields. */
const getMedicationsListFilter =
  (meds: { name: string; name_ar: string; form: string }[], language: string) =>
  (query: string) => {
    // if the query is non-existant, dont show any suggestions
    if (query.length === 0) return []

    const field = language === "ar" ? "name_ar" : "name"

    const searchResults = meds.filter((m) => m[field].toLowerCase().includes(query.toLowerCase()))

    // if there is at least one result and the same one already entered in the search, then return no suggestions
    if (
      searchResults.length >= 1 &&
      searchResults[0][field].toLowerCase() === query.toLowerCase()
    ) {
      return []
    }

    return searchResults
  }

const initialValues: MapOrEntries<keyof MedicationEntry, string | number> = [
  ["id", ""],
  ["name", ""],
  ["route", ""],
  ["form", ""],
  ["frequency", 0],
  ["intervals", 0],
  ["dose", 0],
  ["doseUnits", ""],
  ["duration", 0],
  ["durationUnits", ""],
]

/**
 * Medication Editor Form
 */
export const MedicationEditor = observer(function MedicationEditor(props: MedicationEditorProps) {
  const { style, onSubmit, medication } = props
  const $styles = [$container, style]
  const { language } = useStores()

  const [map, actions] = useMap<keyof MedicationEntry, string | number>(initialValues)

  // on mount, set the initial values to the medication if one exists, else set the ID to a random string
  React.useEffect(() => {
    if (medication) {
      actions.setAll([
        ["id", medication.id || ""],
        ["name", medication.name || ""],
        ["route", medication.route || ""],
        ["form", medication.form || ""],
        ["frequency", medication.frequency || 0],
        ["intervals", medication.intervals || 0],
        ["dose", medication.dose || 0],
        ["doseUnits", medication.doseUnits || ""],
        ["duration", medication.duration || 0],
        ["durationUnits", medication.durationUnits || ""],
      ])
    } else {
      actions.set("id", Math.random().toString())
    }
  }, [])

  const setValue = (key: keyof MedicationEntry) => (value: string | number) => {
    // console.log({ key, value })
    actions.set(key, value)
  }

  const getValue = (key: keyof MedicationEntry) => {
    return map.get(key)
  }

  const filterMedSuggestions = getMedicationsListFilter(medicationsList, language.current)

  const submit = () => {
    // console.log({ map: Object.fromEntries(map.entries()) })
    const entry = Object.fromEntries(map.entries()) as MedicationEntry
    onSubmit(entry)
  }

  return (
    <View style={$container}>
      <View>
        <Text size="xl">Medicine Form</Text>
        <View style={$medicineInputRow}>
          <TextField
            label="Medicine Name"
            value={map.get("name")?.toString()}
            onChangeText={setValue("name")}
          />

          <View direction="row" gap={4} style={{ flexWrap: "wrap" }}>
            {filterMedSuggestions((map.get("name") || "") as string)
              .slice(0, 5)
              .map((suggestion, idx) => (
                <Pressable
                  onPress={() => {
                    setValue("name")(
                      language.current === "ar" ? suggestion.name_ar : suggestion.name,
                    )
                  }}
                  key={suggestion.name + String(idx)}
                  style={{ padding: 8, backgroundColor: "#ccc", borderRadius: 8 }}
                >
                  <Text
                    size="sm"
                    text={upperFirst(
                      language.current === "ar" ? suggestion.name_ar : suggestion.name,
                    )}
                  />
                </Pressable>
              ))}
          </View>
          <Picker selectedValue={map.get("form")} onValueChange={setValue("form")}>
            <Picker.Item label={"Choose medication form"} value="" />
            {stringsListToOptions(medicineFormOptions).map((option) => (
              <Picker.Item key={option.value} label={option.label} value={option.value} />
            ))}
          </Picker>
        </View>
        <View style={[$medicineInputRow, $inputWithUnits]} gap={6}>
          <TextField
            value={getValue("dose") === 0 ? "" : getValue("dose")?.toString()}
            label="Dose (Concentration)"
            style={{ flex: 5 }}
            onChangeText={(v) => {
              // verify that it is a number
              if (isNaN(Number(v))) return
              setValue("dose")(Number(v))
            }}
          />

          <View style={{ flex: 2 }}>
            {/*<Text preset="formLabel" text="Units" />*/}
            <Text text="" />
            <Picker selectedValue={getValue("doseUnits")} onValueChange={setValue("doseUnits")}>
              <Picker.Item label={"Units"} value="" />
              {stringsListToOptions(doseUnitOptions, false).map((option) => (
                <Picker.Item key={option.value} label={option.label} value={option.value} />
              ))}
            </Picker>
          </View>
        </View>
        <View style={$medicineInputRow}>
          <TextField
            label="Frequency"
            placeholder="1 x 3 for 3 days"
            value={getValue("frequency")?.toString()}
            onChangeText={setValue("frequency")}
          />
          <View>
            <Text preset="formLabel" text="Route" />
            <Picker selectedValue={getValue("route")} onValueChange={setValue("route")}>
              <Picker.Item label={"Choose the medicine Route"} value="" />
              {stringsListToOptions(medicineRouteOptions).map((option) => (
                <Picker.Item key={option.value} label={option.label} value={option.value} />
              ))}
            </Picker>
          </View>
        </View>
      </View>
      <View style={{ height: 20 }} />
      <Button onPress={submit}>Save</Button>
    </View>
  )
})

export function MedicationsFormItem({
  value,
  deleteEntry,
  openMedicationEditor,
  onEditEntry,
  viewOnly = true,
}: {
  value: MedicationEntry[]
  deleteEntry: (medicine: MedicationEntry["id"]) => void
  openMedicationEditor: () => void
  onEditEntry: (medicine: MedicationEntry) => void
  viewOnly?: boolean
}) {
  return (
    <View>
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <Text preset="formLabel" text="Medications List" />
        <Pressable
          onPress={() => openMedicationEditor()}
          style={{ flexDirection: "row", display: "flex", alignItems: "center" }}
        >
          <PlusIcon size={14} color={colors.palette.primary700} />
          <Text size="xxs" text="Add Medication" />
        </Pressable>
      </View>

      <View>
        {value.map((med) => (
          <View key={med.name} pb={6} style={{ borderBottomWidth: 1, borderBottomColor: "#ccc" }}>
            <Text preset="default" text={med.name} />
            <View style={$row}>
              <Text text={`${String(med.dose || "")} ${med.doseUnits || ""}`} />
            </View>
            <View style={$row}>
              <Text
                text={`${upperFirst(med.route || "")} ${upperFirst(med.form || "")}: ${String(
                  med.frequency || "",
                )}`}
              />
            </View>

            {!viewOnly && (
              <View style={$row}>
                <Pressable onPress={() => deleteEntry(med.id)}>
                  <Text style={{ color: "red" }} text="Delete" />
                </Pressable>
                <View style={{ width: 18 }} />
                <Pressable onPress={() => onEditEntry(med)}>
                  <Text style={{ color: "#3A539B" }} text="Edit" />
                </Pressable>
              </View>
            )}
          </View>
        ))}
      </View>
    </View>
  )
}

function stringsListToOptions(strings: string[], format = true) {
  return strings.map((string) => {
    return {
      label: format ? upperFirst(string) : string,
      value: string,
    }
  })
}

const $medicineInputRow: ViewStyle = {
  flexDirection: "column",
  gap: 1,
  paddingVertical: 8,
  borderBottomWidth: 1,
  borderBottomColor: "#e0e0e0",
}

const $container: ViewStyle = {
  rowGap: 10,
  paddingHorizontal: 10,
}

const $row: ViewStyle = {
  flexDirection: "row",
}

const $inputWithUnits: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
}
