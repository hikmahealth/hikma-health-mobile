import React, { useEffect, useCallback } from "react"
import { View, ViewStyle, Pressable } from "react-native"
import { useNavigation, useRoute } from "@react-navigation/native"
import { Searchbar, Chip, TextInput } from "react-native-paper"
import { Picker, PickerProps } from "@react-native-picker/picker"
import { MapOrEntries, useMap } from "usehooks-ts"
import { upperFirst } from "lodash"
import { useDebounce } from "../hooks/useDebounce"
import { Text } from "../components/Text"
import { Screen } from "../components/Screen"
import { ControlledTextField } from "../components/ControlledTextField"
import { ControlledRadioGroup } from "../components/ControlledRadioGroup"
import { ControlledDatePickerButton } from "../components/DatePicker"
import { ControlledSelectField } from "../components/ControlledSelectField"
import { Button } from "../components/Button"
import medicationsList from "../data/medicationsList"
import { useLanguageStore } from "../stores/language"

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

export function MedicationEditorScreen() {
  const navigation = useNavigation()
  const route = useRoute()

  const language = useLanguageStore((state) => state.language)
  const [map, actions] = useMap<keyof MedicationEntry, string | number>(initialValues)

  const { medication } = route.params || {}
  // TODO: Add medication props to map of state

  useEffect(() => {
    if (medication) {
      actions.setAll(new Map(Object.entries(medication)))
    } else {
      actions.setAll(initialValues)
    }
  }, [medication])

  const setValue = (key: keyof MedicationEntry) => (value: string | number) => {
    actions.set(key, value)
  }

  const getValue = (key: keyof MedicationEntry) => {
    return map.get(key)
  }
  const submit = () => {
    console.log(Object.fromEntries(map.entries()))
    navigation.navigate({
      name: "EventForm",
      params: {
        medication: {
          id: Math.random().toString(),
          ...Object.fromEntries(map.entries()),
        },
      },
      merge: true,
    })
  }


  console.log("first", map)



  /** Filter out the medications list using the search query. This supports english and arabic fields. */
  const filterMedSuggestions = ((meds: { name: string, name_ar: string, form: string }[], language: string) => (query: string) => {
    // if the query is non-existant, dont show any suggestions
    if (query.length === 0) return []

    const field = language === "ar" ? "name_ar" : "name"

    const searchResults = meds.filter(m => m[field].toLowerCase().includes(query.toLowerCase()))

    // if there is at least one result and the same one already entered in the search, then return no suggestions
    if (searchResults.length >= 1 && searchResults[0][field].toLowerCase() === query.toLowerCase()) {
      return []
    }

    return searchResults
  })(medicationsList, language)


  return (
    <Screen preset="scroll">
      <View style={$formContainer}>
        <View>
          <Text variant="titleLarge">Medicine</Text>
          <View style={$medicineInputRow}>
            <TextInput
              label="Medicine Name"
              value={map.get("name")}
              onChangeText={setValue("name")}
              mode="outlined"
            />

            <View style={{ display: "flex", flexDirection: "row", flexWrap: "wrap", gap: 4 }}>
              {
                filterMedSuggestions((map.get("name") || "") as string).slice(0, 5).map((suggestion, idx) => (
                  <Pressable
                    onPress={() => {
                      setValue("name")(language === "ar" ? suggestion.name_ar : suggestion.name)
                    }}
                    key={suggestion.name + String(idx)}
                    style={{ padding: 8, backgroundColor: "#ccc", borderRadius: 8 }}>
                    <Text text={upperFirst(language === "ar" ? suggestion.name_ar : suggestion.name)} />
                  </Pressable>
                ))
              }
            </View>
            <Picker selectedValue={map.get("form")} onValueChange={setValue("form")}>
              <Picker.Item label={"Choose an option"} value="" />
              {stringsListToOptions(medicineFormOptions).map((option) => (
                <Picker.Item key={option.value} label={option.label} value={option.value} />
              ))}
            </Picker>
          </View>
          <View style={[$medicineInputRow, $inputWithUnits]}>
            <TextInput
              value={getValue("dose")}
              label="Dose (Concentration)"
              mode="outlined"
              style={{ flex: 5 }}
              onChangeText={setValue("dose")}
            />

            <View style={{ flex: 2 }}>
              <Text variant="labelSmall" text="Units" />
              <Picker selectedValue={getValue("doseUnits")} onValueChange={setValue("doseUnits")}>
                <Picker.Item label={"Units"} value="" />
                {stringsListToOptions(doseUnitOptions, false).map((option) => (
                  <Picker.Item key={option.value} label={option.label} value={option.value} />
                ))}
              </Picker>
            </View>
          </View>
          <View style={$medicineInputRow}>
            <TextInput
              label="Frequency"
              mode="outlined"
              placeholder="1 x 3 for 3 days"
              value={getValue("frequency")}
              onChangeText={setValue("frequency")}
            />
            <View>
              <Text variant="labelSmall" text="Route" />
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
        <Button mode="contained" onPress={submit}>
          Save
        </Button>
      </View>
    </Screen>
  )
}

