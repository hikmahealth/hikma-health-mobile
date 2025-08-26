import { Model } from "@nozbe/watermelondb"
import { field, text, date, relation, readonly, json } from "@nozbe/watermelondb/decorators"

import { sanitizeMetadata } from "@/utils/db"

import Patient from "./Patient" // Assuming you have a Patient model
import User from "./User" // Assuming you have a User model
import Visit from "./Visit" // Assuming you have a Visit model

/**
 * PatientProblem Model
 *
 * This model represents a single health problem or diagnosis for a patient.
 * It includes details about the problem, its status, severity, and timeline.
 */
export default class PatientProblem extends Model {
  // The name of the table in the database schema
  static table = "patient_problems"

  // Defines the relationships to other models
  static associations = {
    patients: { type: "belongs_to" as const, key: "patient_id" },
    visits: { type: "belongs_to" as const, key: "visit_id" },
    users: { type: "belongs_to" as const, key: "recorded_by_user_id" },
  }

  @text("patient_id") patientId!: string
  @text("visit_id") visitId?: string
  @text("recorded_by_user_id") recordedByUserId!: string

  // --- Problem Details ---
  @text("problem_code_system") problemCodeSystem!: string // e.g., 'icd10cm'
  @text("problem_code") problemCode!: string // e.g., 'E11.9'
  @text("problem_label") problemLabel!: string // e.g., 'Type 2 diabetes mellitus without complications'
  @text("clinical_status") clinicalStatus!: "active" | "remission" | "resolved" | "unknown"
  @text("verification_status") verificationStatus!:
    | "provisional"
    | "confirmed"
    | "refuted"
    | "unconfirmed"
  @field("severity_score") severityScore?: number

  // --- Timeline ---
  @date("onset_date") onsetDate?: Date
  @date("end_date") endDate?: Date

  // --- Metadata & Flags ---
  // The 'json' decorator requires a sanitizer function. This one returns the value as is.
  @json("metadata", sanitizeMetadata) metadata!: any
  @field("is_deleted") isDeleted!: boolean

  // --- Timestamps (Read-only) ---
  @readonly @date("created_at") createdAt!: Date
  @readonly @date("updated_at") updatedAt!: Date
  @readonly @date("deleted_at") deletedAt?: Date

  // --- Relations ---
  @relation("patients", "patient_id") patient!: Patient
  @relation("visits", "visit_id") visit?: Visit
  @relation("users", "recorded_by_user_id") recordedByUser?: User
}
