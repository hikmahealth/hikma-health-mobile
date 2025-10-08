import React, { useState } from "react"
import { Pressable, ViewStyle } from "react-native"
import { format } from "date-fns"
import DatePicker, { DatePickerProps } from "react-native-date-picker"

import { colors } from "@/theme/colors"

import { Text } from "./Text"

type CustomDatePickerProps = DatePickerProps & {
  disabled?: boolean
}

export const DatePickerButton = ({ date, onDateChange, ...rest }: CustomDatePickerProps) => {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Pressable
        style={$datePicker}
        testID="DatePickerButton"
        disabled={rest.disabled}
        onPress={() => setOpen((open) => !open)}
      >
        <Text>{format(date, "do MMMM yyyy")}</Text>
      </Pressable>
      <DatePicker
        locale="jp"
        modal
        open={open}
        date={date}
        onConfirm={(date: Date) => {
          setOpen(false)
          date && onDateChange?.(date)
        }}
        mode="date"
        onDateChange={onDateChange}
        onCancel={() => {
          setOpen(false)
        }}
        {...rest}
      />
    </>
  )
}

const $datePicker: ViewStyle = {
  marginTop: 10,
  paddingHorizontal: 10,
  paddingVertical: 12,
  width: "100%",
  flex: 1,
  backgroundColor: colors.palette.neutral200,
  borderColor: colors.palette.neutral400,
  borderWidth: 1,
  borderRadius: 4,
  justifyContent: "center",
}
