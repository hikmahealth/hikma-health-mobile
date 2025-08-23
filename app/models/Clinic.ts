import { Option } from "effect"

namespace Clinic {
  export type T = {
    id: string
    name: string
    isDeleted: boolean
    createdAt: Date
    updatedAt: Date
    deletedAt: Option.Option<Date>
  }

  /** Default empty Clinic Item */
  export const empty: T = {
    id: "",
    name: "",
    isDeleted: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: Option.none(),
  }
}

export default Clinic
