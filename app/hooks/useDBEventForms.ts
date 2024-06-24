import { Q } from "@nozbe/watermelondb"
import { useEffect, useState } from "react"
import database from "../db"
import EventFormModel from "../db/model/EventForm"
import { translate } from "../i18n"
import { useInteractionManager } from "@react-native-community/hooks"

export function useDBEventForms(language?: string): EventFormModel[] {
  const [forms, setForms] = useState<EventFormModel[]>([])
  const interactionReady = useInteractionManager()

  useEffect(() => {
    let sub = { unsubscribe: () => {} }
    if (interactionReady) {
      const queries = [Q.where("is_deleted", Q.notEq(true)), Q.sortBy("name", Q.asc)]
      sub = database
        .get<EventFormModel>("event_forms")
        .query(
          // Get only the forms in my language
          // This option supports rendering both english and arabic forms
          // Q.where("language", Q.oneOf([language, "en"])),
          language && typeof language === "string"
            ? [Q.where("language", language), ...queries]
            : queries,
        )
        .observe()
        .subscribe((forms) => {
          setForms(forms)
        })
    }
    return () => {
      return sub?.unsubscribe()
    }
  }, [language, interactionReady])

  return forms
}
