import { useEffect, useState } from "react"
import { Platform, Pressable, StyleProp, TextStyle, ViewStyle } from "react-native"
import { Picker } from "@react-native-picker/picker"
import { useSelector } from "@xstate/react"
import { upperFirst } from "es-toolkit/compat"
import { PlusIcon } from "lucide-react-native"
import DropDownPicker from "react-native-dropdown-picker"
import { MapOrEntries, useMap } from "usehooks-ts"

import { Button } from "@/components/Button"
import { View } from "@/components/View"
import Prescription from "@/models/Prescription"
import { languageStore } from "@/store/language"
import { colors } from "@/theme/colors"

import { If } from "./If"
import { TextField } from "./TextField"
import { Text } from "../components/Text"
import { stringsListToOptions } from "@/utils/misc"
// import {
//   MedicationEntry,
//   doseUnitOptions,
//   medicineFormOptions,
//   medicineRouteOptions,
// } from "../types"

export interface MedicationEditorProps {
  /**
   * An optional style override useful for padding & margin.
   */
  style?: StyleProp<ViewStyle>

  onSubmit: (medication: Prescription.MedicationEntry) => void

  medication?: Prescription.MedicationEntry

  /**
   * An optional list of medicine options to filter the search results
   */
  medicineOptions?: string[]
}

/** Filter out the medications list of strings using the search query. This only supports a list of meidcation names in whatever language they were entern in */
const getMedicationsListFilterSimple = (meds: string[]) => (query: string) => {
  if (query.length === 0) return []

  return meds.filter((m) => m.toLowerCase().includes(query.toLowerCase()))
}

const initialValues: MapOrEntries<keyof Prescription.MedicationEntry, string | number> = [
  ["id", ""],
  ["name", ""],
  ["route", "oral"],
  ["form", "tablet"],
  ["frequency", ""],
  ["intervals", ""],
  ["dose", 0],
  ["doseUnits", "mg"],
  ["duration", 0],
  ["durationUnits", ""],
]

/**
 * Medication Editor Form
 */
export const MedicationEditor = function MedicationEditor(props: MedicationEditorProps) {
  const { style, onSubmit, medication } = props
  const $styles = [$container, style]

  const [isSearching, setIsSearching] = useState(false)
  const [map, actions] = useMap<keyof Prescription.MedicationEntry, string | number>(initialValues)

  // Manage the state of the ios specific drop down picker
  const [openDropdown, setOpenDropdown] = useState<
    "route" | "form" | "doseUnits" | "durationUnits" | null
  >(null)

  const isIos = Platform.OS === "ios"

  // on mount, set the initial values to the medication if one exists, else set the ID to a random string
  useEffect(() => {
    if (medication) {
      actions.setAll([
        ["id", medication.id || ""],
        ["name", medication.name || ""],
        ["route", medication.route || ""],
        ["form", medication.form || ""],
        ["frequency", medication.frequency || ""],
        ["intervals", medication.intervals || ""],
        ["dose", medication.dose || 0],
        ["doseUnits", medication.doseUnits || ""],
        ["duration", medication.duration || 0],
        ["durationUnits", medication.durationUnits || ""],
      ])
    } else {
      actions.set("id", Math.random().toString())
    }
  }, [])

  const setValue = (key: keyof Prescription.MedicationEntry) => (value: string | number) => {
    // console.log({ key, value })
    actions.set(key, value)
  }

  const getValue = (key: keyof Prescription.MedicationEntry) => {
    return map.get(key)
  }

  const filterMedSuggestions = getMedicationsListFilterSimple(props.medicineOptions || [])

  const submit = () => {
    // console.log({ map: Object.fromEntries(map.entries()) })
    const entry = Object.fromEntries(map.entries()) as Prescription.MedicationEntry
    onSubmit(entry)
  }

  return (
    <View style={$container}>
      <View>
        <Text size="xl">Medicine Form</Text>
        <View style={$medicineInputRow}>
          <TextField
            label="Medicine Name"
            onFocus={() => setIsSearching(true)}
            value={map.get("name")?.toString()}
            onChangeText={setValue("name")}
          />

          {isSearching && (
            <View direction="row" gap={4} style={$suggestionsContainer}>
              {filterMedSuggestions((map.get("name") || "") as string)
                .slice(0, 5)
                .map((suggestion, idx) => (
                  <Pressable
                    onPress={() => {
                      setIsSearching(false)
                      setValue("name")(suggestion)
                    }}
                    key={suggestion + String(idx)}
                    style={$suggestionButton}
                  >
                    <Text size="sm" text={upperFirst(suggestion)} />
                  </Pressable>
                ))}
            </View>
          )}
          <If condition={!isIos}>
            <Picker selectedValue={map.get("form")} onValueChange={setValue("form")}>
              <Picker.Item label={"Choose medication form"} value="" />
              {stringsListToOptions(Prescription.formList).map((option) => (
                <Picker.Item key={option.value} label={option.label} value={option.value} />
              ))}
            </Picker>
          </If>

          <If condition={isIos}>
            <View mt={10}>
              <Text preset="formLabel" text="Form" />

              <DropDownPicker
                open={openDropdown === "form"}
                setOpen={(open) => {
                  if (open as unknown as boolean) setOpenDropdown("form")
                  else setOpenDropdown(null)
                }}
                modalTitle="Medication Form"
                style={$dropDownPickerStyle}
                zIndex={990000}
                zIndexInverse={990000}
                listMode="MODAL"
                items={stringsListToOptions(Prescription.doseUnitList, false)}
                value={getValue("form") || ""}
                setValue={(cb) => {
                  const data = cb(getValue("form"))
                  setValue("form")(data || "mg")
                }}
              />
            </View>
          </If>
        </View>
        <View
          style={[$medicineInputRow, $inputWithUnits, isIos && $inputWithUnitsIos]}
          gap={isIos ? 0 : 6}
        >
          <View style={$doseField}>
            <TextField
              value={getValue("dose") === 0 ? "" : getValue("dose")?.toString()}
              label="Dose (Concentration)"
              // style={{ flex: 5 }}
              keyboardType="number-pad"
              onChangeText={(v) => {
                // verify that it is a number
                if (isNaN(Number(v))) return
                setValue("dose")(Number(v))
              }}
            />
          </View>

          <View style={$unitsField}>
            {/*<Text preset="formLabel" text="Units" />*/}
            <Text text="" />
            <If condition={!isIos}>
              <Picker selectedValue={getValue("doseUnits")} onValueChange={setValue("doseUnits")}>
                <Picker.Item label={"Units"} value="" />
                {stringsListToOptions(Prescription.doseUnitList, false).map((option) => (
                  <Picker.Item key={option.value} label={option.label} value={option.value} />
                ))}
              </Picker>
            </If>

            <If condition={isIos}>
              <>
                <Text preset="formLabel" text="Dosage Units" />

                <DropDownPicker
                  open={openDropdown === "doseUnits"}
                  setOpen={(open) => {
                    if (open as unknown as boolean) setOpenDropdown("doseUnits")
                    else setOpenDropdown(null)
                  }}
                  modalTitle="Dosage Units"
                  style={$dropDownPickerStyle}
                  zIndex={990000}
                  zIndexInverse={990000}
                  listMode="MODAL"
                  items={stringsListToOptions(Prescription.doseUnitList, false)}
                  value={getValue("doseUnits") || ""}
                  setValue={(cb) => {
                    const data = cb(getValue("doseUnits"))
                    setValue("doseUnits")(data || "mg")
                  }}
                />
              </>
            </If>
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
            <If condition={!isIos}>
              <Picker selectedValue={getValue("route")} onValueChange={setValue("route")}>
                <Picker.Item label={"Choose the medicine Route"} value="" />
                {stringsListToOptions(Prescription.routeList).map((option) => (
                  <Picker.Item key={option.value} label={option.label} value={option.value} />
                ))}
              </Picker>
            </If>

            <If condition={isIos}>
              <DropDownPicker
                open={openDropdown === "route"}
                setOpen={(open) => {
                  if (open as unknown as boolean) setOpenDropdown("route")
                  else setOpenDropdown(null)
                }}
                modalTitle="Medication Routes"
                style={$dropDownPickerStyle}
                zIndex={990000}
                zIndexInverse={990000}
                listMode="MODAL"
                items={stringsListToOptions(Prescription.routeList)}
                value={getValue("route") || ""}
                setValue={(cb) => {
                  const data = cb(getValue("route"))
                  setValue("route")(data || "oral")
                }}
              />
            </If>
          </View>
        </View>
      </View>
      <View style={$spacer20} />
      <Button onPress={submit}>Save</Button>
      <View style={$spacer40} />
    </View>
  )
}

