import { useEffect, useState } from "react"
import { StyleProp, TextStyle, ViewStyle, Pressable, Alert } from "react-native"
import {
  differenceInDays,
  differenceInYears,
  intervalToDuration,
  isValid,
  subYears,
} from "date-fns"

import { Text } from "@/components/Text"
import { View } from "@/components/View"
import { TxKeyPath } from "@/i18n"
import { colors } from "@/theme/colors"
import { useAppTheme } from "@/theme/context"
import type { ThemedStyle } from "@/theme/types"
import { calculateAge, parseYYYYMMDD } from "@/utils/date"

import { DatePickerButton } from "./DatePicker"
import { $descriptionStyle, $labelStyle, TextField } from "./TextField"
import { parse } from "effect/Number"
import { spacing } from "@/theme/spacing"

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

  testId?: string
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
    testId,
  } = props
  const $styles = [$container, style]
  const { themed } = useAppTheme()
  const [date, setDate] = useState<Date>(
    parseYYYYMMDD(defaultDate?.toString() || "", subYears(new Date(), 18)),
  )

  const [dobMode, setDobMode] = useState<"date-picker" | "age-input" | "unknown">("date-picker")

  const [ageString, setAgeString] = useState<string>("")

  const setAge = (age: string) => {
    const newDate = subYears(new Date(), parseFloat(age) || 0)
    setAgeString(age)
    setDate(newDate)
  }

  // const age = differenceInYears(new Date(), date)

  // on change of the date while in the date-picker mode, set the age to the difference in years
  useEffect(() => {
    if (dobMode === "date-picker") {
      // const age = differenceInDays(new Date(), date)
      setAgeString(calculateAgeString(date))
    }
  }, [date, dobMode])

  useEffect(() => {
    if (dobMode === "unknown") {
      onChangeDate(null)
    } else {
      onChangeDate(date)
    }
  }, [dobMode, date])

  const today = new Date()

  const handleDateChange = (date: Date | null) => {
    if (!date) return

    if (date > today) {
      Alert.alert("Invalid Date", "Please select a date in the past.")
      setDate(today)
      return
    }
    setDate(date)
    if (dobMode === "date-picker") {
      setAgeString(calculateAgeString(date))
    }
  }

  const calculateAgeString = (date: Date): string => {
    const { years = 0, months = 0 } = intervalToDuration({ start: date, end: new Date() })
    if (years === 0 && months > 0 && months < 12) {
      return `${(months / 12).toFixed(1)}`
    }
    return years.toString()
  }

  const getInputStyle = (option: "age-input" | "date-picker" | "unknown") => {
    if (dobMode === option) {
      return $activeBtn
    }
    return $inactiveBtn
  }

  const getInputTextStyle = (
    option: "age-input" | "date-picker" | "unknown",
  ): ThemedStyle<TextStyle> => {
    if (dobMode === option) {
      return $activeText
    }
    return $inactiveText
  }

  return (
    <View style={$styles}>
      {(labelTx || label) && (
        <Text style={themed($labelStyle)} preset="formLabel" tx={labelTx} text={label} />
      )}
      {(description || descriptionTx) && (
        <Text style={themed($descriptionStyle)} tx={descriptionTx} text={description} />
      )}
      <View direction="row" gap={6}>
        <View style={getInputStyle("date-picker")}>
          <Pressable testID={testId} onPress={() => setDobMode("date-picker")}>
            <Text
              size="xs"
              tx="component:dateOfBirthInput.datePicker"
              style={themed(getInputTextStyle("date-picker"))}
            ></Text>
          </Pressable>
        </View>
        <Text tx="common:or" />
        <View style={getInputStyle("age-input")}>
          <Pressable testID={testId} onPress={() => setDobMode("age-input")}>
            <Text
              size="xs"
              tx="component:dateOfBirthInput.ageInput"
              style={themed(getInputTextStyle("age-input"))}
            ></Text>
          </Pressable>
        </View>
        <Text tx="common:or" />
        <View style={getInputStyle("unknown")}>
          <Pressable testID={testId} onPress={() => setDobMode("unknown")}>
            <Text
              size="xs"
              tx="component:dateOfBirthInput.unknown"
              style={themed(getInputTextStyle("unknown"))}
            ></Text>
          </Pressable>
        </View>
      </View>
      {dobMode === "date-picker" && <DatePickerButton onConfirm={handleDateChange} date={date} />}
      {dobMode === "age-input" && (
        <View pt={10}>
          <TextField
            keyboardType="numeric"
            value={ageString}
            onChangeText={(t) => {
              if (isNaN(parseFloat(t))) {
                setAge("")
              } else {
                setAge(t)
              }
            }}
          />
        </View>
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
  borderWidth: 1,
  borderColor: colors.palette.primary600,
  backgroundColor: colors.palette.primary600,
  paddingHorizontal: 10,
  borderRadius: 8,
}

const $inactiveBtn: ViewStyle = {
  borderWidth: 1,
  borderColor: colors.border,
  paddingHorizontal: 10,
  borderRadius: 8,
}

const $activeText: ThemedStyle<TextStyle> = ({ colors, typography }) => ({
  fontFamily: typography.primary.normal,
  fontSize: 14,
  color: colors.palette.neutral100,
})

const $inactiveText: ThemedStyle<TextStyle> = ({ colors, typography }) => ({
  fontFamily: typography.primary.normal,
  fontSize: 14,
  color: colors.palette.primary500,
})
