import { withObservables } from "@nozbe/watermelondb/react"
import { catchError, of as of$ } from "@nozbe/watermelondb/utils/rx"

import DrugCatalogue from "@/models/DrugCatalogue"
import Prescription from "@/models/Prescription"
import PrescriptionItem from "@/models/PrescriptionItem"

/**
 * Higher-order component that enhances a prescription with observable data streams.
 * Observes prescription items and drugs, providing error handling for each stream.
 *
 * @param prescription - The prescription model to enhance with observables
 * @returns An object with the original prescription and observable streams for prescriptionItems and drugs
 */
export const enhancePrescribedDrugsItem = withObservables(
  ["prescription"],
  ({ prescription }: { prescription: Prescription.DB.T }) => ({
    prescription,
    prescriptionItems: prescription.prescriptionItems.observe().pipe(catchError(() => of$([]))),
    drugs: prescription.drugs.observe().pipe(catchError(() => of$(null))),
  }),
)

export type PrescribedDrug = {
  item: PrescriptionItem.DB.T
  drug: DrugCatalogue.DB.T | null
}

/** SOME HELPERS */
export function compilePrescribedDrugs(
  prescriptionItems: PrescriptionItem.DB.T[],
  drugs: DrugCatalogue.DB.T[],
) {
  return prescriptionItems.map((item) => {
    const drug = drugs.find((drug) => drug.id === item.drugId) || null
    return { item, drug: drug }
  })
}
