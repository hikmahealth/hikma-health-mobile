import { Q } from "@nozbe/watermelondb"
import { useEffect, useState } from "react"
import database from "../db"
import EventModel from "../db/model/Event"

export function useDBEvents(visitId: string): EventModel[] {
  const [events, setEvents] = useState<EventModel[]>([])

  useEffect(() => {
    let sub = database.get<EventModel>("events").query(
      Q.where("visit_id", visitId),
      // sort by created at
      Q.sortBy("created_at", Q.desc),
    ).observe().subscribe(events => {
      setEvents(events)
    })
    return () => {
      return sub?.unsubscribe()
    }
  }, [visitId])

  return events
}
