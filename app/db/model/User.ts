import { Model } from "@nozbe/watermelondb"
import { Associations } from "@nozbe/watermelondb/Model"
import {
  field,
  text,
  date,
  readonly,
  json,
} from "@nozbe/watermelondb/decorators"


export default class UserModel extends Model {
  static table = "users"


  static associations: Associations = {
    clinic: { type: "belongs_to", key: "clinic_id" },
  }


  @text("clinic_id") clinicId!: string
  @text("name") name!: string
  @text("role") role!: string
  @text("email") email!: string
  @date("created_at") createdAt!: Date
  @date("updated_at") updatedAt!: Date
  @field("is_deleted") isDeleted!: boolean
  @date("deleted_at") deletedAt!: Date | null
}
