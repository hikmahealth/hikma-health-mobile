import * as Localization from "expo-localization"
import { I18nManager } from "react-native"
import i18n from "i18next"
import * as i18next from "i18next"
import { initReactI18next } from "react-i18next"
import "intl-pluralrules"

// if English isn't your default language, move Translations to the appropriate language file.
import en, { Translations } from "./en"
import ar from "./ar"
import es from "./es"

const fallbackLocale = "en-US"

const systemLocales = Localization.getLocales()

const resources = { ar, en, es, "en-US": en }
const supportedTags = Object.keys(resources)

// Checks to see if the device locale matches any of the supported locales
// Device locale may be more specific and still match (e.g., en-US matches en)
const systemTagMatchesSupportedTags = (deviceTag: string) => {
  const primaryTag = deviceTag.split("-")[0]
  return supportedTags.includes(primaryTag)
}

const pickSupportedLocale: () => Localization.Locale | undefined = () => {
  return systemLocales.find((locale) => systemTagMatchesSupportedTags(locale.languageTag))
}

const locale = pickSupportedLocale()

export let isRTL = false

// Need to set RTL ASAP to ensure the app is rendered correctly. Waiting for i18n to init is too late.
if (locale?.languageTag && locale?.textDirection === "rtl") {
  I18nManager.allowRTL(true)
  isRTL = true
} else {
  I18nManager.allowRTL(false)
}

export const initI18n = async () => {
  i18n.use(initReactI18next)

  // console.warn({ lng: locale?.languageTag ?? fallbackLocale, fallbackLng: fallbackLocale })

  await i18n.init({
    resources,
    lng: locale?.languageTag ?? fallbackLocale,
    fallbackLng: fallbackLocale,
    interpolation: {
      escapeValue: false,
    },
  })

  return i18n
}

/**
 * Builds up valid keypaths for translations.
 */

export type TxKeyPath = RecursiveKeyOf<Translations>

// via: https://stackoverflow.com/a/65333050
type RecursiveKeyOf<TObj extends object> = {
  [TKey in keyof TObj & (string | number)]: RecursiveKeyOfHandleValue<TObj[TKey], `${TKey}`, true>
}[keyof TObj & (string | number)]

type RecursiveKeyOfInner<TObj extends object> = {
  [TKey in keyof TObj & (string | number)]: RecursiveKeyOfHandleValue<TObj[TKey], `${TKey}`, false>
}[keyof TObj & (string | number)]

type RecursiveKeyOfHandleValue<
  TValue,
  Text extends string,
  IsFirstLevel extends boolean,
> = TValue extends any[]
  ? Text
  : TValue extends object
  ? IsFirstLevel extends true
    ? Text | `${Text}:${RecursiveKeyOfInner<TValue>}`
    : Text | `${Text}.${RecursiveKeyOfInner<TValue>}`
  : Text

// /**
//  * we need always include "*-US" for some valid language codes because when you change the system language,
//  * the language code is the suffixed with "-US". i.e. if a device is set to English ("en"),
//  * if you change to another language and then return to English language code is now "en-US".
//  */
// i18n.translations = { ar, en, "en-US": en, es }

// const locales = Localization.getLocales() // This method is guaranteed to return at least one array item.
// // The preferred language is the first element in the array, however, we fallback to en-US, especially for tests.
// const preferredLanguage:
//   | Localization.Locale
//   | { languageTag: string; textDirection: "ltr" | "rtl" } = locales[0] || {
//   languageTag: "en-US",
//   textDirection: "ltr",
// }
// i18n.locale = preferredLanguage.languageTag

// // handle RTL languages
// export const isRTL = preferredLanguage.textDirection === "rtl"
// I18nManager.allowRTL(isRTL)
// I18nManager.forceRTL(isRTL)

// /**
//  * Builds up valid keypaths for translations.
//  */
// export type TxKeyPath = RecursiveKeyOf<Translations>

// // via: https://stackoverflow.com/a/65333050
// type RecursiveKeyOf<TObj extends object> = {
//   [TKey in keyof TObj & (string | number)]: RecursiveKeyOfHandleValue<TObj[TKey], `${TKey}`>
// }[keyof TObj & (string | number)]

// type RecursiveKeyOfInner<TObj extends object> = {
//   [TKey in keyof TObj & (string | number)]: RecursiveKeyOfHandleValue<
//     TObj[TKey],
//     `['${TKey}']` | `.${TKey}`
//   >
// }[keyof TObj & (string | number)]

// type RecursiveKeyOfHandleValue<TValue, Text extends string> = TValue extends any[]
//   ? Text
//   : TValue extends object
//   ? Text | `${Text}${RecursiveKeyOfInner<TValue>}`
//   : Text

// export { i18n }
