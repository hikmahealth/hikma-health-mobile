import { useSelector } from "@xstate/react"

import { languageStore } from "../store/language"

export function useLanguage() {
  const { language, isRTL } = useSelector(languageStore, (state) => ({
    language: state.context.language,
    isRTL: state.context.isRTL,
  }))
  return { language, isRTL }
}
