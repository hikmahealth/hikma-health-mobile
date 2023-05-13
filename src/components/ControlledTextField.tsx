import { useController, UseControllerProps, useFormContext } from "react-hook-form"
import { Text } from "./Text"
import { TextInput, TextInputProps } from "./TextInput"

export type ControlledTextFieldProps = TextInputProps & UseControllerProps

export const ControlledTextField = (props: ControlledTextFieldProps) => {
  const formContext = useFormContext()

  const { label, name, rules, defaultValue, ...inputProps } = props

  const { field } = useController({ name, rules, defaultValue })

  if (!formContext || !name) {
    const msg = !formContext
      ? "TextInput must be wrapped by the FormProvider"
      : "Name must be defined"
    console.error(msg)
  }
  const { formState } = formContext

  return (
    <>
      <TextInput
        label={label}
        onBlur={field.onBlur}
        onChangeText={field.onChange}
        value={field.value}
        {...inputProps}
      />
      {formState.errors[name] && <Text>This is required.</Text>}
    </>
  )
}

// TextInput supports a label <Text /> component
