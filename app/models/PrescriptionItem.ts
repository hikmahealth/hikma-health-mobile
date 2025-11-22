import { Q } from "@nozbe/watermelondb"
import * as Sentry from "@sentry/react-native"

import database from "@/db"
import ClinicInventoryModel from "@/db/model/ClinicInventory"
import DrugCatalogueModel from "@/db/model/DrugCatalogue"
import PrescriptionItemModel from "@/db/model/PrescriptionItem"
import DispensingRecordModel from "@/db/model/DispensingRecord"

namespace PrescriptionItem {
  export type T = {
    id: string
    prescriptionId: string
    patientId: string
    drugId: string
    clinicId: string
    dosageInstructions: string
    quantityPrescribed: number
    quantityDispensed: number
    refillsAuthorized: number
    refillsUsed: number
    itemStatus: ItemStatus
    notes: string | null
    createdAt: Date
    updatedAt: Date
    recordedByUserId: string | null
    metadata: Record<string, any>
    isDeleted: boolean
    deletedAt: Date | null
  }

  export type ItemStatus = "active" | "completed" | "cancelled"

  export const ItemStatus = {
    ACTIVE: "active" as ItemStatus,
    COMPLETED: "completed" as ItemStatus,
    CANCELLED: "cancelled" as ItemStatus,
  }

  export const itemStatusList: ItemStatus[] = ["active", "completed", "cancelled"]

  export type DBPrescriptionItem = PrescriptionItemModel

  /**
   * Convert database model to domain type
   * @param {DBPrescriptionItem} dbItem
   * @returns {T}
   */
  const fromDB = (dbItem: DBPrescriptionItem): T => {
    return {
      id: dbItem.id,
      prescriptionId: dbItem.prescriptionId,
      patientId: dbItem.patientId,
      drugId: dbItem.drugId,
      clinicId: dbItem.clinicId,
      dosageInstructions: dbItem.dosageInstructions,
      quantityPrescribed: dbItem.quantityPrescribed,
      quantityDispensed: dbItem.quantityDispensed,
      refillsAuthorized: dbItem.refillsAuthorized,
      refillsUsed: dbItem.refillsUsed,
      itemStatus: dbItem.itemStatus as ItemStatus,
      notes: dbItem.notes,
      isDeleted: dbItem.isDeleted,
      recordedByUserId: dbItem.recordedByUserId || null,
      metadata: dbItem.metadata || {},
      createdAt: dbItem.createdAt,
      updatedAt: dbItem.updatedAt,
      deletedAt: dbItem.deletedAt,
    }
  }

  /**
   * Create an empty prescription item
   * @returns {T}
   */
  export const empty = (id: string): T => ({
    id,
    prescriptionId: "",
    patientId: "",
    drugId: "",
    clinicId: "",
    dosageInstructions: "",
    quantityPrescribed: 0,
    quantityDispensed: 0,
    refillsAuthorized: 0,
    refillsUsed: 0,
    itemStatus: ItemStatus.ACTIVE,
    notes: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    metadata: {},
    deletedAt: null,
    isDeleted: false,
    recordedByUserId: null,
  })

  export namespace DB {
    export type T = PrescriptionItemModel
    export const table_name = "prescription_items"

    /**
     * Get prescription item by ID
     * @param {string} itemId
     * @returns {Promise<T | null>}
     */
    export const getById = async (itemId: string): Promise<PrescriptionItem.T | null> => {
      try {
        const item = await database.get<PrescriptionItemModel>(table_name).find(itemId)
        return fromDB(item)
      } catch (error) {
        console.error("Error getting prescription item by ID:", error)
        Sentry.captureException(error, {
          level: "error",
          extra: { itemId },
        })
        return null
      }
    }

    /**
     * Get all prescription items for a prescription
     * @param {string} prescriptionId
     * @returns {Promise<T[]>}
     */
    export const getByPrescriptionId = async (
      prescriptionId: string,
    ): Promise<PrescriptionItem.T[]> => {
      try {
        const items = await database
          .get<PrescriptionItemModel>(table_name)
          .query(Q.where("prescription_id", prescriptionId))
          .fetch()

        return items.map(fromDB)
      } catch (error) {
        console.error("Error getting prescription items by prescription ID:", error)
        Sentry.captureException(error, {
          level: "error",
          extra: { prescriptionId },
        })
        return []
      }
    }

