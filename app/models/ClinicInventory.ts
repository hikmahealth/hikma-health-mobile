import { Q } from "@nozbe/watermelondb"
import * as Sentry from "@sentry/react-native"

import database from "@/db"
import ClinicInventoryModel from "@/db/model/ClinicInventory"

namespace ClinicInventory {
  export type T = {
    id: string
    clinicId: string
    drugId: string
    batchId: string
    quantityAvailable: number
    reservedQuantity: number
    lastCountedAt: Date | null
    recordedByUserId: string | null
    metadata: Record<string, any>
    isDeleted: boolean
    deletedAt: Date | null
    lastModified: Date
    serverCreatedAt: Date | null
    createdAt: Date
    updatedAt: Date
  }

  export type DBInventoryItem = ClinicInventoryModel

  export namespace DB {
    export type T = ClinicInventoryModel

    /**
     * Get all inventory items for a specific clinic
     * @param clinicId - The clinic identifier
     * @returns Promise of array of inventory items
     */
    export async function getByClinicId(clinicId: string): Promise<ClinicInventory.T[]> {
      try {
        const collection = database.get<ClinicInventoryModel>("clinic_inventory")
        const items = await collection
          .query(Q.where("clinic_id", clinicId), Q.where("is_deleted", false))
          .fetch()

        return items.map(fromDB)
      } catch (error) {
        Sentry.captureException(error, {
          extra: { clinicId },
        })
        throw error
      }
    }

    /**
     * Get inventory item by clinic, drug, and batch
     * @param clinicId - The clinic identifier
     * @param drugId - The drug identifier
     * @param batchId - The batch identifier
     * @returns Promise of inventory item or null
     */
    export async function getByIds(
      clinicId: string,
      drugId: string,
      batchId: string,
    ): Promise<ClinicInventory.T | null> {
      try {
        const collection = database.get<ClinicInventoryModel>("clinic_inventory")
        const items = await collection
          .query(
            Q.where("clinic_id", clinicId),
            Q.where("drug_id", drugId),
            Q.where("batch_id", batchId),
            Q.where("is_deleted", false),
          )
          .fetch()

        if (items.length === 0) return null
        return fromDB(items[0])
      } catch (error) {
        Sentry.captureException(error, {
          extra: { clinicId, drugId, batchId },
        })
        throw error
      }
    }

    /**
     * Get low stock items for a clinic
     * @param clinicId - The clinic identifier
     * @param threshold - Quantity threshold for low stock
     * @returns Promise of array of low stock items
     */
    export async function getLowStock(
      clinicId: string,
      threshold: number,
    ): Promise<ClinicInventory.T[]> {
      try {
        const collection = database.get<ClinicInventoryModel>("clinic_inventory")
        const items = await collection
          .query(
            Q.where("clinic_id", clinicId),
            Q.where("quantity_available", Q.lte(threshold)),
            Q.where("is_deleted", false),
          )
          .fetch()

        return items.map(fromDB)
      } catch (error) {
        Sentry.captureException(error, {
          extra: { clinicId, threshold },
        })
        throw error
      }
    }

    /**
     * Search inventory by drug name or batch ID
     * @param clinicId - The clinic identifier
     * @param searchTerm - Search term for drug name or batch ID
     * @returns Promise of array of matching inventory items
     */
    export async function search(
      clinicId: string,
      searchTerm: string,
    ): Promise<ClinicInventory.T[]> {
      try {
        const collection = database.get<ClinicInventoryModel>("clinic_inventory")
        const query = searchTerm.toLowerCase()

        const items = await collection
          .query(
            Q.where("clinic_id", clinicId),
            Q.where("is_deleted", false),
            Q.or(Q.where("batch_id", Q.like(`%${query}%`))),
          )
          .fetch()

        // Additional filtering for drug names would require joining with drug_catalogue
        return items.map(fromDB)
      } catch (error) {
        Sentry.captureException(error, {
          extra: { clinicId, searchTerm },
        })
        throw error
      }
    }

    /**
     * Get all inventory items for a specific drug across all clinics
     * @param drugId - The drug identifier
     * @returns Promise of array of inventory items
     */
    export async function getByDrugId(drugId: string): Promise<ClinicInventory.T[]> {
      try {
        const collection = database.get<ClinicInventoryModel>("clinic_inventory")
        const items = await collection
          .query(Q.where("drug_id", drugId), Q.where("is_deleted", false))
          .fetch()

        return items.map(fromDB)
      } catch (error) {
        Sentry.captureException(error, {
          extra: { drugId },
        })
        throw error
      }
    }

