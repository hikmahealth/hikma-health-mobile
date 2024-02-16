import { useEffect, useState } from "react"
import database from "../db"
import EventFormModel from "../db/model/EventForm"

export function useDBSingleEventForm(formId: string): EventFormModel | null {
    const [form, setForm] = useState<EventFormModel | null>(null)

    useEffect(() => {
        let sub = database.get<EventFormModel>("event_forms").findAndObserve(formId).subscribe(form => {
            setForm(form)
        })
        return () => {
            return sub?.unsubscribe()
        }
    }, [formId])

    return form
}