export function MedicationsFormItem({
  value,
  deleteEntry,
  viewOnly = true,
}: {
  value: MedicationEntry[]
  deleteEntry: (medicine: MedicationEntry["id"]) => void
  viewOnly?: boolean
}) {
  const navigation = useNavigation()
  const openMedicationEditor = () => {
    navigation.navigate("MedicationEditor")
  }

  const editEntry = (medication: MedicationEntry) => () => {
    navigation.navigate("MedicationEditor", { medication })
  }

  // return <Text>Not implemented yet</Text>
  return (
    <View>
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <Text variant="labelLarge" text="Medications List" />
        <Button icon="plus" mode="text" onPress={openMedicationEditor}>
          <Text variant="labelLarge" text="Add Medication" />
        </Button>
      </View>

      <View>
        {value.map((med) => (
          <View
            key={med.name}
            style={{ borderBottomWidth: 1, borderBottomColor: "#ccc", paddingBottom: 8 }}
          >
            <Text variant="headlineSmall" text={med.name} />
            <View style={$row}>
              <Text text={String(med.dose || "")} />
              <Text text=" " />
              <Text text={med.doseUnits || ""} />
            </View>
            <View style={$row}>
              <Text text={upperFirst(med.route || "")} />
              <Text text=" " />
              <Text text={upperFirst(med.form || "")} />
              <Text text=": " />
              <Text text={String(med.frequency || "")} />
            </View>

            {!viewOnly && (
              <View style={$row}>
                <Button onPress={() => deleteEntry(med.id)} icon="delete" textColor="red">
                  <Text style={{ color: "red" }} text="Delete" />
                </Button>
                <View style={{ width: 18 }} />
                <Button icon="pencil" onPress={editEntry(med)}>
                  <Text style={{ color: "#3A539B" }} text="Edit" />
                </Button>
              </View>
            )}
          </View>
        ))}
      </View>
    </View>
  )
}

type MedicineRoute =
  | "oral"
  | "sublingual"
  | "rectal"
  | "topical"
  | "inhalation"
  | "intravenous"
  | "intramuscular"
  | "intradermal"
  | "subcutaneous"
  | "nasal"
  | "ophthalmic"
  | "otic"
  | "vaginal"
  | "transdermal"
  | "other"

const medicineRouteOptions: MedicineRoute[] = [
  "oral",
  "sublingual",
  "rectal",
  "topical",
  "inhalation",
  "intravenous",
  "intramuscular",
  "intradermal",
  "subcutaneous",
  "nasal",
  "ophthalmic",
  "otic",
  "vaginal",
  "transdermal",
  "other",
]

type MedicineForm =
  | "tablet"
  | "syrup"
  | "ampule"
  | "suppository"
  | "cream"
  | "drops"
  | "bottle"
  | "spray"
  | "gel"
  | "lotion"
  | "inhaler"
  | "capsule"
  | "injection"
  | "patch"
  | "other"
const medicineFormOptions: MedicineForm[] = [
  "tablet",
  "syrup",
  "ampule",
  "suppository",
  "cream",
  "drops",
  "bottle",
  "spray",
  "gel",
  "lotion",
  "inhaler",
  "capsule",
  "injection",
  "patch",
  "other",
]
type DurationUnit = "hours" | "days" | "weeks" | "months" | "years"
const durationUnitOptions: DurationUnit[] = ["hours", "days", "weeks", "months", "years"]
type DoseUnit = "mg" | "g" | "mcg" | "mL" | "L" | "units"
const doseUnitOptions: DoseUnit[] = ["mg", "g", "mcg", "mL", "L", "units"]

export type MedicationEntry = {
  id: string
  name: string
  route: MedicineRoute
  form: MedicineForm
  frequency: number
  intervals: number
  dose: number
  doseUnits: DoseUnit
  duration: number
  durationUnits: DurationUnit
}

type ControlledMedicineFieldProps = {
  fields: MedicationEntry
}

export const ControlledMedicineField = (props: ControlledMedicineFieldProps) => {
  const { fields } = props

  console.log(fields.form)
  return (
    <View>
      <Text variant="titleLarge">Medicine</Text>
      <View style={$medicineInputRow}>
        <ControlledTextField name="medicine.name" label="Medicine Name" mode="outlined" />
        <ControlledSelectField
          name="medicine.form"
          label="Form"
          options={stringsListToOptions(fields.form.options)}
        />
      </View>
      <View style={$medicineInputRow}>
        <ControlledTextField name="medicine.dose" label="Dose (Concentration)" mode="outlined" />
        <ControlledSelectField
          name="medicine.doseUnits"
          label="Units"
          options={stringsListToOptions(fields.doseUnits.options)}
        />
      </View>
      <View style={$medicineInputRow}>
        <ControlledTextField
          name="medicine.frequency"
          label="Frequency"
          mode="outlined"
          placeholder="1 x 3 for 3 days"
        />
        <ControlledSelectField
          name="medicine.route"
          label="Medicine Route"
          options={stringsListToOptions(fields.route.options)}
        />
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
  gap: 10,
  paddingVertical: 12,
  borderBottomWidth: 1,
  borderBottomColor: "#e0e0e0",
}

const $formContainer: ViewStyle = {
  rowGap: 10,
  padding: 8,
}

const $row: ViewStyle = {
  flexDirection: "row",
}

const $inputWithUnits: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
}
