import * as React from "react"
import { Platform, StyleProp, TextStyle, View, ViewStyle, useColorScheme } from "react-native"
import { observer } from "mobx-react-lite"
import i18n from "i18next"
import { Picker } from "@react-native-picker/picker"
import { LanguageName, useStores } from "../models"
import { If } from "./If"
import DropDownPicker from "react-native-dropdown-picker"
import RNPickerSelect from "react-native-picker-select"
import { useState } from "react"
import { colors } from "../theme"
import { $inputStyle, $inputWrapperStyle } from "./TextField"
import { ChevronDown } from "lucide-react-native"

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
  const [open, setOpen] = useState(false)
  const { language } = useStores()
  const { style } = props
  const $styles = [$container, style, isDarkMode ? { color: "#fff" } : { color: "#000" }]

  const setLanguage = (value: LanguageName) => {
    language.setLanguage(value)
    if (value === "en-US") {
      // return i18n.defaultLocale
    }
    // i18n.language = value
  }

  console.log(i18n.language, language.current)

  const isIos = Platform.OS === "ios"

  return (
    <View style={$styles}>
      <If condition={!isIos}>
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
      </If>
      <If condition={isIos}>
        <RNPickerSelect
          onValueChange={(value) => setLanguage(value)}
          value={language.current}
          Icon={() => <ChevronDown />}
          style={{
            inputAndroidContainer: {
              ...$inputWrapperStyle,
              alignItems: "center",
            },
            inputAndroid: { ...$inputStyle, width: "100%" },
            inputIOSContainer: {
              ...$inputWrapperStyle,
              alignItems: "center",
            },
            iconContainer: {
              right: 5,
            },
            inputIOS: {
              ...$inputStyle,
              paddingRight: 30, // to ensure the text is never behind the icon
            },
          }}
          items={[
            { label: "English", value: "en-US" },
            { label: "Español", value: "es" },
            { label: "عربي", value: "ar" },
          ]}
        />
        {/* <DropDownPicker
          open={open}
          setOpen={setOpen}
          style={{
            marginTop: 4,
            borderWidth: 1,
            borderRadius: 4,
            backgroundColor: colors.palette.neutral200,
            borderColor: colors.palette.neutral400,
            zIndex: 990000,
            flex: 1,
          }}
          zIndex={990000}
          zIndexInverse={990000}
          // listMode="FLATLIST"
          items={[
            { label: "English", value: "en-US" },
            { label: "Español", value: "es" },
            { label: "عربي", value: "ar" },
          ]}
          value={language.current}
          setValue={(cb) => {
            const data = cb(language.current)
            setLanguage(data)
          }}
        /> */}
      </If>
    </View>
  )
})

const $container: ViewStyle = {
  zIndex: 990000,
}

const $pickerItemStyle: ViewStyle = {}