    /**
     * Get all prescription items for a patient
     * @param {string} patientId
     * @returns {Promise<T[]>}
     */
    export const getByPatientId = async (patientId: string): Promise<PrescriptionItem.T[]> => {
      try {
        const items = await database
          .get<PrescriptionItemModel>(table_name)
          .query(Q.where("patient_id", patientId), Q.sortBy("created_at", Q.desc))
          .fetch()

        return items.map(fromDB)
      } catch (error) {
        console.error("Error getting prescription items by patient ID:", error)
        Sentry.captureException(error, {
          level: "error",
          extra: { patientId },
        })
        return []
      }
    }

    /**
     * Get active prescription items for a patient
     * @param {string} patientId
     * @returns {Promise<T[]>}
     */
    export const getActiveByPatientId = async (
      patientId: string,
    ): Promise<PrescriptionItem.T[]> => {
      try {
        const items = await database
          .get<PrescriptionItemModel>(table_name)
          .query(
            Q.where("patient_id", patientId),
            Q.where("item_status", ItemStatus.ACTIVE),
            Q.sortBy("created_at", Q.desc),
          )
          .fetch()

        return items.map(fromDB)
      } catch (error) {
        console.error("Error getting active prescription items:", error)
        Sentry.captureException(error, {
          level: "error",
          extra: { patientId },
        })
        return []
      }
    }

    /**
     * Search prescription items by drug name
     * @param {string} searchTerm
     * @param {string} clinicId
     * @returns {Promise<T[]>}
     */
    export const searchByDrugName = async (
      searchTerm: string,
      clinicId?: string,
    ): Promise<PrescriptionItem.T[]> => {
      try {
        const conditions = clinicId ? [Q.where("clinic_id", clinicId)] : []

        const items = await database
          .get<PrescriptionItemModel>(table_name)
          .query(...conditions, Q.sortBy("created_at", Q.desc))
          .fetch()

        // Filter by drug name after fetching
        const filteredItems: PrescriptionItem.T[] = []
        for (const item of items) {
          try {
            const drug = await database.get<DrugCatalogueModel>("drug_catalogue").find(item.drugId)
            // Assuming drug has brandName or drugName property based on typical drug catalogue structure
            const drugName = (drug as any).brandName || (drug as any).drugName || ""
            if (drugName.toLowerCase().includes(searchTerm.toLowerCase())) {
              filteredItems.push(fromDB(item))
            }
          } catch {
            // Drug not found, skip this item
            continue
          }
        }

        return filteredItems
      } catch (error) {
        console.error("Error searching prescription items:", error)
        Sentry.captureException(error, {
          level: "error",
          extra: { searchTerm, clinicId },
        })
        return []
      }
    }

    /**
     * Get prescription items with low refills remaining
     * @param {string} clinicId
     * @param {number} threshold
     * @returns {Promise<T[]>}
     */
    export const getLowRefillItems = async (
      clinicId: string,
      threshold: number = 1,
    ): Promise<PrescriptionItem.T[]> => {
      try {
        const items = await database
          .get<PrescriptionItemModel>(table_name)
          .query(
            Q.where("clinic_id", clinicId),
            Q.where("item_status", ItemStatus.ACTIVE),
            Q.sortBy("created_at", Q.desc),
          )
          .fetch()

        return items
          .filter((item) => item.refillsAuthorized - item.refillsUsed <= threshold)
          .map(fromDB)
      } catch (error) {
        console.error("Error getting low refill items:", error)
        Sentry.captureException(error, {
          level: "error",
          extra: { clinicId, threshold },
        })
        return []
      }
    }

    /**
     * Get undispensed prescription items
     * @param {string} clinicId
     * @returns {Promise<T[]>}
     */
    export const getUndispensedItems = async (clinicId: string): Promise<PrescriptionItem.T[]> => {
      try {
        const items = await database
          .get<PrescriptionItemModel>(table_name)
          .query(
            Q.where("clinic_id", clinicId),
            Q.where("item_status", ItemStatus.ACTIVE),
            Q.sortBy("created_at", Q.desc),
          )
          .fetch()

        return items.filter((item) => item.quantityDispensed < item.quantityPrescribed).map(fromDB)
      } catch (error) {
        console.error("Error getting undispensed items:", error)
        Sentry.captureException(error, {
          level: "error",
          extra: { clinicId },
        })
        return []
      }
    }

