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

import DrugCatalogue from "./DrugCatalogue"
import PrescriptionItem from "./PrescriptionItem"

export default class DispensingRecordModel extends Model {
  static table = "dispensing_records"
  static associations = {
    drug_catalogue: { type: "belongs_to", key: "drug_id" },
    prescription_items: { type: "belongs_to", key: "prescription_item_id" },
    patients: { type: "belongs_to", key: "patient_id" },
  } as const

  @text("clinic_id") clinicId!: string
  @text("drug_id") drugId!: string
  @text("batch_id") batchId!: string | null
  @text("prescription_item_id") prescriptionItemId!: string | null
  @text("patient_id") patientId!: string
  @field("quantity_dispensed") quantityDispensed!: number
  @text("dosage_instructions") dosageInstructions!: string | null
  @field("days_supply") daysSupply!: number | null
  @text("dispensed_by") dispensedBy!: string
  @date("dispensed_at") dispensedAt!: Date
  @text("recorded_by_user_id") recordedByUserId!: string | null
  @json("metadata", sanitizeMetadata) metadata!: Record<string, any>
  @field("is_deleted") isDeleted!: boolean
  @date("deleted_at") deletedAt!: Date | null
  @date("last_modified") lastModified!: Date
  @date("server_created_at") serverCreatedAt!: Date | null
  @readonly @date("created_at") createdAt!: Date
  @readonly @date("updated_at") updatedAt!: Date

  @relation("drug_catalogue", "drug_id") drug!: Relation<DrugCatalogue>
  @relation("prescription_items", "prescription_item_id")
  prescriptionItem!: Relation<PrescriptionItem>
  @relation("patients", "patient_id") patient!: Relation<any>
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
