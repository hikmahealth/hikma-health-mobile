import { Model, Q } from "@nozbe/watermelondb"
import {
  date,
  readonly,
  field,
  text,
  json,
  immutableRelation,
  relation,
  lazy,
  children,
} from "@nozbe/watermelondb/decorators"
import { Associations } from "@nozbe/watermelondb/Model"

import Prescription from "@/models/Prescription"

import database from ".."
import ClinicModel from "./Clinic"
import DrugCatalogueModel from "./DrugCatalogue"
import PatientModel from "./Patient"
import PrescriptionItemModel from "./PrescriptionItem"
import UserModel from "./User"

export default class PrescriptionModel extends Model {
  static table = "prescriptions"

  static associations: Associations = {
    patients: { type: "belongs_to", key: "patient_id" },
    users: { type: "belongs_to", key: "user_id" },
    clinics: { type: "belongs_to", key: "pickup_clinic_id" },
    prescription_items: { type: "has_many", foreignKey: "prescription_id" },
  }

  @text("patient_id") patientId!: string
  @text("provider_id") providerId!: string
  @text("filled_by") filledBy?: string | null
  @text("pickup_clinic_id") pickupClinicId?: string | null
  @text("visit_id") visitId?: string | null
  @text("priority") priority!: Prescription.Priority
  @text("status") status!: Prescription.Status
  @json("items", sanitizeItems) items!: Prescription.Item[]
  @text("notes") notes!: string

  @date("expiration_date") expirationDate!: Date
  @date("prescribed_at") prescribedAt!: Date
  @date("filled_at") filledAt?: Date | null

  @json("metadata", sanitizeMetadata) metadata!: Record<string, any>
  @field("is_deleted") isDeleted!: boolean
  @date("deleted_at") deletedAt?: Date
  @readonly @date("created_at") createdAt!: Date
  @readonly @date("updated_at") updatedAt!: Date

  @immutableRelation("patients", "patient_id") patient!: PatientModel
  @immutableRelation("users", "user_id") user!: UserModel
  @relation("clinics", "pickup_clinic_id") pickupClinic!: ClinicModel
  @children("prescription_items")
  prescriptionItems!: PrescriptionItemModel[]

  @lazy
  drugs = this.collections
    .get<DrugCatalogueModel>("drug_catalogue")
    .query(Q.on("prescription_items", "prescription_id", this.id))

  // @lazy
  // getDrugs(): DrugCatalogueModel[] {
  //   database
  //     .get<DrugCatalogueModel>("drug_catalogue")
  //     .query(Q.on("prescription_items", "prescription_id", this.id))
  //     .fetch()
  // }
}

function sanitizeMetadata(metadata: Record<string, any>) {
  return JSON.stringify(metadata)
}

function sanitizeItems(items: Prescription.Item[]) {
  return Array.isArray(items) ? items.filter(isValidPrescriptionItem) : []
}

/**
 * Validates if an object is a valid PrescriptionItem.
 *
 * @param {any} item - The object to be validated as a PrescriptionItem.
 * @returns {boolean} True if the item is a valid PrescriptionItem, false otherwise.
 *
 * @description
 * This function checks if the given item has all the required fields of a PrescriptionItem
 * and if they are of the correct type. The required fields are:
 * - name (string)
 * - dosage (string)
 * - frequency (string)
 * - duration (string)
 * - route (string)
 * - status (string)
 *
 * It also checks for the optional 'notes' field, which should be a string if present.
 */

function isValidPrescriptionItem(item: Prescription.Item): boolean {
  if (typeof item !== "object" || item === null) {
    return false
  }

  const requiredFields = [
    "name",
    "dose",
    "doseUnits",
    "frequency",
    "duration",
    "durationUnits",
    "route",
    "form",
    "status",
    "priority",
  ] as (keyof Prescription.Item)[]
  for (const field of requiredFields) {
    if (!(field in item)) {
      return false
    }
  }

  // Check types for specific fields
  if (
    typeof item.name !== "string" ||
    typeof item.route !== "string" ||
    typeof item.form !== "string" ||
    typeof item.status !== "string" ||
    typeof item.priority !== "string"
  ) {
    return false
  }

  // Check numeric fields
  const isNumeric = (value: any) => !isNaN(Number(value))
  if (!isNumeric(item.dose) || !isNumeric(item.duration) || !isNumeric(item.quantity)) {
    return false
  }

  // Check optional fields
  if (item.filledAt !== null && !(item.filledAt instanceof Date)) {
    return false
  }

  if (item.filledByUserId !== null && typeof item.filledByUserId !== "string") {
    return false
  }

  if ("notes" in item && typeof item.notes !== "string") {
    return false
  }

  return true
}
