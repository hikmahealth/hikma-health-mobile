import { useController, UseControllerProps, useFormContext } from "react-hook-form"
import { RadioButton, RadioButtonGroupProps } from "react-native-paper"
import { Text } from "./Text"

export type ControlledRadioGroupProps = Omit<
  RadioButtonGroupProps,
  "onValueChange" | "value" | "children"
> &
  UseControllerProps & {
    label: string
    options: { label: string; value: string }[]
  }

export function ControlledRadioGroup(props: ControlledRadioGroupProps) {
  const formContext = useFormContext()

  const { label, name, rules, defaultValue, options, ...inputProps } = props

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
      <Text variant="labelLarge">{label}</Text>
      <RadioButton.Group
        // onBlur={field.onBlur}
        value={field.value}
        onValueChange={field.onChange}
        {...inputProps}
      >
        {options.map((option) => (
          <RadioButton.Item key={option.label} label={option.label} value={option.value} />
        ))}
      </RadioButton.Group>

      {formState.errors[name] && <Text>This is required.</Text>}
    </>
  )
}
