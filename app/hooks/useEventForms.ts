import { useEffect, useMemo, useState } from "react"
import { Option } from "effect"

import EventForm from "@/models/EventForm"
// import { useInteractionManager } from "@react-native-community/hooks"
import Language from "@/models/Language"

export function useEventForms(language: Option.Option<Language.LanguageName>): {
  forms: EventForm.DB.T[]
  isLoading: boolean
} {
  const [forms, setForms] = useState<EventForm.DB.T[]>([])
  const [isLoading, setIsLoading] = useState(true)
  // const interactionReady = useInteractionManager()

  const languageValue = useMemo(
    () => Option.getOrElse(() => "en-US" as Language.LanguageName)(language),
    [language],
  )

  useEffect(() => {
    const sub = EventForm.DB.subscribe(language, (forms, isLoading) => {
      setForms(
        Option.match(forms, {
          onNone: () => [],
          onSome: (forms) => forms,
        }),
      )
      setIsLoading(isLoading)
    })
    return () => {
      return sub?.unsubscribe()
    }
  }, [languageValue])

  return { forms, isLoading }
}
