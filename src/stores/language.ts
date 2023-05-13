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

export const useLanguageStore = create<LanguageState>()(
  persist(
    (set, get) => ({
      language: "en-US",
        isRtl: false,
      setLanguage: (language) => {
        console.warn({ language })
        set({ language, isRtl: language === "ar" })
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

