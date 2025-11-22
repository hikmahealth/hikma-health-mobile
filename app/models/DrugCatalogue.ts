import { Q } from "@nozbe/watermelondb"
import * as Sentry from "@sentry/react-native"

import database from "@/db"
import ClinicInventoryModel from "@/db/model/ClinicInventory"
import DispensingRecordModel from "@/db/model/DispensingRecord"
import DrugCatalogueModel from "@/db/model/DrugCatalogue"
import PrescriptionItemModel from "@/db/model/PrescriptionItem"

namespace DrugCatalogue {
  /**
   * Type representing a drug from the catalogue
   */
  export type T = {
    id: string
    barcode: string | null
    genericName: string
    brandName: string | null
    form: string // tablet, capsule, syrup, etc.
    route: string // oral, IV, IM, etc.
    dosageQuantity: number
    dosageUnits: string
    manufacturer: string | null
    salePrice: number
    saleCurrency: string | null
    minStockLevel: number
    maxStockLevel: number | null
    isControlled: boolean
    requiresRefrigeration: boolean
    isActive: boolean
    notes: string | null
    recordedByUserId: string | null
    metadata: Record<string, any>
    isDeleted: boolean
    deletedAt: Date | null
    lastModified: Date
    serverCreatedAt: Date | null
    createdAt: Date
    updatedAt: Date
  }

  /**
   * Display name for a drug (combines brand and generic names)
   * @param {T} drug - The drug object
   * @returns {string} The display name
   */
  export const displayName = (drug: T): string => {
    if (drug.brandName) {
      return `${drug.brandName} (${drug.genericName})`
    }
    return drug.genericName
  }

  /**
   * Full display name with form and dosage
   * @param {T} drug - The drug object
   * @returns {string} The full display name with dosage and form
   */
  export const fullDisplayName = (drug: T): string => {
    const name = displayName(drug)
    return `${name} ${drug.dosageQuantity}${drug.dosageUnits} ${drug.form}`
  }

  /**
   * Check if drug is in stock based on inventory
   * @param {string} drugId - The drug ID
   * @returns {Promise<boolean>} Whether the drug is in stock
   */
  export const isInStock = async (drugId: string): Promise<boolean> => {
    const inventory = await database.collections
      .get<ClinicInventoryModel>("clinic_inventory")
      .query(
        Q.and(
          Q.where("drug_id", drugId),
          Q.where("is_deleted", false),
          Q.where("current_quantity", Q.gt(0)),
        ),
      )
      .fetchCount()

    return inventory > 0
  }

  export namespace DB {
    export type T = DrugCatalogueModel
    export const table_name = "drug_catalogue"

    /**
     * Converts from DrugCatalogueModel to DrugCatalogue.T
     * @param {DB.T} dbDrug - The database drug model
     * @returns {DrugCatalogue.T} The converted drug object
     */
    export const fromDB = (dbDrug: DB.T): DrugCatalogue.T => ({
      id: dbDrug.id,
      barcode: dbDrug.barcode,
      genericName: dbDrug.genericName,
      brandName: dbDrug.brandName,
      form: dbDrug.form,
      route: dbDrug.route,
      dosageQuantity: dbDrug.dosageQuantity,
      dosageUnits: dbDrug.dosageUnits,
      manufacturer: dbDrug.manufacturer,
      salePrice: dbDrug.salePrice,
      saleCurrency: dbDrug.saleCurrency,
      minStockLevel: dbDrug.minStockLevel,
      maxStockLevel: dbDrug.maxStockLevel,
      isControlled: dbDrug.isControlled,
      requiresRefrigeration: dbDrug.requiresRefrigeration,
      isActive: dbDrug.isActive,
      notes: dbDrug.notes,
      recordedByUserId: dbDrug.recordedByUserId,
      metadata: dbDrug.metadata,
      isDeleted: dbDrug.isDeleted,
      deletedAt: dbDrug.deletedAt,
      lastModified: dbDrug.lastModified,
      serverCreatedAt: dbDrug.serverCreatedAt,
      createdAt: dbDrug.createdAt,
      updatedAt: dbDrug.updatedAt,
    })

