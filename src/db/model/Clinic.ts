import { Model } from "@nozbe/watermelondb"
import { date, readonly, field, text } from "@nozbe/watermelondb/decorators"
import { Associations } from "@nozbe/watermelondb/Model"

export default class ClinicModel extends Model {
  static table = "clinics"

  @text("name") name
  @field("is_deleted") isDeleted
  @date("deleted_at") deletedAt
  @readonly @date("created_at") createdAt
  @readonly @date("updated_at") updatedAt
}
