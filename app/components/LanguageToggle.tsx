import { I18nManager, Platform, StyleProp, TextStyle, ViewStyle } from "react-native"
import { Pressable } from "react-native"
import RNPickerSelect from "@react-native-picker/picker"
import { useSelector } from "@xstate/react"
import { ChevronDown } from "lucide-react-native"
import { getI18n } from "react-i18next"
import Dropdown from "react-native-input-select"

import { View } from "@/components/View"
import Language from "@/models/Language"
import { languageStore } from "@/store/language"
import { colors, type ThemedStyle } from "@/theme/colors"
import { useAppTheme } from "@/theme/context"

import { If } from "./If"
import { $textPresets } from "./Text"
import { Text, type Sizes as TextSizes } from "./Text"
import { $inputStyle, $inputWrapperStyle } from "./TextField"

export interface LanguageToggleProps {
  /**
   * An optional style override useful for padding & margin.
   */
  style?: StyleProp<ViewStyle>

  /**
   * Preset
   */
  preset?: "picker" | "options"

  /**
   * Size
   */
  size?: TextSizes

  /**
   * Hide label
   */
  hideLabel?: boolean
}

/**
 * Describe your component here
 */
export const LanguageToggle = (props: LanguageToggleProps) => {
  const { style, preset, size, hideLabel } = props
  const { theme, themed } = useAppTheme()
  const { language } = useSelector(languageStore, (state) => ({
    language: state.context.language,
  }))
  // const isDarkMode = theme.isDark

  const $styles: ViewStyle[] = [
    $container,
    // @ts-expect-error
    style,
    // isDarkMode ? { color: "#fff" } : { color: "#000" },
  ]

  const setLanguage = (value: Language.LanguageName) => {
    languageStore.send({ type: "SET_LANGUAGE", language: value })
    getI18n().changeLanguage(value)
  }

  return (
    <View style={$styles}>
      {!hideLabel && <Text preset="formLabel" tx="common:chooseLanguage" />}
      <If condition={preset === "picker" || !preset}>
        <Dropdown
          // labelStyle={themed($textPresets.formLabel)}
          // dropdownContainerStyle={themed($inputWrapperStyle)}
          // dropdownStyle={themed($inputWrapperStyle)}
          dropdownStyle={{
            ...themed($inputWrapperStyle),
            // paddingVertical: 0,
            paddingHorizontal: 10,
            minHeight: 30,
          }}
          dropdownIconStyle={{ right: 10 }}
          placeholder="Select a language..."
          options={[
            { label: "English", value: Language.Language["en-US"] },
            { label: "Español", value: Language.Language["es"] },
            { label: "عربي", value: Language.Language["ar"] },
          ]}
          isMultiple={false}
          selectedValue={language}
          onValueChange={(value) => setLanguage(value as Language.LanguageName)}
          primaryColor={theme.colors.palette.primary500}
        />
      </If>

      <If condition={preset === "options"}>
        <View direction="row" gap={12} mt={8}>
          <Pressable
            style={String(language).includes("en") ? $activeLanguageButton : $languageButton}
            onPress={() => setLanguage(Language.Language["en-US"])}
          >
            <Text size={size} text="🇬🇧 En" />
          </Pressable>
          <Pressable
            style={language === Language.Language["es"] ? $activeLanguageButton : $languageButton}
            onPress={() => setLanguage(Language.Language["es"])}
          >
            <Text size={size} text="🇪🇸 Es" />
          </Pressable>
          <Pressable
            style={language === Language.Language["ar"] ? $activeLanguageButton : $languageButton}
            onPress={() => setLanguage(Language.Language["ar"])}
          >
            <Text size={size} text="🇸🇦 عربي" />
          </Pressable>
        </View>
      </If>
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

const $languageButton: ViewStyle = {
  paddingVertical: 8,
  paddingHorizontal: 10,
  borderRadius: 8,
  borderWidth: 1,
  borderColor: colors.border,
  backgroundColor: colors.background,
}

const $activeLanguageButton: ViewStyle = {
  paddingVertical: 8,
  paddingHorizontal: 10,
  borderRadius: 8,
  borderWidth: 1,
  borderColor: colors.palette.primary700,
  backgroundColor: colors.background,
}
