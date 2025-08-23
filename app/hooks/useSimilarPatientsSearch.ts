import { useEffect, useState } from "react"
import { Q } from "@nozbe/watermelondb"
import { sortBy } from "es-toolkit/compat"

import database from "@/db"
import PatientModel from "@/db/model/Patient"
import { levenshtein } from "@/utils/levenshtein"
import { extendedSanitizeLikeString } from "@/utils/parsers"

/**
Hook fetches similar patients and returns them for display
@param givenName string
@param surname string
@returns {PatientModel[]}
*/
export function useSimilarPatientsSearch(givenName: string, surname: string): PatientModel[] {
  const [patients, setPatients] = useState<PatientModel[]>([])

  useEffect(() => {
    if (givenName.length < 2 || surname.length < 2) {
      setPatients([])
      return
    }
    database
      .get<PatientModel>("patients")
      .query(
        Q.or(
          Q.where("given_name", Q.like(`%${extendedSanitizeLikeString(givenName)}%`)),
          Q.where("surname", Q.like(`%${extendedSanitizeLikeString(surname)}%`)),
        ),
        Q.take(10),
      )
      .fetch()
      .then(
        (results) => {
          // get the lev distance for each patient and sort
          const sorted = sortBy(
            results.map((patient) => {
              console.warn(levenshtein(patient.givenName.toLowerCase(), givenName.toLowerCase()))
              return {
                patient,
                distance:
                  levenshtein(patient.givenName.toLowerCase(), givenName.toLowerCase()) +
                  levenshtein(patient.surname.toLowerCase(), surname.toLowerCase()),
              }
            }),
            ["distance"],
          ).map((a) => a.patient)

          setPatients(sorted)
        },
        (error) => {
          console.error(error)
          setPatients([])
        },
      )
  }, [givenName, surname])

  return patients
}
