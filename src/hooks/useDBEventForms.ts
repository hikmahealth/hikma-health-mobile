import { Q } from "@nozbe/watermelondb"
import { useEffect, useState } from "react"
import database from "../db"
import EventFormModel from "../db/model/EventForm"
import { translate } from "../i18n"

export function useDBEventForms(language: string): EventFormModel[] {
  const [forms, setForms] = useState<EventFormModel[]>([])

  useEffect(() => {
    let sub = database.get<EventFormModel>("event_forms").query(
      // Get only the forms in my language
      // This option supports rendering both english and arabic forms
      // Q.where("language", Q.oneOf([translate("languageCode"), "en"])),
      Q.where("language", translate("languageCode")),
    ).observe().subscribe(forms => {
      setForms(forms)
    })
    return () => {
      return sub?.unsubscribe()
    }
  }, [language])

  return forms
}
