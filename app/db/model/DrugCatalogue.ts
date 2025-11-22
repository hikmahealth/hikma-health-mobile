import { Model, Query, Relation } from "@nozbe/watermelondb"
import {
  field,
  date,
  readonly,
  text,
  relation,
  children,
  json,
} from "@nozbe/watermelondb/decorators"

import ClinicInventory from "./ClinicInventory"
import DispensingRecord from "./DispensingRecord"
import PrescriptionItem from "./PrescriptionItem"

export default class DrugCatalogue extends Model {
  static table = "drug_catalogue"
  static associations = {
    clinic_inventory: { type: "has_many", foreignKey: "drug_id" },
    prescription_items: { type: "has_many", foreignKey: "drug_id" },
    dispensing_records: { type: "has_many", foreignKey: "drug_id" },
  } as const

  @text("barcode") barcode!: string | null
  @text("generic_name") genericName!: string
  @text("brand_name") brandName!: string | null
  @text("form") form!: string // tablet, capsule, syrup, etc.
  @text("route") route!: string // oral, IV, IM, etc.
  // @field("dosage_quantity") dosageQuantity!: raw
  @text("dosage_quantity") dosageQuantityRaw!: string
  @text("dosage_units") dosageUnits!: string
  @text("manufacturer") manufacturer!: string | null
  // @field("sale_price") salePrice!: number
  @text("sale_price") salePriceRaw!: string
  @text("sale_currency") saleCurrency!: string | null
  @field("min_stock_level") minStockLevel!: number
  @field("max_stock_level") maxStockLevel!: number | null
  @field("is_controlled") isControlled!: boolean
  @field("requires_refrigeration") requiresRefrigeration!: boolean
  @field("is_active") isActive!: boolean
  @text("notes") notes!: string | null
  @text("recorded_by_user_id") recordedByUserId!: string | null
  @json("metadata", sanitizeMetadata) metadata!: Record<string, any>
  @field("is_deleted") isDeleted!: boolean
  @date("deleted_at") deletedAt!: Date | null
  @date("last_modified") lastModified!: Date
  @date("server_created_at") serverCreatedAt!: Date | null
  @readonly @date("created_at") createdAt!: Date
  @readonly @date("updated_at") updatedAt!: Date

  get salePrice(): number {
    return parseFloat(this.salePriceRaw) || 0
  }

  get dosageQuantity(): number {
    return parseFloat(this.dosageQuantityRaw) || 0
  }

  @children("clinic_inventory") inventoryRecords!: Query<ClinicInventory>
  @children("prescription_items") prescriptionItems!: Query<PrescriptionItem>
  @children("dispensing_records") dispensingRecords!: Query<DispensingRecord>
}

function sanitizeMetadata(json: any) {
  if (!json) return {}
  if (typeof json === "string") {
    try {
      return JSON.parse(json)
    } catch {
      return {}
    }
  }
  return json
}
