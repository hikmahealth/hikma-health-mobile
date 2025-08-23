import { Model } from "@nozbe/watermelondb"
import { date, readonly, field, text } from "@nozbe/watermelondb/decorators"

export default class ClinicModel extends Model {
  static table = "clinics"

  @text("name") name!: string
  @field("is_deleted") isDeleted!: boolean
  @date("deleted_at") deletedAt!: Date
  @readonly @date("created_at") createdAt!: Date
  @readonly @date("updated_at") updatedAt!: Date
}
