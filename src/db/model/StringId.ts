import { Model } from "@nozbe/watermelondb"
import { Associations } from "@nozbe/watermelondb/Model"

export default class StringIdModel extends Model {
  static table = "string_ids"
  static association: Associations = {
    string_content: { type: "has_many", foreignKey: "string_id" },
  }
}
