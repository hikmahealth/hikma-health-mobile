import { Model } from "@nozbe/watermelondb"
import { date, readonly, field, text, json, immutableRelation, relation } from "@nozbe/watermelondb/decorators"
import PatientModel from "./Patient"
import UserModel from "./User"
import { Associations } from "@nozbe/watermelondb/Model"
import { PrescriptionItem, statusValues, priorityValues } from "../../types"
import ClinicModel from "./Clinic"


export type PrescriptionStatus = (typeof statusValues)[number]
export type PrescriptionPriority = (typeof priorityValues)[number]

export default class PrescriptionModel extends Model {
  static table = "prescriptions"

  static associations: Associations = {
    patients: { type: 'belongs_to', key: 'patient_id' },
    users: { type: 'belongs_to', key: 'user_id' },
    clinics: { type: 'belongs_to', key: 'pickup_clinic_id' },
  }

  @text("patient_id") patientId!: string
  @text("provider_id") providerId!: string
  @text("filled_by") filledBy?: string | null
  @text("pickup_clinic_id") pickupClinicId?: string | null
  @text("visit_id") visitId?: string | null
  @text("priority") priority!: PrescriptionPriority
  @text("status") status!: PrescriptionStatus
  @json("items", sanitizeItems) items!: PrescriptionItem[]
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
}


function sanitizeMetadata(metadata: Record<string, any>) {
  return JSON.stringify(metadata)
}

function sanitizeItems(items: PrescriptionItem[]) {
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


function isValidPrescriptionItem(item: PrescriptionItem): boolean {
  if (typeof item !== 'object' || item === null) {
    return false
  }

  const requiredFields = ['name', 'dose', 'doseUnits', 'frequency', 'duration', 'durationUnits', 'route', 'form', 'status', 'priority'] as (keyof PrescriptionItem)[]
  for (const field of requiredFields) {
    if (!(field in item)) {
      return false
    }
  }

  // Check types for specific fields
  if (typeof item.name !== 'string' || typeof item.route !== 'string' ||
    typeof item.form !== 'string' || typeof item.status !== 'string' ||
    typeof item.priority !== 'string') {
    return false
  }

  // Check numeric fields
  const isNumeric = (value: any) => !isNaN(Number(value));
  if (!isNumeric(item.dose) || !isNumeric(item.duration) || !isNumeric(item.quantity)) {
    return false;
  }

  // Check optional fields
  if (item.filledAt !== null && !(item.filledAt instanceof Date)) {
    return false
  }

  if (item.filledByUserId !== null && typeof item.filledByUserId !== 'string') {
    return false
  }

  if ('notes' in item && typeof item.notes !== 'string') {
    return false
  }

  return true
}


