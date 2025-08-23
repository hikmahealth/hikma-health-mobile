import { Model } from "@nozbe/watermelondb"
import * as Sentry from "@sentry/react-native"
import { Option } from "effect"

import database from "@/db"
import PrescriptionModel from "@/db/model/Prescription"
import VisitModel from "@/db/model/Visit"

import User from "./User"

namespace Prescription {
  export const Priority = {
    HIGH: "high",
    LOW: "low",
    NORMAL: "normal",
    EMERGENCY: "emergency",
  }
  export const priorityList: (typeof Priority)[keyof typeof Priority][] = [
    "high",
    "low",
    "normal",
    "emergency",
  ]
  export const Status = {
    PENDING: "pending",
    PREPARED: "prepared",
    PICKED_UP: "picked-up",
    NOT_PICKED_UP: "not-picked-up",
    PARTIALLY_PICKED_UP: "partially-picked-up",
    CANCELLED: "cancelled",
    OTHER: "other",
  }
  export const statusList: (typeof Status)[keyof typeof Status][] = [
    "pending",
    "prepared",
    "picked-up",
    "not-picked-up",
    "partially-picked-up",
    "cancelled",
    "other",
  ]
  export type Priority = (typeof Priority)[keyof typeof Priority]
  export type Status = (typeof Status)[keyof typeof Status]

  export const Route = {
    ORAL: "oral",
    SUBLINGUAL: "sublingual",
    RECTAL: "rectal",
    TOPICAL: "topical",
    INHALATION: "inhalation",
    INTRAVENOUS: "intravenous",
    INTRAMUSCULAR: "intramuscular",
    INTRADERMAL: "intradermal",
    SUBCUTANEOUS: "subcutaneous",
    NASAL: "nasal",
    OPHTHALMIC: "ophthalmic",
    OTIC: "otic",
    VAGINAL: "vaginal",
    TRANSDERMAL: "transdermal",
    OTHER: "other",
  }
  export const routeList: (typeof Route)[keyof typeof Route][] = [
    "oral",
    "sublingual",
    "rectal",
    "topical",
    "inhalation",
    "intravenous",
    "intramuscular",
    "intradermal",
    "subcutaneous",
    "nasal",
    "ophthalmic",
    "otic",
    "vaginal",
    "transdermal",
    "other",
  ]
  export type Route = (typeof Route)[keyof typeof Route]

  export const Form = {
    TABLET: "tablet",
    SYRUP: "syrup",
    AMPULE: "ampule",
    SUPPOSITORY: "suppository",
    CREAM: "cream",
    DROPS: "drops",
    BOTTLE: "bottle",
    SPRAY: "spray",
    GEL: "gel",
    LOTION: "lotion",
    INHALER: "inhaler",
    CAPSULE: "capsule",
    INJECTION: "injection",
    PATCH: "patch",
    OTHER: "other",
  }
  export const formList: (typeof Form)[keyof typeof Form][] = [
    "tablet",
    "syrup",
    "ampule",
    "suppository",
    "cream",
    "drops",
    "bottle",
    "spray",
    "gel",
    "lotion",
    "inhaler",
    "capsule",
    "injection",
    "patch",
    "other",
  ]
  export type Form = (typeof Form)[keyof typeof Form]

  export const DurationUnit = {
    HOURS: "hours",
    DAYS: "days",
    WEEKS: "weeks",
    MONTHS: "months",
    YEARS: "years",
  }
  export const durationUnitList: (typeof DurationUnit)[keyof typeof DurationUnit][] = [
    "hours",
    "days",
    "weeks",
    "months",
    "years",
  ]
  export type DurationUnit = (typeof DurationUnit)[keyof typeof DurationUnit]

  export const DoseUnit = {
    MG: "mg",
    G: "g",
    MCG: "mcg",
    ML: "mL",
    L: "L",
    UNITS: "units",
  }
  export const doseUnitList: (typeof DoseUnit)[keyof typeof DoseUnit][] = [
    "mg",
    "g",
    "mcg",
    "mL",
    "L",
    "units",
  ]
  export type DoseUnit = (typeof DoseUnit)[keyof typeof DoseUnit]

  export type MedicationEntry = {
    id: string
    name: string
    route: Route
    form: Form
    frequency: number
    intervals: number
    dose: number
    doseUnits: DoseUnit
    duration: number
    durationUnits: DurationUnit
  }

  export type Item = MedicationEntry & {
    medicationId: string
    quantity: number
    status: Status
    priority: Priority
    filledAt: Date | null
    filledByUserId: string | null
  }

  export type T = {
    id: string
    patientId: string
    providerId: string
    filledBy: Option.Option<string>
    pickupClinicId: Option.Option<string>
    visitId: Option.Option<string>
    priority: Priority
    status: Status
    items: Item[]
    notes: string
    expirationDate: Date
    prescribedAt: Date
    filledAt: Option.Option<Date>
    metadata: Record<string, any>
    isDeleted: boolean
    deletedAt: Option.Option<Date>
    createdAt: Date
    updatedAt: Date
  }