    /**
     * Create a prescription item
     * @param {Partial<T>} itemData
     * @returns {Promise<string | null>}
     */
    export const create = async (itemData: Partial<PrescriptionItem.T>): Promise<string | null> => {
      try {
        const newItem = await database.write(async () => {
          return await database.get<PrescriptionItemModel>(table_name).create((item) => {
            if (itemData.prescriptionId) item.prescriptionId = itemData.prescriptionId
            if (itemData.patientId) item.patientId = itemData.patientId
            if (itemData.drugId) item.drugId = itemData.drugId
            if (itemData.clinicId) item.clinicId = itemData.clinicId
            if (itemData.dosageInstructions) item.dosageInstructions = itemData.dosageInstructions
            if (itemData.quantityPrescribed !== undefined)
              item.quantityPrescribed = itemData.quantityPrescribed
            if (itemData.quantityDispensed !== undefined)
              item.quantityDispensed = itemData.quantityDispensed
            if (itemData.refillsAuthorized !== undefined)
              item.refillsAuthorized = itemData.refillsAuthorized
            if (itemData.refillsUsed !== undefined) item.refillsUsed = itemData.refillsUsed
            item.itemStatus = itemData.itemStatus || ItemStatus.ACTIVE
            if (itemData.notes !== undefined) item.notes = itemData.notes
          })
        })

        return newItem.id
      } catch (error) {
        console.error("Error creating prescription item:", error)
        Sentry.captureException(error, {
          level: "error",
          extra: { itemData },
        })
        return null
      }
    }

    /**
     * Update a prescription item
     * @param {string} itemId
     * @param {Partial<T>} updates
     * @returns {Promise<boolean>}
     */
    export const update = async (
      itemId: string,
      updates: Partial<PrescriptionItem.T>,
    ): Promise<boolean> => {
      try {
        await database.write(async () => {
          const item = await database.get<PrescriptionItemModel>(table_name).find(itemId)
          await item.update((record) => {
            if (updates.dosageInstructions !== undefined)
              record.dosageInstructions = updates.dosageInstructions
            if (updates.quantityPrescribed !== undefined)
              record.quantityPrescribed = updates.quantityPrescribed
            if (updates.quantityDispensed !== undefined)
              record.quantityDispensed = updates.quantityDispensed
            if (updates.refillsAuthorized !== undefined)
              record.refillsAuthorized = updates.refillsAuthorized
            if (updates.refillsUsed !== undefined) record.refillsUsed = updates.refillsUsed
            if (updates.itemStatus !== undefined) record.itemStatus = updates.itemStatus
            if (updates.notes !== undefined) record.notes = updates.notes
          })
        })

        return true
      } catch (error) {
        console.error("Error updating prescription item:", error)
        Sentry.captureException(error, {
          level: "error",
          extra: { itemId, updates },
        })
        return false
      }
    }

    /**
     * Dispense medication from multiple batches and update inventory
     * @param {string} itemId - Prescription item ID
     * @param {Record<string, number>} batchQuantities - Map of batchId to quantity to dispense
     * @returns {Promise<boolean>}
     * @example dispenseAndUpdateInventory('item-123', { 'batch-1': 10, 'batch-2': 5 })
     */
    export const dispenseAndUpdateInventory = async (
      itemId: string,
      providerId: string,
      batchQuantities: Record<string, number>,
    ): Promise<boolean> => {
      // FIXME: NEED TO CREATE A NEW DISPENSING RECORD
      try {
        return await database.write(async () => {
          const item = await database.get<PrescriptionItemModel>(table_name).find(itemId)

          // Calculate total quantity across all batches
          const totalQuantity = Object.values(batchQuantities).reduce((sum, qty) => sum + qty, 0)

          const updates: any[] = []

          // Update prescription item
          updates.push(
            item.prepareUpdate((record) => {
              // This prevents dispensing more than prescribed
              record.quantityDispensed = Math.min(
                record.quantityDispensed + totalQuantity,
                record.quantityPrescribed,
              )
              // if (record.quantityDispensed >= record.quantityPrescribed) {
              //   record.itemStatus = ItemStatus.COMPLETED
              // }
            }),
          )

          // Deduct from each batch's inventory
          for (const [batchId, quantity] of Object.entries(batchQuantities)) {
            const inventoryRecord = await database
              .get<ClinicInventoryModel>("clinic_inventory")
              .query(
                Q.where("clinic_id", item.clinicId),
                Q.where("drug_id", item.drugId),
                Q.where("batch_id", batchId),
              )
              .fetch()

            if (inventoryRecord.length === 0) {
              throw new Error(`No inventory found for batch ${batchId}`)
            }

            updates.push(
              inventoryRecord[0]?.prepareUpdate((record) => {
                record.quantityAvailable -= quantity
              }),
            )

            // Create a new dispensing record
            const dispensingRecord = database
              .get<DispensingRecordModel>("dispensing_records")
              .prepareCreate((record) => {
                record.prescriptionItemId = itemId
                record.quantityDispensed = quantity
                record.batchId = batchId
                record.patientId = item.patientId
                record.drugId = item.drugId
                record.clinicId = item.clinicId
                record.dispensedBy = providerId
                record.dispensedAt = new Date()
                record.metadata = {}
              })

            updates.push(dispensingRecord)
          }

          // Execute all updates atomically
          await database.batch(...updates)
          return true
        })
      } catch (error) {
        console.error("Error dispensing medication:", error)
        Sentry.captureException(error, {
          level: "error",
          extra: { itemId, batchQuantities },
        })
        return false
      }
    }

