import { Model } from "@nozbe/watermelondb"
import { Associations } from "@nozbe/watermelondb/Model"
import {
  field,
  text,
  date,
  readonly,
  json,
  immutableRelation,
} from "@nozbe/watermelondb/decorators"
import { Appointment, AppointmentStatus } from "app/types"
import PatientModel from "./Patient"
import ClinicModel from "./Clinic"
import UserModel from "./User"
import VisitModel from "./Visit"


export default class AppointmentModel extends Model {
  static table = "appointments"

  static associations: Associations = {
    patients: { type: "belongs_to", key: "patient_id" },
    clinics: { type: "belongs_to", key: "clinic_id" },
    providers: { type: "belongs_to", key: "provider_id" },
    visits: { type: "belongs_to", key: "visit_id" },
  }

  @text("provider_id") providerId!: string | null
  @text("clinic_id") clinicId!: string
  @text("patient_id") patientId!: string
  @text("user_id") userId!: string
  @text("current_visit_id") currentVisitId!: string
  @text("fulfilled_visit_id") fulfilledVisitId!: string | null
  @field("timestamp") timestamp!: number
  @field("duration") duration!: number | null // in minutes
  @text("reason") reason!: string
  @text("notes") notes!: string
  @text("status") status!: AppointmentStatus
  @json("metadata", sanitizeMetadata) metadata!: Record<string, any> & { colorTag?: string }
  @field("is_deleted") isDeleted!: boolean
  @date("deleted_at") deletedAt!: Date
  @readonly @date("created_at") createdAt!: Date
  @readonly @date("updated_at") updatedAt!: Date

  @immutableRelation("patients", "patient_id") patient?: PatientModel
  @immutableRelation("clinics", "clinic_id") clinic!: ClinicModel
  @immutableRelation("providers", "provider_id") provider!: UserModel
  @immutableRelation("visits", "current_visit_id") currentVisit!: VisitModel
  @immutableRelation("visits", "fulfilled_visit_id") fulfilledVisit!: VisitModel
}


/** Default empty Appointmet Item */
export const defaultAppointment: Appointment = {
  id: "",
  providerId: "",
  clinicId: "",
  patientId: "",
  userId: "",
  currentVisitId: "",
  fulfilledVisitId: "",
  timestamp: new Date(),
  duration: 0,
  reason: "",
  notes: "",
  status: "pending",
  metadata: {},
  isDeleted: false,
  deletedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
}



// The sanitizer might also receive null if the column is nullable, or undefined if the field doesn't contain valid JSON.
/**
Sanitize the raw data returned by a `JSON.parse()` operation over the stored "string" type

@param {null | undefined | object} data: null if the field is nullable, undefined if the JSON is invalid or the data object stored in its place
*/
function sanitizeMetadata(data: any) {
  if (data) {
    return data
  } else {
    return {}
  }
}
