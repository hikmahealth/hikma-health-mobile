import { Model, Q } from "@nozbe/watermelondb"
import * as Sentry from "@sentry/react-native"

import database from "@/db"
import PrescriptionModel from "@/db/model/Prescription"
import VisitModel from "@/db/model/Visit"

import PrescriptionItem from "./PrescriptionItem"
import User from "./User"

namespace Prescription {
  export const Priority = {
    HIGH: "high",
    LOW: "low",
    NORMAL: "normal",
    EMERGENCY: "emergency",
  } as const
  export const priorityList: (typeof Priority)[keyof typeof Priority][] = [
    "high",
    "low",
    "normal",
    "emergency",
  ]
  export const Status = {
    PENDING: "pending",
    PREPARED: "prepared", // same as FILLED
    FILLED: "prepared",
    PICKED_UP: "picked-up",
    NOT_PICKED_UP: "not-picked-up",
    PARTIALLY_PICKED_UP: "partially-picked-up",
    CANCELLED: "cancelled",
    EXPIRED: "expired",
    OTHER: "other",
  } as const
  export const statusList: (typeof Status)[keyof typeof Status][] = [
    "pending",
    "prepared",
    "picked-up",
    "expired",

    "not-picked-up",
    "partially-picked-up",
    "cancelled",
    "other",
  ]
  export type Priority = (typeof Priority)[keyof typeof Priority]
  export type Status = (typeof Status)[keyof typeof Status]

