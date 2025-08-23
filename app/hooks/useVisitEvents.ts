import { useEffect, useState } from "react"
import { Option } from "effect"

import Event from "@/models/Event"
import Visit from "@/models/Visit"

/**
 * Get all events for a visit, sorted by created_at
 * @param {Option.Option<string>} visitId
 * @returns {{ events: Event.DB.T[]; isLoading: boolean }}
 */
export function useVisitEvents(visitId: Option.Option<string>): {
  events: Event.DB.T[]
  isLoading: boolean
} {
  const [events, setEvents] = useState<Event.DB.T[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (Option.isNone(visitId)) {
      setEvents([])
      setIsLoading(false)
      return
    }
    setIsLoading(true)
    const sub = Visit.DB.subscribeToEvents(visitId.value, (events, isLoading) => {
      setEvents(events.pipe(Option.getOrElse(() => [])))
      if (isLoading) {
        setEvents([])
      }
      setIsLoading(isLoading)
    })
    return () => {
      return sub?.unsubscribe()
    }
  }, [Option.getOrNull(visitId)])

  return { events, isLoading }
}