    /**
     * Get available (non-reserved) inventory for a clinic
     * @param clinicId - The clinic identifier
     * @returns Promise of array of available inventory items
     */
    export async function getAvailableInventory(clinicId: string): Promise<ClinicInventory.T[]> {
      try {
        const collection = database.get<ClinicInventoryModel>("clinic_inventory")
        const items = await collection
          .query(
            Q.where("clinic_id", clinicId),
            Q.where("quantity_available", Q.gt(0)),
            Q.where("is_deleted", false),
          )
          .fetch()

        return items
          .filter((item) => {
            const available = item.quantityAvailable - item.reservedQuantity
            return available > 0
          })
          .map(fromDB)
      } catch (error) {
        Sentry.captureException(error, {
          extra: { clinicId },
        })
        throw error
      }
    }

    /**
     * Get inventory items that need recount
     * @param clinicId - The clinic identifier
     * @param daysSinceLastCount - Number of days since last count
     * @returns Promise of array of items needing recount
     */
    export async function getItemsNeedingRecount(
      clinicId: string,
      daysSinceLastCount: number = 30,
    ): Promise<ClinicInventory.T[]> {
      try {
        const collection = database.get<ClinicInventoryModel>("clinic_inventory")
        const cutoffDate = new Date()
        cutoffDate.setDate(cutoffDate.getDate() - daysSinceLastCount)

        const items = await collection
          .query(
            Q.where("clinic_id", clinicId),
            Q.where("is_deleted", false),
            Q.or(
              Q.where("last_counted_at", null),
              Q.where("last_counted_at", Q.lte(cutoffDate.getTime())),
            ),
          )
          .fetch()

        return items.map(fromDB)
      } catch (error) {
        Sentry.captureException(error, {
          extra: { clinicId, daysSinceLastCount },
        })
        throw error
      }
    }

    /**
     * Deduct quantity from inventory item
     * @param clinicId - The clinic identifier
     * @param drugId - The drug identifier
     * @param batchId - The batch identifier
     * @param quantityToDeduct - Amount to deduct
     * @returns Promise of updated inventory item or null if not found/insufficient
     */
    export async function deductQuantity(
      clinicId: string,
      drugId: string,
      batchId: string,
      quantityToDeduct: number,
    ): Promise<ClinicInventory.T | null> {
      try {
        const result = await database.write(async () => {
          const collection = database.get<ClinicInventoryModel>("clinic_inventory")
          const items = await collection
            .query(
              Q.where("clinic_id", clinicId),
              Q.where("drug_id", drugId),
              Q.where("batch_id", batchId),
              Q.where("is_deleted", false),
            )
            .fetch()

          if (items.length === 0) return null

          const item = items[0]
          const availableQuantity = item.quantityAvailable - item.reservedQuantity

          if (availableQuantity < quantityToDeduct) {
            return null // Insufficient quantity
          }

          await item.update((record) => {
            record.quantityAvailable = record.quantityAvailable - quantityToDeduct
            record.lastModified = new Date()
          })

          return item
        })

        return result ? fromDB(result) : null
      } catch (error) {
        Sentry.captureException(error, {
          extra: { clinicId, drugId, batchId, quantityToDeduct },
        })
        throw error
      }
    }

    /**
     * Convert database model to domain type
     * @param model - Database model instance
     * @returns Domain type instance
     */
    export const fromDB = (model: ClinicInventoryModel): ClinicInventory.T => {
      return {
        id: model.id,
        clinicId: model.clinicId,
        drugId: model.drugId,
        batchId: model.batchId,
        quantityAvailable: model.quantityAvailable,
        reservedQuantity: model.reservedQuantity,
        lastCountedAt: model.lastCountedAt,
        recordedByUserId: model.recordedByUserId,
        metadata: model.metadata || {},
        isDeleted: model.isDeleted,
        deletedAt: model.deletedAt,
        lastModified: model.lastModified,
        serverCreatedAt: model.serverCreatedAt,
        createdAt: model.createdAt,
        updatedAt: model.updatedAt,
      }
    }
  }
}

export default ClinicInventory
