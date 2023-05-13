import * as Localization from "expo-localization"
// import { I18n } from "i18n-js"
import i18n from "i18n-js"
import { I18nManager } from "react-native"
import AsyncStorage from "@react-native-async-storage/async-storage"

// if English isn't your default language, move Translations to the appropriate language file.
import en, { Translations } from "./en"
import ar from "./ar"
import es from "./es"


i18n.fallbacks = true

/**
 * we need always include "*-US" for some valid language codes because when you change the system language,
 * the language code is the suffixed with "-US". i.e. if a device is set to English ("en"),
 * if you change to another language and then return to English language code is now "en-US".
 */
i18n.translations = { ar, en, "en-US": en, es }

i18n.locale = Localization.locale

// handle RTL languages
let isRTL = Localization.isRTL
// I18nManager.allowRTL(isRTL)

// Next line disables forcedRTL until flash-list and react-native can correctly render it without crashing
// I18nManager.forceRTL(isRTL)


/*
 * This is a workaround that gets the current language and sets it as the default language.
 * This overrides the default language set in i18n.locale = Localization.locale
 */
AsyncStorage.getItem("language-storage").then((languageState) => {
  try {
    const language = JSON.parse(languageState || "{}").state.language
    if (!language || language.length === 0) {
      // do nothing
      return
    }
    if (language === "ar") {
      i18n.locale = "ar"
      isRTL = true
      // I18nManager.allowRTL(true)
    }
  } catch (e) {
    console.log("Using default language set")
  }
})

/**
 * Builds up valid keypaths for translations.
 */
export type TxKeyPath = RecursiveKeyOf<Translations>

// via: https://stackoverflow.com/a/65333050
type RecursiveKeyOf<TObj extends object> = {
  [TKey in keyof TObj & (string | number)]: RecursiveKeyOfHandleValue<TObj[TKey], `${TKey}`>
}[keyof TObj & (string | number)]

type RecursiveKeyOfInner<TObj extends object> = {
  [TKey in keyof TObj & (string | number)]: RecursiveKeyOfHandleValue<
    TObj[TKey],
    `['${TKey}']` | `.${TKey}`
  >
}[keyof TObj & (string | number)]

type RecursiveKeyOfHandleValue<TValue, Text extends string> = TValue extends any[]
  ? Text
  : TValue extends object
  ? Text | `${Text}${RecursiveKeyOfInner<TValue>}`
  : Text

export { isRTL, i18n }
