import * as React from "react"
import { Pressable, StyleProp, ViewStyle } from "react-native"
import { colors } from "../theme"
import { Text } from "../components/Text"
import { View } from "../components/View"
import EventModel, { FormDataItem } from "../db/model/Event"
import { withObservables } from "@nozbe/watermelondb/react"
import { ICD10RecordLabel } from "./DiagnosisEditor"
import { upperFirst } from "lodash"
import { If } from "./If"
import { ICDEntry } from "../types"
import { LucideEllipsisVertical } from "lucide-react-native"

export interface EventListItemProps {
  /**
   * An optional style override useful for padding & margin.
   */
  style?: StyleProp<ViewStyle>

  event: EventModel
  openEventOptions: (event: EventModel) => void
  language: string
}

const enhanceEvent = withObservables(["event"], ({ event }) => ({
  event, // shortcut syntax for `event: event.observe()`
}))

/**
 * Displays a single event
 */
export const EventListItem = enhanceEvent(function EventListItem(props: EventListItemProps) {
  const { style, event, language, openEventOptions } = props

  const display = getEventDisplay(event, language)
  const time = new Date(event.createdAt).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  })

  const $styles = [$container, style]

  return (
    <View style={$styles}>
      <Pressable testID="eventListItem" style={{}} onLongPress={() => openEventOptions(event)}>
        <View style={{}}>
          <View style={{ margin: 10 }}>
            <View direction="row" justifyContent="space-between" alignItems="center" style={{ borderBottomWidth: 1, borderBottomColor: colors.border }}>
              <Text preset="subheading">{`${event.eventType}, ${time}`}</Text>
              <Pressable onPress={() => openEventOptions(event)}>
                <LucideEllipsisVertical size={20} color={colors.palette.primary400} />
              </Pressable>
            </View>
            {display}
          </View>
        </View>
      </Pressable>
    </View>
  )
})

// const sampleEventFormData = [
//   { fieldId: "0.7000418575055709", inputType: "select", name: "Smoking", value: "never" },
//   { fieldId: "0.0041672042847438195", inputType: "select", name: "Alcohol Use", value: "monthly" },
//   { fieldId: "0.00416720428474312195", inputType: "text", name: "Alcohol Use", value: "monthly" },
//   { fieldId: "0.10216220428474312195", inputType: "number", name: "Alcohol Use", value: "2" },
//   {
//     fieldId: "0.13706160353693075",
//     inputType: "textarea",
//     name: "Other Substance Use",
//     value: "Some other substances",
//   },
//   { fieldId: "0.5535755404453206", inputType: "select", name: "Education", value: "university" },
//   { fieldId: "0.1541258757669901", inputType: "select", name: "Income", value: "adequate" },
//   { fieldId: "0.23191226524160435", inputType: "select", name: "Housing", value: "temporary" },
//   { fieldId: "0.32407480221952545", inputType: "select", name: "Nutrition", value: "sufficient" },
// ]

/**
 * Given FormDataItem, return an array of only the diagnoses and their ICD10 codes
 * @param {FormDataItem[]} FormDataItem array- The FormDataItem object
 * @returns {Array<ICDEntry>} - An array of ICD10Entry objects
 */
export const getDiagnosesFromFormData = (formData: FormDataItem[]): Array<ICDEntry> => {
  const diagnoses = formData.filter((field) => field.fieldType === "diagnosis")
  const diagnosesWithCodes = diagnoses.map((diagnosis) => {
    const { value } = diagnosis
    if (Array.isArray(value) && value.length > 0) {
      return value
    }
  })

  return diagnosesWithCodes.flat().filter((diagnosis) => diagnosis !== undefined)
}

/**
 * Get the display for the event, based on the event type, for the formatted dynamic fields of formData
 * @param {Event} event - The event object
 * @param {string} language - The language code
 * @returns {JSX.Element} - The JSX element to display
 */
const getEventDisplay = (event: EventModel, language: string): JSX.Element => {
  const { eventType, formData } = event

  return (
    <View>
      {formData.map((field, idx) => {
        const { fieldId, fieldType, inputType, name, value } = field
        // console.log({ fieldId, fieldType, inputType, name, value })
        // const displayValue = inputType === "select" ? translate(value, language) : value

        return (
          <View
            key={`${idx}-${fieldId}`}
            gap={inputType === "textarea" || inputType === "input-group" ? 1 : 10}
            direction={inputType === "textarea" || inputType === "input-group" ? "column" : "row"}
            style={{ marginVertical: 5 }}
          >
            <Text preset="formLabel" textDecorationLine="underline" text={name + ":"} />

            <If condition={fieldType === "diagnosis"}>
              {Array.isArray(value) &&
                value?.map((val) => (
                  <View key={val.id}>
                    <Text text={ICD10RecordLabel(val, language)} />
                  </View>
                ))}
            </If>
            <If condition={inputType === "input-group" && fieldType === "medicine"}>
              {Array.isArray(value) &&
                value.map((med) => (
                  <View key={med.id}>
                    <Text text={upperFirst(String(med.name || ""))} />
                    <Text text={`${String(med.dose || "")} ${med.doseUnits || ""}`} />
                    <Text
                      text={`${upperFirst(med?.route || "")} ${upperFirst(
                        med?.form || "",
                      )}: ${String(med?.frequency || "")}`}
                    />
                  </View>
                ))}
            </If>
            <If condition={fieldType !== "diagnosis" && inputType !== "input-group"}>
              <Text text={value} />
            </If>
          </View>
        )
      })}
    </View>
  )
}

/**
 * Get the display for the event, based on the event type, for the formatted dynamic fields of formData
 * THIS IS ONLY USED FOR PRINTING OUT A HTML BASED REPORT
 * @param {Event} event - The event object
 * @param {string} language - The language code
 * @returns {JSX.Element} - The JSX element to display
 */
export const getHtmlEventDisplay = (event: EventModel, language: string): string => {
  const { eventType, formData } = event

  let display = ""

  formData.forEach((field, idx) => {
    const { fieldId, fieldType, inputType, name, value } = field
    // console.log({ fieldId, fieldType, inputType, name, value })
    // const displayValue = inputType === "select" ? translate(value, language) : value

    display += `<div style="margin: 5px 0px;">`
    display += `<span style="text-decoration: underline;">${name}:</span>`

    if (fieldType === "diagnosis") {
      if (Array.isArray(value)) {
        value?.forEach((val) => {
          display += `<div>${ICD10RecordLabel(val, language)}</div>`
        })
      }
    } else if (inputType === "input-group" && fieldType === "medicine") {
      if (Array.isArray(value)) {
        value.forEach((med) => {
          display += `<div>${String(med.dose || "")} ${med.doseUnits || ""}</div>`
          display += `<div>${upperFirst(med?.route || "")} ${upperFirst(med?.form || "")}: ${String(
            med?.frequency || "",
          )}</div>`
        })
      }
    } else if (fieldType !== "diagnosis" && inputType !== "input-group") {
      display += `<div>${value}</div>`
    }

    display += `</div>`
  })

  return display
}

const $container: ViewStyle = {
  paddingVertical: 8,
}
