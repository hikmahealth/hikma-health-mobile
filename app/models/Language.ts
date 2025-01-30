import { Instance, SnapshotIn, SnapshotOut, types } from "mobx-state-tree"
import i18next from "i18next"
import { withSetPropAction } from "./helpers/withSetPropAction"
import { I18nManager } from "react-native"

export type LanguageName =
  | "ar"
  | "en-US"
  | "en"
  | "es"
  | "ko"
  | "fr"
  | "sw"
  | "cn"
  | "jp"
  | "ru"
  | "de"
  | "it"
  | "pt"
  | "hi"
  | "ur"
  | "fa"
  | "ku"
  | "he"
  | "dv"
  | "az"
  | "arc"

const LANGUAGES: LanguageName[] = [
  "ar",
  "en-US",
  "en",
  "es",
  "ko",
  "fr",
  "sw",
  "cn",
  "jp",
  "ru",
  "de",
  "it",
  "pt",
  "hi",
  "ur",
  "fa",
  "ku",
  "he",
  "dv",
  "az",
  "arc",
]

/** List of languages that are written in RTL */
const RTL_LANGUAGES = [
  "ar", // arabic
  "arc", // aramaic
  "az", // azeri
  "dv", // dhevei
  "he", // hebrew
  "ku", // kurdish
  "fa", // farsi / persion
  "ur", // urdu
]

/**
 * Model description here for TypeScript hints.
 */
export const LanguageModel = types
  .model("Language")
  .props({
    // language: "en-US",
    current: types.optional(types.enumeration(LANGUAGES), "en-US"),
    isRTL: false,
  })
  .actions(withSetPropAction)
  .views((self) => ({})) // eslint-disable-line @typescript-eslint/no-unused-vars
  .actions((self) => ({
    /** Set a new language */
    setLanguage(language: LanguageName) {
      self.current = language
      self.isRTL = RTL_LANGUAGES.includes(language)
      i18next.changeLanguage(language)

      if (RTL_LANGUAGES.includes(language)) {
        I18nManager.forceRTL(true)
      } else {
        I18nManager.forceRTL(false)
      }

      if (language === "ar") {
        i18next.language = "ar"
      } else {
        i18next.language = language
      }
    },

    /** Reset the language in use */
    resetLanguage() {
      self.current = "en-US"
      self.isRTL = false
      i18next.language = "en-US"
    },
  }))

export interface Language extends Instance<typeof LanguageModel> {}
export interface LanguageSnapshotOut extends SnapshotOut<typeof LanguageModel> {}
export interface LanguageSnapshotIn extends SnapshotIn<typeof LanguageModel> {}
export const createLanguageDefaultModel = () => types.optional(LanguageModel, {})