    /**
     * Get all active drugs from the catalogue
     * @returns {Promise<DrugCatalogue.T[]>} Array of active drugs
     */
    export async function getAllActive(): Promise<DrugCatalogue.T[]> {
      const drugs = await database.collections
        .get<DB.T>("drug_catalogue")
        .query(
          Q.and(Q.where("is_active", true), Q.where("is_deleted", false)),
          Q.sortBy("generic_name", Q.asc),
        )
        .fetch()

      return drugs.map(fromDB)
    }

    /**
     * Get all drugs including inactive ones
     * @returns {Promise<DrugCatalogue.T[]>} Array of all non-deleted drugs
     */
    export async function getAll(): Promise<DrugCatalogue.T[]> {
      const drugs = await database.collections
        .get<DB.T>("drug_catalogue")
        .query(Q.where("is_deleted", false), Q.sortBy("generic_name", Q.asc))
        .fetch()

      return drugs.map(fromDB)
    }

    /**
     * Get a drug by its ID
     * @param {string} drugId - The drug ID
     * @returns {Promise<DrugCatalogue.T | null>} The drug or null if not found
     */
    export async function getById(drugId: string): Promise<DrugCatalogue.T | null> {
      try {
        const drug = await database.collections.get<DB.T>("drug_catalogue").find(drugId)

        if (drug.isDeleted) {
          return null
        }

        return fromDB(drug)
      } catch (error) {
        console.error(error)
        Sentry.captureException(error)
        return null
      }
    }

    /**
     * Get a drug by barcode
     * @param {string} barcode - The barcode to search for
     * @returns {Promise<DrugCatalogue.T | null>} The drug or null if not found
     */
    export async function getByBarcode(barcode: string): Promise<DrugCatalogue.T | null> {
      const drugs = await database.collections
        .get<DB.T>("drug_catalogue")
        .query(Q.and(Q.where("barcode", barcode), Q.where("is_deleted", false)))
        .fetch()

      if (drugs.length === 0) {
        return null
      }

      return fromDB(drugs[0])
    }

    /**
     * Search drugs by name (generic or brand)
     * @param {string} searchTerm - The search term
     * @returns {Promise<DrugCatalogue.T[]>} Array of matching drugs
     */
    export async function searchByName(searchTerm: string): Promise<DrugCatalogue.T[]> {
      const lowerSearchTerm = searchTerm.toLowerCase()

      const drugs = await database.collections
        .get<DB.T>("drug_catalogue")
        .query(
          Q.and(
            Q.where("is_deleted", false),
            Q.or(
              Q.where("generic_name", Q.like(`%${lowerSearchTerm}%`)),
              Q.where("brand_name", Q.like(`%${lowerSearchTerm}%`)),
            ),
          ),
          Q.sortBy("generic_name", Q.asc),
        )
        .fetch()

      return drugs.map(fromDB)
    }

    /**
     * Get all controlled drugs
     * @returns {Promise<DrugCatalogue.T[]>} Array of controlled drugs
     */
    export async function getControlledDrugs(): Promise<DrugCatalogue.T[]> {
      const drugs = await database.collections
        .get<DB.T>("drug_catalogue")
        .query(
          Q.and(Q.where("is_controlled", true), Q.where("is_deleted", false)),
          Q.sortBy("generic_name", Q.asc),
        )
        .fetch()

      return drugs.map(fromDB)
    }

    /**
     * Get drugs that require refrigeration
     * @returns {Promise<DrugCatalogue.T[]>} Array of drugs requiring refrigeration
     */
    export async function getRefrigerationRequired(): Promise<DrugCatalogue.T[]> {
      const drugs = await database.collections
        .get<DB.T>("drug_catalogue")
        .query(
          Q.and(Q.where("requires_refrigeration", true), Q.where("is_deleted", false)),
          Q.sortBy("generic_name", Q.asc),
        )
        .fetch()

      return drugs.map(fromDB)
    }

    /**
     * Get drugs by form (tablet, capsule, syrup, etc.)
     * @param {string} form - The drug form to filter by
     * @returns {Promise<DrugCatalogue.T[]>} Array of drugs matching the form
     */
    export async function getByForm(form: string): Promise<DrugCatalogue.T[]> {
      const drugs = await database.collections
        .get<DB.T>("drug_catalogue")
        .query(
          Q.and(Q.where("form", form.toLowerCase()), Q.where("is_deleted", false)),
          Q.sortBy("generic_name", Q.asc),
        )
        .fetch()

      return drugs.map(fromDB)
    }

