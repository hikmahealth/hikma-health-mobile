import { Model, Q, Query, Relation } from "@nozbe/watermelondb"
import { field, date, readonly, text, relation, json, lazy } from "@nozbe/watermelondb/decorators"

import PrescriptionItem from "@/models/PrescriptionItem"

import ClinicInventory from "./ClinicInventory"
import DrugCatalogue from "./DrugCatalogue"

export default class PrescriptionItemModel extends Model {
  static table = "prescription_items"
  static associations = {
    prescriptions: { type: "belongs_to", key: "prescription_id" },
    patients: { type: "belongs_to", key: "patient_id" },
    drug_catalogue: { type: "belongs_to", key: "drug_id" },
  } as const

  @text("prescription_id") prescriptionId!: string
  @text("patient_id") patientId!: string
  @text("drug_id") drugId!: string
  @text("clinic_id") clinicId!: string
  @text("dosage_instructions") dosageInstructions!: string
  @field("quantity_prescribed") quantityPrescribed!: number
  @field("quantity_dispensed") quantityDispensed!: number
  @field("refills_authorized") refillsAuthorized!: number
  @field("refills_used") refillsUsed!: number
  @text("item_status") itemStatus!: PrescriptionItem.ItemStatus // active, completed, cancelled
  @text("notes") notes!: string | null

  @text("recorded_by_user_id") recordedByUserId!: string

  // --- Metadata & Flags ---
  // The 'json' decorator requires a sanitizer function.
  // This simple one returns the value as is.
  @json("metadata", sanitizeMetadata) metadata!: Record<string, any>
  @field("is_deleted") isDeleted!: boolean

  @readonly @date("created_at") createdAt!: Date
  @readonly @date("updated_at") updatedAt!: Date
  @readonly @date("deleted_at") deletedAt!: Date | null

  @relation("prescriptions", "prescription_id") prescription!: Relation<any>
  @relation("patients", "patient_id") patient!: Relation<any>
  @relation("drug_catalogue", "drug_id") drug!: Relation<DrugCatalogue>

  @lazy
  clinicInventory: Query<ClinicInventory> = this.collections
    .get<ClinicInventory>("clinic_inventory")
    .query(Q.where("drug_id", this.drugId), Q.where("is_deleted", false))
}

function sanitizeMetadata(data: any) {
  if (data) {
    return data
  } else {
    return {}
  }
}
