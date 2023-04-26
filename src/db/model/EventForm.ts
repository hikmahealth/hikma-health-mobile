import { Model } from "@nozbe/watermelondb"
import {
  field,
  text,
  immutableRelation,
  date,
  readonly,
  writer,
} from "@nozbe/watermelondb/decorators"


export default class EventFormModel extends Model {
    static table = "event_forms"

    @text("name") name
    @text("description") description
    @text("metadata") metadata
    @field("is_deleted") isDeleted
    @readonly @date("created_at") createdAt
    @readonly @date("updated_at") updatedAt
}