    /**
     * Get drugs by route of administration
     * @param {string} route - The route of administration
     * @returns {Promise<DrugCatalogue.T[]>} Array of drugs matching the route
     */
    export async function getByRoute(route: string): Promise<DrugCatalogue.T[]> {
      const drugs = await database.collections
        .get<DB.T>("drug_catalogue")
        .query(
          Q.and(Q.where("route", route.toLowerCase()), Q.where("is_deleted", false)),
          Q.sortBy("generic_name", Q.asc),
        )
        .fetch()

      return drugs.map(fromDB)
    }

    /**
     * Get drugs by manufacturer
     * @param {string} manufacturer - The manufacturer name
     * @returns {Promise<DrugCatalogue.T[]>} Array of drugs from the manufacturer
     */
    export async function getByManufacturer(manufacturer: string): Promise<DrugCatalogue.T[]> {
      const drugs = await database.collections
        .get<DB.T>("drug_catalogue")
        .query(
          Q.and(Q.where("manufacturer", Q.like(`%${manufacturer}%`)), Q.where("is_deleted", false)),
          Q.sortBy("generic_name", Q.asc),
        )
        .fetch()

      return drugs.map(fromDB)
    }

    /**
     * Advanced search with multiple filters
     * @param {Object} filters - The filter options
     * @param {string} [filters.searchTerm] - Search term for name
     * @param {string} [filters.form] - Drug form
     * @param {string} [filters.route] - Route of administration
     * @param {string} [filters.manufacturer] - Manufacturer name
     * @param {boolean} [filters.isControlled] - Filter controlled drugs
     * @param {boolean} [filters.requiresRefrigeration] - Filter refrigeration required
     * @param {boolean} [filters.isActive] - Filter active drugs
     * @returns {Promise<DrugCatalogue.T[]>} Array of matching drugs
     */
    export async function search(filters: {
      searchTerm?: string
      form?: string
      route?: string
      manufacturer?: string
      isControlled?: boolean
      requiresRefrigeration?: boolean
      isActive?: boolean
    }): Promise<DrugCatalogue.T[]> {
      const conditions: any[] = [Q.where("is_deleted", false)]

      if (filters.searchTerm) {
        const lowerSearchTerm = filters.searchTerm.toLowerCase()
        conditions.push(
          Q.or(
            Q.where("generic_name", Q.like(`%${lowerSearchTerm}%`)),
            Q.where("brand_name", Q.like(`%${lowerSearchTerm}%`)),
          ),
        )
      }

      if (filters.form) {
        conditions.push(Q.where("form", filters.form.toLowerCase()))
      }

      if (filters.route) {
        conditions.push(Q.where("route", filters.route.toLowerCase()))
      }

      if (filters.manufacturer) {
        conditions.push(Q.where("manufacturer", Q.like(`%${filters.manufacturer}%`)))
      }

      if (filters.isControlled !== undefined) {
        conditions.push(Q.where("is_controlled", filters.isControlled))
      }

      if (filters.requiresRefrigeration !== undefined) {
        conditions.push(Q.where("requires_refrigeration", filters.requiresRefrigeration))
      }

      if (filters.isActive !== undefined) {
        conditions.push(Q.where("is_active", filters.isActive))
      }

      const drugs = await database.collections
        .get<DB.T>("drug_catalogue")
        .query(Q.and(...conditions), Q.sortBy("generic_name", Q.asc))
        .fetch()

      return drugs.map(fromDB)
    }

    /**
     * Get drugs below minimum stock level
     * @returns {Promise<Array<DrugCatalogue.T & { currentStock: number }>>} Array of drugs below minimum stock with current stock count
     */
    export async function getBelowMinimumStock(): Promise<
      Array<DrugCatalogue.T & { currentStock: number }>
    > {
      const drugs = await database.collections
        .get<DB.T>("drug_catalogue")
        .query(Q.and(Q.where("is_active", true), Q.where("is_deleted", false)))
        .fetch()

      const results: Array<DrugCatalogue.T & { currentStock: number }> = []

      for (const drug of drugs) {
        const inventory = await database.collections
          .get<ClinicInventoryModel>("clinic_inventory")
          .query(Q.and(Q.where("drug_id", drug.id), Q.where("is_deleted", false)))
          .fetch()

        const totalStock = inventory.reduce((sum, item) => sum + item.quantityAvailable, 0)

        if (totalStock < drug.minStockLevel) {
          results.push({
            ...fromDB(drug),
            currentStock: totalStock,
          })
        }
      }

      return results
    }

