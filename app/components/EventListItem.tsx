import { Pressable, StyleProp, ViewStyle } from "react-native"
import { withObservables } from "@nozbe/watermelondb/react"
import { upperFirst } from "es-toolkit/compat"
import { LucideEllipsisVertical } from "lucide-react-native"

import { Text } from "@/components/Text"
import { View } from "@/components/View"
import EventModel from "@/db/model/Event"
import Event from "@/models/Event"
import ICDEntry from "@/models/ICDEntry"
import { colors } from "@/theme/colors"

import { If } from "./If"

export interface EventListItemProps {
  /**
   * An optional style override useful for padding & margin.
   */
  style?: StyleProp<ViewStyle>

  event: EventModel
  openEventOptions: (event: EventModel) => void
  language: string
}

/** Props for the plain (non-WatermelonDB) variant */
export interface EventListItemPlainProps {
  style?: StyleProp<ViewStyle>
  event: { eventType: string; formData: Event.FormDataItem[]; createdAt: Date; id: string }
  openEventOptions: (event: any) => void
  language: string
}

const enhanceEvent = withObservables(["event"], ({ event }) => ({
  event, // shortcut syntax for `event: event.observe()`
}))

/**
 * Inner component rendering logic shared between enhanced and plain variants
 */
function EventListItemInner({
  style,
  event,
  language,
  openEventOptions,
}: {
  style?: StyleProp<ViewStyle>
  event: { eventType: string; formData: Event.FormDataItem[]; createdAt: Date; id: string }
  openEventOptions: (event: any) => void
  language: string
}) {
  const display = getEventDisplay(event as any, language)
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
          <View m={10}>
            <View style={$eventTitleContainer}>
              <View direction="row" justifyContent="space-between" alignItems="center">
                <Text preset="subheading">{`${event.eventType}`}</Text>
                <Pressable onPress={() => openEventOptions(event)}>
                  <LucideEllipsisVertical size={20} color={colors.palette.primary400} />
                </Pressable>
              </View>
              <Text preset="formHelper">{`${time}`}</Text>
            </View>
            {display}
          </View>
        </View>
      </Pressable>
    </View>
  )
}

/**
 * Displays a single event (WatermelonDB-enhanced, observes the event model)
 */
export const EventListItem = enhanceEvent(function EventListItem(props: EventListItemProps) {
  return <EventListItemInner {...props} />
})

/**
 * Plain variant of EventListItem that works with Event.T (no WatermelonDB observables).
 * Use this in online mode where data comes from the server, not WatermelonDB.
 */
export function EventListItemPlain(props: EventListItemPlainProps) {
  return <EventListItemInner {...props} />
}

const $eventTitleContainer: ViewStyle = {
  flex: 1,
  borderBottomWidth: 1,
  borderBottomColor: colors.border,
  alignContent: "center",
}

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
 * @returns {Array<ICDEntry.T>} - An array of ICD10Entry objects
 */
export const getDiagnosesFromFormData = (formData: Event.FormDataItem[]): Array<ICDEntry.T> => {
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
const getEventDisplay = (event: EventModel, language: string): React.JSX.Element => {
  const { formData } = event

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
            my={5}
          >
            <Text preset="formLabel" textDecorationLine="underline" text={name + ":"} />

            <If condition={fieldType === "diagnosis"}>
              {Array.isArray(value) &&
                value?.map((val, idx) => (
                  <View key={`${idx}-diagnosis`}>
                    <Text text={ICDEntry.ICD10RecordLabel(val, language)} />
                  </View>
                ))}
            </If>
            <If condition={inputType === "input-group" && fieldType === "medicine"}>
              <View gap={5}>
                {Array.isArray(value) &&
                  value.map((med, idx) => (
                    <View
                      key={med.id}
                      style={idx + 1 < value.length ? $medicineItemSeparator : undefined}
                    >
                      <Text text={upperFirst(String(med.name || ""))} />
                      <Text text={`${String(med.dose || "")} ${med.doseUnits || ""}`} />
                      <Text
                        text={`${upperFirst(med?.route || "")} ${upperFirst(
                          med?.form || "",
                        )}: ${String(med?.frequency || "")}`}
                      />
                    </View>
                  ))}
              </View>
            </If>
            <If condition={fieldType !== "diagnosis" && inputType !== "input-group"}>
              <Text text={String(value)} />
            </If>
          </View>
        )
      })}
    </View>
  )
}

const $medicineItemSeparator: ViewStyle = {
  borderBottomWidth: 1,
  borderBottomColor: colors.border,
}

/**
 * Get the display for the event, based on the event type, for the formatted dynamic fields of formData
 * THIS IS ONLY USED FOR PRINTING OUT A HTML BASED REPORT
 * @param {Event} event - The event object
 * @param {string} language - The language code
 * @returns {JSX.Element} - The JSX element to display
 */
/** Escape HTML special characters to prevent XSS in generated reports */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
}

export const getHtmlEventDisplay = (event: EventModel, language: string): string => {
  const { eventType, formData } = event

  let display = ""

  formData.forEach((field, idx) => {
    const { fieldId, fieldType, inputType, name, value } = field

    display += `<div style="margin: 5px 0px;">`
    display += `<span style="text-decoration: underline;">${escapeHtml(String(name))}:</span>`

    if (fieldType === "diagnosis") {
      if (Array.isArray(value)) {
        value?.forEach((val) => {
          display += `<div>${escapeHtml(ICDEntry.ICD10RecordLabel(val, language))}</div>`
        })
      }
    } else if (inputType === "input-group" && fieldType === "medicine") {
      if (Array.isArray(value)) {
        value.forEach((med) => {
          if (!med) return
          display += `<div>${escapeHtml(String(med.dose || ""))} ${escapeHtml(String(med.doseUnits || ""))}</div>`
          display += `<div>${escapeHtml(upperFirst(med?.route || ""))} ${escapeHtml(upperFirst(med?.form || ""))}: ${escapeHtml(
            String(med?.frequency || ""),
          )}</div>`
        })
      }
    } else if (fieldType !== "diagnosis" && inputType !== "input-group") {
      display += `<div>${escapeHtml(String(value))}</div>`
    }

    display += `</div>`
  })

  return display
}

const $container: ViewStyle = {
  paddingVertical: 8,
}
