import React, { useEffect } from "react"
import { Picker } from "@react-native-picker/picker"
import { i18n } from "../i18n"
import { useLanguageStore } from "../stores/language"
import { useColorScheme } from "react-native"

const LanguageToggle = () => {
  const isDarkMode = useColorScheme() === "dark"
  const [selectedLanguage, setSelectedLanguage] = React.useState(i18n.locale)
  const {language, setLanguage: setGlobalLanguage} = useLanguageStore()

  // useEffect(() => {
  //   i18n.onChange((change) => {
  //     console.warn("Language has been changed")
  //     setSelectedLanguage(change.locale)
  //   })
  // }, [])
  const style = isDarkMode
    ? {
        color: "#fff",
      }
    : {
        color: "#000",
      }
  const setLanguage = (value: string) => {
    setGlobalLanguage(value)
    if (value === "en-US") {
      // return i18n.defaultLocale
    }
    i18n.locale = value
  }

  return (
    <Picker
      selectedValue={language}
      onValueChange={setLanguage}
      itemStyle={{
        color: "red",
        backgroundColor: "blue",
      }}
      style={[{ minWidth: 100 }, style]}
    >
      <Picker.Item value="en-US" label="English" />
      <Picker.Item value="es" label="Español" />
      <Picker.Item value="ar" label="عربي" />
    </Picker>
  )
}

export default LanguageToggle