    /**
     * Get inventory for a specific drug
     * @param {string} drugId - The drug ID
     * @returns {Promise<ClinicInventoryModel[]>} Array of inventory records
     */
    export async function getInventory(drugId: string): Promise<ClinicInventoryModel[]> {
      return await database.collections
        .get<ClinicInventoryModel>("clinic_inventory")
        .query(
          Q.and(Q.where("drug_id", drugId), Q.where("is_deleted", false)),
          Q.sortBy("created_at", Q.desc),
        )
        .fetch()
    }

    /**
     * Get prescription items for a drug
     * @param {string} drugId - The drug ID
     * @param {number} [limit=50] - Maximum number of items to return
     * @returns {Promise<PrescriptionItemModel[]>} Array of prescription items
     */
    export async function getPrescriptionItems(
      drugId: string,
      limit: number = 50,
    ): Promise<PrescriptionItemModel[]> {
      return await database.collections
        .get<PrescriptionItemModel>("prescription_items")
        .query(
          Q.and(Q.where("drug_id", drugId), Q.where("is_deleted", false)),
          Q.sortBy("created_at", Q.desc),
          Q.take(limit),
        )
        .fetch()
    }

    /**
     * Get dispensing records for a drug
     * @param {string} drugId - The drug ID
     * @param {number} [limit=50] - Maximum number of records to return
     * @returns {Promise<DispensingRecordModel[]>} Array of dispensing records
     */
    export async function getDispensingRecords(
      drugId: string,
      limit: number = 50,
    ): Promise<DispensingRecordModel[]> {
      return await database.collections
        .get<DispensingRecordModel>("dispensing_records")
        .query(
          Q.and(Q.where("drug_id", drugId), Q.where("is_deleted", false)),
          Q.sortBy("created_at", Q.desc),
          Q.take(limit),
        )
        .fetch()
    }

    /**
     * Subscribe to a drug record in the database
     * @param {string} drugId - The drug ID
     * @param {Function} callback - Function called when drug data updates
     * @returns {Promise<{ unsubscribe: () => void }>} Object containing unsubscribe function
     */
    export async function subscribe(
      drugId: string,
      callback: (drug: DrugCatalogue.T | null, isLoading: boolean) => void,
    ): Promise<{ unsubscribe: () => void }> {
      let isLoading = true

      const subscription = database.collections
        .get<DB.T>("drug_catalogue")
        .findAndObserve(drugId)
        .subscribe((dbDrug) => {
          if (dbDrug && !dbDrug.isDeleted) {
            callback(fromDB(dbDrug), isLoading)
          } else {
            callback(null, isLoading)
          }
          isLoading = false
        })

      return {
        unsubscribe: () => subscription.unsubscribe(),
      }
    }

    /**
     * Count total active drugs
     * @returns {Promise<number>} The count of active drugs
     */
    export async function countActive(): Promise<number> {
      return await database.collections
        .get<DB.T>("drug_catalogue")
        .query(Q.and(Q.where("is_active", true), Q.where("is_deleted", false)))
        .fetchCount()
    }

    /**
     * Count drugs by category
     * @returns {Promise<{ controlled: number; refrigerated: number; active: number; total: number }>} Counts by category
     */
    export async function countByCategory(): Promise<{
      controlled: number
      refrigerated: number
      active: number
      total: number
    }> {
      const collection = database.collections.get<DB.T>("drug_catalogue")

      const [controlled, refrigerated, active, total] = await Promise.all([
        collection
          .query(Q.and(Q.where("is_controlled", true), Q.where("is_deleted", false)))
          .fetchCount(),

        collection
          .query(Q.and(Q.where("requires_refrigeration", true), Q.where("is_deleted", false)))
          .fetchCount(),

        collection
          .query(Q.and(Q.where("is_active", true), Q.where("is_deleted", false)))
          .fetchCount(),

        collection.query(Q.where("is_deleted", false)).fetchCount(),
      ])

      return {
        controlled,
        refrigerated,
        active,
        total,
      }
    }
  }
}

export default DrugCatalogue
