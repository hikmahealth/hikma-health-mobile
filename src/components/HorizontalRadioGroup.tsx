import { Pressable, View, ViewStyle } from "react-native"
import { RadioButton } from "react-native-paper"
import { Text } from "../components/Text"
import { primaryTheme } from "../styles/buttons"

type HorizontalRadioGroupProps = {
  options: { value: string; label: string }[]
  onChange: (value: string) => void
  value: string
  label: string
}

export const HorizontalRadioGroup = (props: HorizontalRadioGroupProps) => {
  const { options, onChange, label, value } = props
  return (
    <View style={$horizontalRadioContainer}>
      <Text variant="bodyLarge" text={label} />
      <View style={{ flexDirection: "row", alignItems: "center", columnGap: 14 }}>
        {options.map((option) => (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            style={{ flexDirection: "row", alignItems: "center" }}
          >
            <RadioButton
              value={option.value}
              theme={primaryTheme}
              onPress={() => onChange(option.value)}
              status={value === option.value ? "checked" : "unchecked"}
            />
            <Text variant="labelLarge">{option.label}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  )
}

const $horizontalRadioContainer: ViewStyle = {
  flex: 1,
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
}
