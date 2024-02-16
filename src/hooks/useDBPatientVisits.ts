import { Q } from "@nozbe/watermelondb"
import { useEffect, useState } from "react"
import database from "../db"
import EventModel from "../db/model/Event"
import VisitModel from "../db/model/Visit"

export function useDBPatientVisits(patientId: string): VisitModel[] {
  const [visits, setVisits] = useState<VisitModel[]>([])

  useEffect(() => {
    let sub = database
      .get<VisitModel>("visits")
      .query(
        Q.and(Q.where("patient_id", patientId), Q.where("is_deleted", false)),
        // sort by created at
        Q.sortBy("created_at", Q.desc),
      )
      .observe().subscribe(visits => {
        setVisits(visits)
      })

    return () => {
      return sub?.unsubscribe()
    }
  }, [patientId])

  return visits
}
