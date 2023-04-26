import React, { useEffect } from "react"
import { Picker } from "@react-native-picker/picker"
import { i18n } from "../i18n"
import { useColorScheme } from "react-native"

const LanguageToggle = () => {
  const isDarkMode = useColorScheme() === "dark"
  const [selectedLanguage, setSelectedLanguage] = React.useState(i18n.locale)
  useEffect(() => {
    i18n.onChange((change) => {
      setSelectedLanguage(change.locale)
    })
  }, [])
  const style = isDarkMode
    ? {
        color: "#fff",
      }
    : {
        color: "#000",
      }
  const setLanguage = (value: string) => {
    if (value === "en-US") {
      // return i18n.defaultLocale
    }
    i18n.locale = value
  }

  return (
    <Picker
      selectedValue={selectedLanguage}
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