    /**
     * Dispense medication and update inventory
     * @deprecated
     * @param {string} itemId
     * @param {number} quantityToDispense
     * @param {string} batchId
     * @returns {Promise<boolean>}
     */
    export const dispenseAndUpdateInventorySingle = async (
      itemId: string,
      quantityToDispense: number,
      batchId: string,
    ): Promise<boolean> => {
      try {
        return await database.write(async () => {
          const item = await database.get<PrescriptionItemModel>(table_name).find(itemId)

          // Update prescription item
          await item.update((record) => {
            record.quantityDispensed = Math.min(
              record.quantityDispensed + quantityToDispense,
              record.quantityPrescribed,
            )

            // Check if fully dispensed
            if (record.quantityDispensed >= record.quantityPrescribed) {
              record.itemStatus = ItemStatus.COMPLETED
            }
          })

          // Deduct from inventory
          const success = await deductInventoryQuantity(
            item.drugId,
            item.clinicId,
            batchId,
            quantityToDispense,
          )

          if (!success) {
            throw new Error("Failed to update inventory")
          }

          return true
        })
      } catch (error) {
        console.error("Error dispensing medication:", error)
        Sentry.captureException(error, {
          level: "error",
          extra: { itemId, quantityToDispense, batchId },
        })
        return false
      }
    }

    /**
     * Deduct quantity from clinic inventory
     * @param {string} drugId
     * @param {string} clinicId
     * @param {string} batchId
     * @param {number} quantityToDeduct
     * @returns {Promise<boolean>}
     */
    export const deductInventoryQuantity = async (
      drugId: string,
      clinicId: string,
      batchId: string,
      quantityToDeduct: number,
    ): Promise<boolean> => {
      try {
        await database.write(async () => {
          const inventoryItems = await database
            .get<ClinicInventoryModel>("clinic_inventory")
            .query(
              Q.where("drug_id", drugId),
              Q.where("clinic_id", clinicId),
              Q.where("batch_id", batchId),
              Q.where("is_deleted", false),
            )
            .fetch()

          if (inventoryItems.length === 0) {
            throw new Error("Inventory item not found")
          }

          const inventoryItem = inventoryItems[0]

          if (inventoryItem.quantityAvailable < quantityToDeduct) {
            throw new Error("Insufficient inventory")
          }

          await inventoryItem.update((record: ClinicInventoryModel) => {
            record.quantityAvailable = record.quantityAvailable - quantityToDeduct
            record.lastModified = new Date()
          })
        })

        return true
      } catch (error) {
        console.error("Error deducting inventory quantity:", error)
        Sentry.captureException(error, {
          level: "error",
          extra: { drugId, clinicId, batchId, quantityToDeduct },
        })
        return false
      }
    }

