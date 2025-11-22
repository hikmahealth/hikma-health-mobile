import { Model, Q } from "@nozbe/watermelondb"
import { date, readonly, field, text, children } from "@nozbe/watermelondb/decorators"
import { Associations } from "@nozbe/watermelondb/Model"

import ClinicDepartmentModel from "./ClinicDepartment"

export default class ClinicModel extends Model {
  static table = "clinics"
  static associations: Associations = {
    clinic_departments: { type: "has_many", foreignKey: "clinic_id" },
  }

  @text("name") name!: string
  @field("is_deleted") isDeleted!: boolean
  @date("deleted_at") deletedAt!: Date

  // --- Timestamps (Read-only) ---
  @readonly @date("created_at") createdAt!: Date
  @readonly @date("updated_at") updatedAt!: Date

  @readonly @field("is_archived") isArchived!: boolean

  @children("clinic_departments") departments!: ClinicDepartmentModel[]
  // @lazy
  // departments = this.collections
  //   .get("clinic_departments")
  //   .query(Q.on("clinic_departments", "clinic_id", this.id))
}
