import { Model } from "@nozbe/watermelondb"
import { field, text, date, readonly, json, relation } from "@nozbe/watermelondb/decorators"
import { Associations } from "@nozbe/watermelondb/Model"

import Patient from "./Patient"
import User from "./User"
import Visit from "./Visit"

export default class PatientVitals extends Model {
  static table = "patient_vitals"

  static associations: Associations = {
    patients: { type: "belongs_to", key: "patient_id" },
    visits: { type: "belongs_to", key: "visit_id" },
    users: { type: "belongs_to", key: "recorded_by_user_id" },
  }

  // --- Vital Sign Fields ---
  @text("patient_id") patientId!: string
  @text("visit_id") visitId?: string
  @text("recorded_by_user_id") recordedByUserId!: string
  @date("timestamp") timestamp!: Date
  @field("systolic_bp") systolicBp?: number
  @field("diastolic_bp") diastolicBp?: number
  @text("bp_position") bpPosition?: string
  @field("height_cm") heightCm?: number
  @field("weight_kg") weightKg?: number
  @field("bmi") bmi?: number
  @field("waist_circumference_cm") waistCircumferenceCm?: number
  @field("heart_rate") heartRate?: number
  @field("pulse_rate") pulseRate?: number
  @field("oxygen_saturation") oxygenSaturation?: number
  @field("respiratory_rate") respiratoryRate?: number
  @field("temperature_celsius") temperatureCelsius?: number
  @field("pain_level") painLevel?: number

  // --- Metadata & Flags ---
  // The 'json' decorator requires a sanitizer function.
  // This simple one returns the value as is.
  @json("metadata", sanitizeMetadata) metadata!: Record<string, any>
  @field("is_deleted") isDeleted!: boolean

  // --- Timestamps (Read-only) ---
  @readonly @date("created_at") createdAt!: Date
  @readonly @date("updated_at") updatedAt!: Date
  @readonly @date("deleted_at") deletedAt!: Date | null

  // --- Relations ---
  @relation("patients", "patient_id") patient!: Patient
  @relation("visits", "visit_id") visit!: Visit
  @relation("users", "recorded_by_user_id") recordedByUser!: User
}

function sanitizeMetadata(data: any) {
  if (data) {
    return data
  } else {
    return {}
  }
}