  export type DBModel = PrescriptionModel

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
    filledBy: string | null
    pickupClinicId: string | null
    visitId: string | null
    priority: Priority
    status: Status
    /** @deprecated - use the PrescriptionItem db to store these */
    items: Item[]
    notes: string
    expirationDate: Date
    prescribedAt: Date
    filledAt: Date | null
    metadata: Record<string, any>
    isDeleted: boolean
    deletedAt: Date | null
    createdAt: Date
    updatedAt: Date
  }

  /** Default empty Prescription Item */
  export const empty: T = {
    id: "",
    patientId: "",
    providerId: "",
    filledBy: null,
    pickupClinicId: null,
    visitId: null,
    priority: "normal",
    status: "pending",
    items: [],
    notes: "",
    expirationDate: new Date(),
    prescribedAt: new Date(),
    filledAt: null,
    metadata: {},
    isDeleted: false,
    deletedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  export type PrescriptionForm = {
    patientId: string
    pickupClinicId?: string | null
    visitId?: string | null
    priority: Priority
    status: Status
    filledBy?: string | null
    expirationDate: Date
    prescribedAt: Date
    filledAt?: Date | null
    notes: string
    items: Item[]
    metadata?: Record<string, any>
  }

  export namespace DB {
    export type T = PrescriptionModel
    export const table_name = "prescriptions"
    /**
     * Create a prescription
     * @param {PrescriptionForm} prescription
     * @param {User.Provider} provider
     * @returns {Promise<{visitId: string | null, prescriptionId: string}>}
     */
    // export const createPrescription = async (
    //   prescription: PrescriptionForm,
    //   provider: User.Provider,
    // ): Promise<{ visitId: string | null; prescriptionId: string }> => {
    //   return await database.write(async () => {
    //     // If there is no visitId, we need to create a new visit
    //     let visit: VisitModel | null = null
    //     let visitId: string | null = prescription.visitId || null
    //     if (!prescription.visitId) {
    //       const visitClinicId =
    //         prescription.pickupClinicId || Option.getOrElse(provider.clinic_id, () => null)
    //       visit = database.get<VisitModel>("visits").prepareCreate((newVisit) => {
    //         newVisit.patientId = prescription.patientId
    //         if (visitClinicId !== null) newVisit.clinicId = visitClinicId
    //         newVisit.providerId = provider.id
    //         newVisit.providerName = provider.name
    //         newVisit.checkInTimestamp = new Date()
    //         newVisit.metadata = {}
    //       })
    //       visitId = visit.id
    //     }

    //     const prescriptionQuery = database
    //       .get<PrescriptionModel>(table_name)
    //       .prepareCreate((newPrescription) => {
    //         newPrescription.patientId = prescription.patientId
    //         newPrescription.providerId = provider.id
    //         newPrescription.pickupClinicId = prescription.pickupClinicId || null
    //         newPrescription.visitId = visitId || null
    //         newPrescription.priority = prescription.priority
    //         newPrescription.status = prescription.status
    //         newPrescription.filledBy = prescription.filledBy || null
    //         newPrescription.expirationDate = prescription.expirationDate
    //         newPrescription.prescribedAt = prescription.prescribedAt
    //         newPrescription.filledAt = prescription.filledAt || null
    //         newPrescription.notes = prescription.notes
    //         // newPrescription.items = JSON.stringify(prescription.items)
    //         newPrescription.items = prescription.items
    //         newPrescription.metadata = {
    //           ...(prescription.metadata || {}),
    //           providerId: provider.id,
    //           providerName: provider.name,
    //         }
    //       })

    //     await database.batch([visit, prescriptionQuery].filter(Boolean) as Model[])
    //     return {
    //       visitId,
    //       prescriptionId: prescriptionQuery.id,
    //     }
    //   })
    // }

    /**
     * Creates a prescription entry.
     *
     * @description First checks if the prescription id exists. if it does, it updates. if not, it creates a new one.
     *
     * @param {string | null} prescriptionId
     * @param {Prescription.T} prescription
     * @param {PrescriptionItem.T[]} prescriptionItems
     * @param {User.Provider} provider
     * @param {boolean} shouldCreateNewVisit - whether or not to create a new visit
     * @returns {Promise<{visitId: string | null, prescriptionId: string}>}
     */
    export const create = async (
      prescriptionId: string | null,
      prescription: Prescription.T,
      prescriptionItems: PrescriptionItem.T[],
      provider: {
        id: string
        name: string
        clinicId: string
      },
      shouldCreateNewVisit: boolean = false,
    ): Promise<{ visitId: string | null; prescriptionId: string }> => {
      return await database.write(async () => {
        let dbVisitId: string | null = null
        let dbVisit: VisitModel | null = null

        // Find or create visit
        try {
          const visit = await database.get<VisitModel>("visits").find(prescription.visitId || "")
          if (visit) {
            dbVisitId = visit.id
          } else {
            throw new Error("Visit not found")
          }
        } catch (err: any) {
          if (shouldCreateNewVisit === true) {
            // Only create new visit if it's a "not found" error
            if (err?.message?.includes("not found") || err?.message?.includes("find")) {
              const visitClinicId = prescription.pickupClinicId || provider.clinicId
              dbVisit = database.get<VisitModel>("visits").prepareCreate((newVisit) => {
                newVisit.patientId = prescription.patientId
                if (visitClinicId !== null) newVisit.clinicId = visitClinicId
                newVisit.providerId = provider.id
                newVisit.providerName = provider.name
                newVisit.checkInTimestamp = new Date()
              })
              dbVisitId = dbVisit.id
            } else {
              // Re-throw unexpected errors
              throw err
            }
          }
        }

        let dbPrescription: PrescriptionModel

        // Find or create prescription
        try {
          const existingPrescription = await database
            .get<PrescriptionModel>(table_name)
            .find(prescriptionId || "")

          // Update existing prescription
          dbPrescription = existingPrescription.prepareUpdate((updatedPrescription) => {
            updatedPrescription.patientId = prescription.patientId
            updatedPrescription.pickupClinicId = prescription.pickupClinicId || null
            updatedPrescription.visitId = dbVisitId || null
            updatedPrescription.priority = prescription.priority
            updatedPrescription.status = prescription.status
            updatedPrescription.filledBy = prescription.filledBy || null
            updatedPrescription.expirationDate = prescription.expirationDate
            updatedPrescription.prescribedAt = prescription.prescribedAt
            updatedPrescription.filledAt = prescription.filledAt || null
            updatedPrescription.notes = prescription.notes
            // newPrescription.items = JSON.stringify(prescription.items)
            // items are deprecated
            // newPrescription.items = prescription.items
            updatedPrescription.metadata = {
              ...(prescription.metadata || {}),
              lastUpdatedBy: provider.id,
              lastUpdatedByName: provider.name,
            }
          })
        } catch (err: any) {
          // Only create new prescription if it's a "not found" error
          if (err?.message?.includes("not found") || err?.message?.includes("find")) {
            dbPrescription = database
              .get<PrescriptionModel>(table_name)
              .prepareCreate((newPrescription) => {
                newPrescription.patientId = prescription.patientId
                newPrescription.providerId = provider.id
                newPrescription.pickupClinicId = prescription.pickupClinicId || null
                newPrescription.visitId = dbVisitId || null
                newPrescription.priority = prescription.priority
                newPrescription.status = prescription.status
                newPrescription.filledBy = prescription.filledBy || null
                newPrescription.expirationDate = prescription.expirationDate
                newPrescription.prescribedAt = prescription.prescribedAt
                newPrescription.filledAt = prescription.filledAt || null
                newPrescription.notes = prescription.notes
                // newPrescription.items = JSON.stringify(prescription.items)
                // items are deprecated
                // newPrescription.items = prescription.items
                newPrescription.metadata = {
                  ...(prescription.metadata || {}),
                  providerId: provider.id,
                  providerName: provider.name,
                }
              })
          } else {
            // Re-throw unexpected errors
            throw err
          }
        }

        const dbPrescriptionItems = prescriptionItems.map((item) => {
          return database
            .get<PrescriptionItem.DB.T>(PrescriptionItem.DB.table_name)
            .prepareCreate((newItem) => {
              newItem.prescriptionId = dbPrescription.id
              newItem.patientId = prescription.patientId
              newItem.drugId = item.drugId
              newItem.clinicId = item.clinicId
              newItem.dosageInstructions = item.dosageInstructions
              newItem.quantityPrescribed = item.quantityPrescribed
              newItem.quantityDispensed = item.quantityDispensed
              newItem.refillsAuthorized = item.refillsAuthorized
              newItem.refillsUsed = item.refillsUsed
              newItem.itemStatus = item.itemStatus
              newItem.notes = item.notes
              newItem.recordedByUserId = provider.id
              newItem.metadata = item.metadata || {}
            })
        })

        const changesBatch = [dbVisit, dbPrescription, ...dbPrescriptionItems].filter(
          Boolean,
        ) as Model[]
        await database.batch(changesBatch)

        return {
          visitId: dbVisitId,
          prescriptionId: dbPrescription.id,
        }
      })
    }

    /**
     * Update the status of a prescription.
     * @param {string} prescriptionId
     * @param {Status} status
     * @returns {Promise<void>}
     */
    export const updateStatus = async (prescriptionId: string, status: Status): Promise<void> => {
      await database.write(async () => {
        const prescriptionRecord = await database
          .get<Prescription.DB.T>(Prescription.DB.table_name)
          .find(prescriptionId)

        if (!prescriptionRecord) return

        await prescriptionRecord.update((newPrescription) => {
          newPrescription.status = status
        })
      })
    }

    /**
     * Marks a prescription as picked up. Prescriptions marked as picked up cannot be edited.
     *
     * 1. we mark it as picked up and set the dates
     * 2. we update the inventory values for that batch
     * @param {string} prescriptionId
     * @param {User.Provider} provider
     * @returns {Promise<void>}
     */
    export const markAsPickedUp = async (
      prescriptionId: string,
      provider: { id: string },
    ): Promise<void> => {
      await database.write(async () => {
        const prescriptionRecord = await database
          .get<Prescription.DB.T>(Prescription.DB.table_name)
          .find(prescriptionId)

        if (!prescriptionRecord) return

        await prescriptionRecord.prepareUpdate((newPrescription) => {
          newPrescription.status = "picked-up"
          newPrescription.filledAt = new Date()
          newPrescription.filledBy = provider.id
        })
      })
    }

    /**
     * Update a prescription
     *
     * @deprecated
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
          .get<PrescriptionModel>(table_name)
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

    /**
     * Create query conditions for searching prescriptions
     */
    export const createSearchQueryConditions = (
      searchQuery: string,
      clinicId: string | null,
      status: Status[],
      date: Date,
      options: { offset?: number; limit?: number } = { offset: 0, limit: 50 },
    ): Q.Clause[] => {
      const conditions: Q.Clause[] = [Q.where("is_deleted", false)]

      // Add clinic filter if provided
      if (clinicId) {
        conditions.push(Q.where("pickup_clinic_id", clinicId))
      }

      // Add date filter - filter by prescribed date
      const startOfDay = new Date(date)
      startOfDay.setHours(0, 0, 0, 0)
      const endOfDay = new Date(date)
      endOfDay.setHours(23, 59, 59, 999)

      conditions.push(
        Q.where("prescribed_at", Q.gte(startOfDay.getTime())),
        Q.where("prescribed_at", Q.lte(endOfDay.getTime())),
      )

      // Add status filter if provided
      if (status.length > 0) {
        conditions.push(Q.where("status", Q.oneOf(status)))
      }

      // Add patient name search if search query is provided
      if (searchQuery.trim()) {
        const searchTerm = searchQuery.trim()
        const terms = searchTerm.split(" ")
        conditions.push(
          Q.experimentalJoinTables(["patients"]),
          Q.or(
            ...terms.flatMap((t) => [
              Q.on("patients", "given_name", Q.like(`%${Q.sanitizeLikeString(t)}%`)),
              Q.on("patients", "surname", Q.like(`%${Q.sanitizeLikeString(t)}%`)),
            ]),
          ),
        )
      }

      // Add pagination
      const { offset = 0, limit = 50 } = options
      if (offset > 0) {
        conditions.push(Q.skip(offset))
      }
      if (limit > 0) {
        conditions.push(Q.take(limit))
      }

      return conditions
    }

    /**
     * Convert raw database model to Prescription.T type
     */
    export function rawToT(rawPrescription: PrescriptionModel): T {
      return {
        id: rawPrescription.id,
        patientId: rawPrescription.patientId,
        providerId: rawPrescription.providerId,
        filledBy: rawPrescription.filledBy || null,
        pickupClinicId: rawPrescription.pickupClinicId || null,
        visitId: rawPrescription.visitId || null,
        priority: rawPrescription.priority,
        status: rawPrescription.status,
        items: rawPrescription.items,
        notes: rawPrescription.notes,
        expirationDate: rawPrescription.expirationDate,
        prescribedAt: rawPrescription.prescribedAt,
        filledAt: rawPrescription.filledAt || null,
        metadata: rawPrescription.metadata,
        isDeleted: rawPrescription.isDeleted,
        deletedAt: rawPrescription.deletedAt || null,
        createdAt: rawPrescription.createdAt,
        updatedAt: rawPrescription.updatedAt,
      }
    }
  }
}

export default Prescription
