import * as React from "react"
import { StyleProp, TextStyle, View, ViewStyle, useColorScheme } from "react-native"
import { observer } from "mobx-react-lite"
import { i18n } from "../i18n"
import { Picker } from "@react-native-picker/picker"
import { LanguageName, useStores } from "../models"

export interface LanguageToggleProps {
  /**
   * An optional style override useful for padding & margin.
   */
  style?: StyleProp<ViewStyle>
}

/**
 * Describe your component here
 */
export const LanguageToggle = observer(function LanguageToggle(props: LanguageToggleProps) {
  const isDarkMode = useColorScheme() === "dark"
  const { language } = useStores()
  const { style } = props
  const $styles = [$container, style, isDarkMode ? { color: "#fff" } : { color: "#000" }]

  const setLanguage = (value: LanguageName) => {
    language.setLanguage(value)
    if (value === "en-US") {
      // return i18n.defaultLocale
    }
    i18n.locale = value
  }

  return (
    <View style={$styles}>
      <Picker
        selectedValue={language.current}
        onValueChange={setLanguage}
        itemStyle={$pickerItemStyle}
        style={[{ minWidth: 100 }, style]}
      >
        <Picker.Item value="en-US" label="English" />
        <Picker.Item value="es" label="Español" />
        <Picker.Item value="ar" label="عربي" />
      </Picker>
    </View>
  )
})

const $container: ViewStyle = {}

const $pickerItemStyle: ViewStyle = {}
