import React from "react"
import { useController, UseControllerProps, useFormContext } from "react-hook-form"
import { Picker, PickerProps } from "@react-native-picker/picker"
import { Text } from "./Text"


export type ControlledPickerProps = Omit<
    PickerProps,
    "onValueChange"
> & UseControllerProps & {
    label: string;
    options: { label: string; value: string }[];
}

export function ControlledSelectField(props: ControlledPickerProps) {
    const formContext = useFormContext()
  const { label, name, rules, defaultValue, options, ...inputProps } = props
    const {
        field: { onChange, value },
    } = useController({
        name,
        rules,
        defaultValue: "",
    })

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
            <Picker
                {...props}
                selectedValue={value}
                onValueChange={onChange}
            >

                {/* Empty select option to render as default in case of no value set */}
                <Picker.Item label={"Choose an option"} value="" />
                {props.options.map((option) => (
                    <Picker.Item
                        key={option.value}
                        label={option.label}
                        value={option.value}
                    />
                ))}
            </Picker>
            {formState.errors[name] && <Text>This is required</Text>}
        </>
    )
}