  /** Default empty Prescription Item */
  export const empty: T = {
    id: "",
    patientId: "",
    providerId: "",
    filledBy: Option.none(),
    pickupClinicId: Option.none(),
    visitId: Option.none(),
    priority: "normal",
    status: "pending",
    items: [],
    notes: "",
    expirationDate: new Date(),
    prescribedAt: new Date(),
    filledAt: Option.none(),
    metadata: {},
    isDeleted: false,
    deletedAt: Option.none(),
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  export namespace DB {
    /**
     * Create a prescription
     * @param {PrescriptionForm} prescription
     * @param {User.Provider} provider
     * @returns {Promise<{visitId: string | null, prescriptionId: string}>}
     */
    export const createPrescription = async (
      prescription: PrescriptionForm,
      provider: User.Provider,
    ): Promise<{ visitId: string | null; prescriptionId: string }> => {
      return await database.write(async () => {
        // If there is no visitId, we need to create a new visit
        let visit: VisitModel | null = null
        let visitId: string | null = prescription.visitId
        if (!prescription.visitId) {
          const visitClinicId = prescription.pickupClinicId || provider.clinic_id || undefined
          visit = database.get<VisitModel>("visits").prepareCreate((newVisit) => {
            newVisit.patientId = prescription.patientId
            if (visitClinicId !== undefined) newVisit.clinicId = visitClinicId
            newVisit.providerId = provider.id
            newVisit.providerName = provider.name
            newVisit.checkInTimestamp = new Date()
            newVisit.metadata = {}
          })
          visitId = visit.id
        }

        const prescriptionQuery = database
          .get<PrescriptionModel>("prescriptions")
          .prepareCreate((newPrescription) => {
            newPrescription.patientId = prescription.patientId
            newPrescription.providerId = provider.id
            newPrescription.pickupClinicId = prescription.pickupClinicId || null
            newPrescription.visitId = visitId || null
            newPrescription.priority = prescription.priority
            newPrescription.status = prescription.status
            newPrescription.filledBy = prescription.filledBy
            newPrescription.expirationDate = prescription.expirationDate
            newPrescription.prescribedAt = prescription.prescribedAt
            newPrescription.filledAt = prescription.filledAt
            newPrescription.notes = prescription.notes
            // newPrescription.items = JSON.stringify(prescription.items)
            newPrescription.items = prescription.items
            newPrescription.metadata = {
              ...(prescription.metadata || {}),
              providerId: provider.id,
              providerName: provider.name,
            }
          })

        await database.batch([visit, prescriptionQuery].filter(Boolean) as Model[])
        return {
          visitId,
          prescriptionId: prescriptionQuery.id,
        }
      })
    }

    /**
     * Update a prescription
     * @param {string} prescriptionId
     * @param {Partial<PrescriptionForm>} prescription
     * @param {User.Provider} provider
     * @returns {Promise<{visitId: string | null, prescriptionId: string}>}
     */
    export const updatePrescription = async (
      prescriptionId: string,
      prescription: Partial<PrescriptionForm>,
      provider: User.Provider,
    ): Promise<{ visitId: string | null; prescriptionId: string }> => {
      return await database.write(async () => {
        const prescriptionRecord = await database
          .get<PrescriptionModel>("prescriptions")
          .find(prescriptionId)

        const updatedPrescription = prescriptionRecord.prepareUpdate((updatedPrescription) => {
          // The commented fields should be immutable after creation. Left here for reference.
          // updatedPrescription.patientId = prescription.patientId
          // updatedPrescription.providerId = provider.id
          // updatedPrescription.clinicId = prescription.clinicId
          // updatedPrescription.visitId = prescription.visitId || null
          // Update only the fields that are present in the partial prescription object
          if (prescription.pickupClinicId !== undefined)
            updatedPrescription.pickupClinicId = prescription.pickupClinicId
          if (prescription.priority !== undefined)
            updatedPrescription.priority = prescription.priority
          if (prescription.status !== undefined) updatedPrescription.status = prescription.status
          if (prescription.expirationDate !== undefined)
            updatedPrescription.expirationDate = prescription.expirationDate
          if (prescription.prescribedAt !== undefined)
            updatedPrescription.prescribedAt = prescription.prescribedAt
          if (prescription.filledAt !== undefined)
            updatedPrescription.filledAt = prescription.filledAt
          if (prescription.notes !== undefined) updatedPrescription.notes = prescription.notes
          if (prescription.items !== undefined) updatedPrescription.items = prescription.items

          // TODO: Determine how to handle the filledBy field
          // updatedPrescription.filledBy = provider.id;
          updatedPrescription.metadata = {
            ...(prescription.metadata || {}),
            lastUpdatedBy: provider.id,
            lastUpdatedByName: provider.name,
          }
        })

        // Prepare update for the visit
        let visitUpdate: VisitModel | null = null
        try {
          if (updatedPrescription.visitId) {
            const visitRecord = await database
              .get<VisitModel>("visits")
              .find(updatedPrescription.visitId)
            if (visitRecord) {
              visitUpdate = visitRecord.prepareUpdate((updatedVisit) => {
                updatedVisit.metadata = Object.assign({}, updatedVisit.metadata, {
                  lastUpdatedBy: provider.id,
                  lastUpdatedByName: provider.name,
                })
              })
            }
          }
        } catch (error) {
          console.error(error)
          Sentry.captureException(error, {
            level: "error",
            extra: {
              prescriptionId,
              prescription,
              visitId: updatedPrescription.visitId,
            },
          })
        }

        // Batch update both prescription and visit (if applicable)
        const updateBatch = [updatedPrescription, visitUpdate].filter(Boolean) as Model[]
        await database.batch(updateBatch)

        return {
          visitId: visitUpdate?.id || null,
          prescriptionId: updatedPrescription.id,
        }
      })
    }
  }
}

export default Prescription
