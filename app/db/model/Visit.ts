import { Model } from "@nozbe/watermelondb"
import { Associations } from "@nozbe/watermelondb/Model"
import {
  field,
  text,
  immutableRelation,
  date,
  readonly,
  relation,
  writer,
  children,
  json,
} from "@nozbe/watermelondb/decorators"
import PatientModel from "./Patient"
import EventModel from "./Event"
import ClinicModel from "./Clinic"

type VisitMetadata = {
  // Add types for any metadata that gets attached to the visit
}

export default class VisitModel extends Model {
  static table = "visits"

  static associations: Associations = {
    patients: { type: "belongs_to", key: "patient_id" },
    clinics: { type: "belongs_to", key: "clinic_id" },
    events: { type: "has_many", foreignKey: "visit_id" },
  } as const

  @immutableRelation("patients", "patient_id") patient!: PatientModel
  @immutableRelation("clinics", "clinic_id") clinic!: ClinicModel
  @children("events") events!: EventModel[]
  // @relation("events", 'visitId') event

  @text("patient_id") patientId!: string
  @text("clinic_id") clinicId!: string
  @text("provider_id") providerId!: string
  @text("provider_name") providerName!: string
  @date("check_in_timestamp") checkInTimestamp!: Date
  @field("is_deleted") isDeleted!: boolean
  @date("deleted_at") deletedAt!: Date
  @json("metadata", sanitizeMetadata) metadata!: VisitMetadata | null | undefined
  @readonly @date("created_at") createdAt!: number | Date
  @readonly @date("updated_at") updatedAt!: number | Date
}

function sanitizeMetadata(data: any) {
  if (data) {
    return data
  }
  return {}
}
