import { useSelector } from "@xstate/react"
import { createStore } from "@xstate/store"

import Language from "@/models/Language"

// TODO: Persist the selected language between app restarts

export const languageStore = createStore({
  context: {
    language: Language.Language["en-US"],
    isRTL: false,
  },
  on: {
    RESET: (context) => ({
      language: Language.Language["en-US"],
      isRTL: false,
    }),
    SET_LANGUAGE: (context, event: { language: Language.LanguageName }) => ({
      language: event.language,
      isRTL: Language.isRTL(event.language),
    }),
  },
})
