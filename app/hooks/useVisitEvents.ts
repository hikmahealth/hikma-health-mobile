import { useEffect, useState } from "react"

import Event from "@/models/Event"
import Visit from "@/models/Visit"

/**
 * Get all events for a visit, sorted by created_at
 * @param {string | null} visitId
 * @returns {{ events: Event.DB.T[]; isLoading: boolean }}
 */
export function useVisitEvents(visitId: string | null): {
  events: Event.DB.T[]
  isLoading: boolean
} {
  const [events, setEvents] = useState<Event.DB.T[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (visitId == null) {
      setEvents([])
      setIsLoading(false)
      return
    }
    setIsLoading(true)
    const sub = Visit.DB.subscribeToEvents(visitId, (events) => {
      setEvents(events)
      setIsLoading(false)
    })
    return () => {
      sub?.unsubscribe()
    }
  }, [visitId])

  return { events, isLoading }
}
