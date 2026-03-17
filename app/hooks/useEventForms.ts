import { useEffect, useMemo, useState } from "react"
import { useSelector } from "@xstate/react"
import { Option } from "effect"

import EventForm from "@/models/EventForm"
// import { useInteractionManager } from "@react-native-community/hooks"
import Language from "@/models/Language"
import { providerStore } from "@/store/provider"

export function useEventForms(language: Option.Option<Language.LanguageName>): {
  forms: EventForm.DB.T[]
  isLoading: boolean
} {
  const [forms, setForms] = useState<EventForm.DB.T[]>([])
  const [isLoading, setIsLoading] = useState(true)
  // const interactionReady = useInteractionManager()
  const clinicId = useSelector(providerStore, (state) => Option.getOrNull(state.context.clinic_id))

  const languageValue = useMemo(
    () => Option.getOrElse(() => "en-US" as Language.LanguageName)(language),
    [language],
  )

  useEffect(() => {
    const sub = EventForm.DB.subscribe(language, (forms, isLoading) => {
      const allForms = Option.match(forms, {
        onNone: () => [],
        onSome: (forms) => forms,
      })

      // Filter forms by clinic_id: if clinicIds is empty, the form is available to all clinics (backwards compat).
      // If clinicIds is non-empty, only show the form if the provider's clinic is in the list.
      const filtered = allForms.filter((form) => {
        const ids = form.clinicIds
        if (!ids || ids.length === 0) return true
        return clinicId != null && ids.includes(clinicId)
      })
      setForms(filtered)
      setIsLoading(isLoading)
    })
    return () => {
      return sub?.unsubscribe()
    }
  }, [languageValue, clinicId])

  return { forms, isLoading }
}
