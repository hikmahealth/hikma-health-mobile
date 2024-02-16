import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { i18n } from "../i18n"

type LanguageState = {
  language: "en-US" | "es" | "ar" | string
  isRtl: boolean
  setLanguage: (language: "en" | "es" | "ar" | string) => void
  resetLanguage: () => void
}

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

export const useLanguageStore = create<LanguageState>()(
  persist(
    (set, get) => ({
      language: "en-US",
      isRtl: false,
      setLanguage: (language) => {
        console.warn({ language })
        set({ language, isRtl: isRTLLanguage(language, RTL_LANGUAGES) })
        if (language === "ar") {
          i18n.locale = "ar"
        } else {
          i18n.locale = language
        }
      },
      resetLanguage: () => set({ language: "en-US" }),
    }),
    {
      name: "language-storage",
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
)


/**
Checks whether or not a language is written from right-to-left

@param {string} languageCode
@param {string[]} rtlLanguages list of languages that are written in rtl format
*/
function isRTLLanguage(languageCode: string, rtlLanguages: string[]): boolean {
  return rtlLanguages.includes(languageCode)
}

