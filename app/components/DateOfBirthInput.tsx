import { useEffect, useState } from "react"
import { StyleProp, TextStyle, ViewStyle, Pressable } from "react-native"
import { differenceInYears, isValid, subYears } from "date-fns"

import { Text } from "@/components/Text"
import { View } from "@/components/View"
import { TxKeyPath } from "@/i18n"
import { colors } from "@/theme/colors"
import { useAppTheme } from "@/theme/context"
import type { ThemedStyle } from "@/theme/types"
import { calculateAge, parseYYYYMMDD } from "@/utils/date"

import { DatePickerButton } from "./DatePicker"
import { $descriptionStyle, $labelStyle, TextField } from "./TextField"

const DEFAULT_MONTH = 0 // January
const DEFAULT_DAY = 1 // First day of the month

export interface DateOfBirthInputProps {
  /**
   * An optional style override useful for padding & margin.
   */
  style?: StyleProp<ViewStyle>

  /**
   * Props for configuring age entry with month and day values.
   * These should ideally be stored in a database or variables that are easily accessible.
   */
  ageEntryProps: {
    month: number
    day: number
  }

  /**
   * Label
   */
  label?: string

  /**
   * Label text for the input
   */
  labelTx?: TxKeyPath | undefined

  /**
   * Description
   */
  description?: string

  /**
   * Description text for the input
   */
  descriptionTx?: TxKeyPath | undefined

  /**
   * Date value
   */
  date: Date | number | string | undefined

  /**
   * Callback function called when the date of birth value changes
   */
  onChangeDate: (date: Date | null) => void
}

/**
 * Custom input that supports both entry of a date of birth and an age input.
 * The input also allows for empty date values. It also prevents future dates and negative ages. It also does checks for unrealistic ages.
 */
export const DateOfBirthInput = (props: DateOfBirthInputProps) => {
  const {
    style,
    ageEntryProps = { month: DEFAULT_MONTH, day: DEFAULT_DAY },
    label,
    labelTx,
    description,
    descriptionTx,
    date: defaultDate,
    onChangeDate,
  } = props
  const $styles = [$container, style]
  const { themed } = useAppTheme()
  const [date, setDate] = useState<Date>(
    parseYYYYMMDD(defaultDate?.toString() || "", subYears(new Date(), 18)),
  )

  const [dobMode, setDobMode] = useState<"date-picker" | "age-input" | "unknown">("date-picker")

  const setAge = (age: number) => {
    const newDate = subYears(new Date(), age)
    setDate(newDate)
  }

  const age = differenceInYears(new Date(), date)

  useEffect(() => {
    if (dobMode === "unknown") {
      onChangeDate(null)
    } else {
      onChangeDate(date)
    }
  }, [dobMode, date])

  return (
    <View style={$styles}>
      {(labelTx || label) && (
        <Text style={themed($labelStyle)} preset="formLabel" tx={labelTx} text={label} />
      )}
      {(description || descriptionTx) && (
        <Text style={themed($descriptionStyle)} tx={descriptionTx} text={description} />
      )}
      <View direction="row" gap={16}>
        <View style={dobMode === "date-picker" ? $activeBtn : $inactiveBtn}>
          <Pressable onPress={() => setDobMode("date-picker")}>
            <Text style={themed($text)}>Date of Birth</Text>
          </Pressable>
        </View>
        <View style={dobMode === "age-input" ? $activeBtn : $inactiveBtn}>
          <Pressable onPress={() => setDobMode("age-input")}>
            <Text style={themed($text)}>Age</Text>
          </Pressable>
        </View>
        <View style={dobMode === "unknown" ? $activeBtn : $inactiveBtn}>
          <Pressable
            onPress={() => setDobMode("unknown")}
            style={dobMode === "unknown" ? $activeBtn : $inactiveBtn}
          >
            <Text style={themed($text)}>Unknown</Text>
          </Pressable>
        </View>
      </View>
      {dobMode === "date-picker" && <DatePickerButton onDateChange={setDate} date={date} />}
      {dobMode === "age-input" && (
        <TextField value={age.toString()} onChangeText={(t) => setAge(parseInt(t))} />
      )}
    </View>
  )
}

const $container: ViewStyle = {
  justifyContent: "center",
}

const $text: ThemedStyle<TextStyle> = ({ colors, typography }) => ({
  fontFamily: typography.primary.normal,
  fontSize: 14,
  color: colors.palette.primary500,
})

// TODO: Get styling advice from @megan
const $activeBtn: ViewStyle = {
  borderBottomWidth: 1,
  borderColor: colors.border,
  paddingHorizontal: 4,
}

const $inactiveBtn: ViewStyle = {}