export function MedicationsFormItem({
  value,
  deleteEntry,
  openMedicationEditor,
  onEditEntry,
  viewOnly = true,
}: {
  value: Prescription.MedicationEntry[]
  deleteEntry: (medicine: Prescription.MedicationEntry["id"]) => void
  openMedicationEditor: () => void
  onEditEntry: (medicine: Prescription.MedicationEntry) => void
  viewOnly?: boolean
}) {
  return (
    <View>
      <View style={$medicationHeader}>
        <Text preset="formLabel" text="Medications List" />
        <Pressable onPress={() => openMedicationEditor()} style={$addMedicationButton}>
          <PlusIcon size={14} color={colors.palette.primary700} />
          <Text size="xxs" text="Add Medication" />
        </Pressable>
      </View>

      <View>
        {value.map((med) => (
          <View key={med.name} pb={6} style={$medicationItem}>
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
                  <Text style={$deleteText} text="Delete" />
                </Pressable>
                <View style={$buttonSpacer} />
                <Pressable onPress={() => onEditEntry(med)}>
                  <Text style={$editText} text="Edit" />
                </Pressable>
              </View>
            )}
          </View>
        ))}
      </View>
    </View>
  )
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

const $dropDownPickerStyle: ViewStyle = {
  marginTop: 2,
  borderWidth: 1,
  borderRadius: 4,
  backgroundColor: colors.palette.neutral200,
  borderColor: colors.palette.neutral400,
  zIndex: 990000,
  flex: 1,
}

const $suggestionsContainer: ViewStyle = {
  flexWrap: "wrap",
}

const $suggestionButton: ViewStyle = {
  padding: 8,
  backgroundColor: "#ccc",
  borderRadius: 8,
}

const $inputWithUnitsIos: ViewStyle = {
  flexDirection: "column",
  alignItems: "stretch",
}

const $doseField: ViewStyle = {
  flex: 5,
}

const $unitsField: ViewStyle = {
  flex: 2,
}

const $spacer20: ViewStyle = {
  height: 20,
}

const $spacer40: ViewStyle = {
  height: 40,
}

const $medicationHeader: ViewStyle = {
  flexDirection: "row",
  justifyContent: "space-between",
}

const $addMedicationButton: ViewStyle = {
  flexDirection: "row",
  display: "flex",
  alignItems: "center",
}

const $medicationItem: ViewStyle = {
  borderBottomWidth: 1,
  borderBottomColor: "#ccc",
}

const $deleteText: TextStyle = {
  color: "red",
}

const $buttonSpacer: ViewStyle = {
  width: 18,
}

const $editText: TextStyle = {
  color: "#3A539B",
}
