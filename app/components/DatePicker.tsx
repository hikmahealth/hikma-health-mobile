import { colors } from "../theme"
import { format } from "date-fns"
import React, { useState } from "react"
// import { useController, UseControllerProps, useFormContext } from "react-hook-form"
import { Pressable, Text, ViewStyle } from "react-native"
import DatePicker, { DatePickerProps } from "react-native-date-picker"

type CustomDatePickerProps = DatePickerProps

export const DatePickerButton = ({ date, onDateChange, ...rest }: CustomDatePickerProps) => {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Pressable
        style={$datePicker}
        testID="DatePickerButton"
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
