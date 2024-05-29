import { Model } from "@nozbe/watermelondb"
import { Associations } from "@nozbe/watermelondb/Model"
import { field, text, date, readonly, children, json } from "@nozbe/watermelondb/decorators"
import VisitModel from "./Visit"

export default class PatientModel extends Model {
  static table = "patients"

  static associations: Associations = {
    visits: { type: "has_many", foreignKey: "patient_id" },
  }

  // @text('id') id;
  @text("given_name") givenName!: string
  @text("surname") surname!: string
  @text("date_of_birth") dateOfBirth!: string
  @text("citizenship") citizenship!: string
  @text("hometown") hometown!: string
  @text("phone") phone!: string
  @text("sex") sex!: string
  @text("camp") camp!: string
  @text("photo_url") photoUrl!: string

  // V2 Added
  @text("government_id") governmentId!: string
  @text("external_patient_id") externalPatientId!: string
  // !V2 Added

  /** Additional data stores all the extra dynamic fields that are stored on the database */
  @json("additional_data", sanitizeAdditionalData) additionalData!: Record<string, any>
  @json("metadata", sanitizeMetadata) metadata!: Record<string, any>

  @field("is_deleted") isDeleted!: boolean
  @date("deleted_at") deletedAt!: Date
  @readonly @date("created_at") createdAt!: Date
  @readonly @date("updated_at") updatedAt!: Date

  /** Lazily loaded patient visits list */
  @children("visits") visits!: VisitModel[]
}

/**
 * Patient model fields that are stored & accessible by the app
 */
export type PatientModelData = {
  givenName: string
  surname: string
  dateOfBirth: string
  citizenship: string
  hometown: string
  phone: string
  sex: string
  camp: string
  photoUrl: string
  governmentId: string
  externalPatientId: string
  additionalData: Record<string, any>
  metadata: Record<string, any>
  isDeleted: boolean
  createdAt: Date
  updatedAt: Date
}

export const defaultPatient: PatientModel = {
  id: Math.random().toString(),
  givenName: "John",
  surname: "Doe",
  dateOfBirth: "1990-01-01",
  citizenship: "",
  hometown: "",
  phone: "",
  sex: "male",
  camp: "",
  photoUrl: "",
  governmentId: "",
  externalPatientId: "",
  additionalData: {},
  metadata: {},
  // deletedAt: new Date(),
  isDeleted: false,
  createdAt: new Date(),
  updatedAt: new Date(),
} as PatientModel

function sanitizeMetadata(data: any) {
  if (data) {
    return data
  } else {
    return {}
  }
}
function sanitizeAdditionalData(data: any) {
  if (data) {
    return data
  } else {
    return {}
  }
}