    /**
     * Process refill for prescription item
     * @param {string} itemId
     * @returns {Promise<boolean>}
     */
    export const processRefill = async (itemId: string): Promise<boolean> => {
      try {
        await database.write(async () => {
          const item = await database.get<PrescriptionItemModel>(table_name).find(itemId)

          if (item.refillsUsed >= item.refillsAuthorized) {
            throw new Error("No refills remaining")
          }

          await item.update((record) => {
            record.refillsUsed = record.refillsUsed + 1
            record.quantityDispensed = 0 // Reset for new refill
            record.itemStatus = ItemStatus.ACTIVE
          })
        })

        return true
      } catch (error) {
        console.error("Error processing refill:", error)
        Sentry.captureException(error, {
          level: "error",
          extra: { itemId },
        })
        return false
      }
    }

    /**
     * Cancel prescription item
     * @param {string} itemId
     * @param {string} reason
     * @returns {Promise<boolean>}
     */
    export const cancel = async (itemId: string, reason?: string): Promise<boolean> => {
      try {
        await database.write(async () => {
          const item = await database.get<PrescriptionItemModel>(table_name).find(itemId)

          await item.update((record) => {
            record.itemStatus = ItemStatus.CANCELLED
            if (reason) {
              record.notes = record.notes
                ? `${record.notes}\nCancelled: ${reason}`
                : `Cancelled: ${reason}`
            }
          })
        })

        return true
      } catch (error) {
        console.error("Error cancelling prescription item:", error)
        Sentry.captureException(error, {
          level: "error",
          extra: { itemId, reason },
        })
        return false
      }
    }

    /**
     * Get dispensing statistics for a clinic
     * @param {string} clinicId
     * @param {Date} startDate
     * @param {Date} endDate
     * @returns {Promise<{totalPrescribed: number, totalDispensed: number, totalItems: number}>}
     */
    export const getDispensingStats = async (
      clinicId: string,
      startDate?: Date,
      endDate?: Date,
    ): Promise<{
      totalPrescribed: number
      totalDispensed: number
      totalItems: number
    }> => {
      try {
        const query = [Q.where("clinic_id", clinicId)]

        if (startDate) {
          query.push(Q.where("created_at", Q.gte(startDate.getTime())))
        }

        if (endDate) {
          query.push(Q.where("created_at", Q.lte(endDate.getTime())))
        }

        const items = await database
          .get<PrescriptionItemModel>(table_name)
          .query(...query)
          .fetch()

        const stats = items.reduce(
          (acc, item) => ({
            totalPrescribed: acc.totalPrescribed + item.quantityPrescribed,
            totalDispensed: acc.totalDispensed + item.quantityDispensed,
            totalItems: acc.totalItems + 1,
          }),
          { totalPrescribed: 0, totalDispensed: 0, totalItems: 0 },
        )

        return stats
      } catch (error) {
        console.error("Error getting dispensing statistics:", error)
        Sentry.captureException(error, {
          level: "error",
          extra: { clinicId, startDate, endDate },
        })
        return { totalPrescribed: 0, totalDispensed: 0, totalItems: 0 }
      }
    }

    /**
     * Check if drug is available in inventory
     * @param {string} drugId
     * @param {string} clinicId
     * @param {number} requiredQuantity
     * @returns {Promise<boolean>}
     */
    export const checkDrugAvailability = async (
      drugId: string,
      clinicId: string,
      requiredQuantity: number,
    ): Promise<boolean> => {
      try {
        const inventoryItems = await database
          .get<ClinicInventoryModel>("clinic_inventory")
          .query(
            Q.where("drug_id", drugId),
            Q.where("clinic_id", clinicId),
            Q.where("is_deleted", false),
          )
          .fetch()

        const totalAvailable = inventoryItems.reduce((sum, item) => sum + item.quantityAvailable, 0)

        return totalAvailable >= requiredQuantity
      } catch (error) {
        console.error("Error checking drug availability:", error)
        Sentry.captureException(error, {
          level: "error",
          extra: { drugId, clinicId, requiredQuantity },
        })
        return false
      }
    }

    /**
     * Delete prescription item
     * @param {string} itemId
     * @returns {Promise<boolean>}
     */
    export const deleteById = async (itemId: string): Promise<boolean> => {
      try {
        await database.write(async () => {
          const item = await database.get<PrescriptionItemModel>(table_name).find(itemId)
          await item.markAsDeleted()
        })

        return true
      } catch (error) {
        console.error("Error deleting prescription item:", error)
        Sentry.captureException(error, {
          level: "error",
          extra: { itemId },
        })
        return false
      }
    }
  }
}

export default PrescriptionItem
