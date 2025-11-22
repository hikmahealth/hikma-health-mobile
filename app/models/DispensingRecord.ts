import { Model, Q } from "@nozbe/watermelondb"
import { Option, Schema } from "effect"

import database from "@/db"
import ClinicInventoryModel from "@/db/model/ClinicInventory"
import ClinicDepartmentModel from "@/db/model/ClinicDepartment"
import PatientModel from "@/db/model/Patient"
import PrescriptionItemModel from "@/db/model/PrescriptionItem"
import DispensingRecordModel from "@/db/model/DispensingRecord"

// methods for updating dispensing records

namespace DispensingRecord {}

export default DispensingRecord
