import { Option } from "effect"

namespace AppConfig {
  export type T = {
    id: string
    namespace: string
    key: string
    value: string
    dataType: string
    displayName: Option.Option<string>
    lastModifiedBy: Option.Option<string>
    createdAt: Date
    updatedAt: Date
    lastModified: Date
  }

  /** Default empty AppConfig Item */
  export const empty: T = {
    id: "",
    namespace: "",
    key: "",
    value: "",
    dataType: "string",
    displayName: Option.none(),
    lastModifiedBy: Option.none(),
    createdAt: new Date(),
    updatedAt: new Date(),
    lastModified: new Date(),
  }

  /** Common data types for configuration values */
  export type DataType = "string" | "number" | "boolean" | "json"

  /** Parse the value based on its data type */
  export const parseValue = (value: string, dataType: string): any => {
    switch (dataType) {
      case "number":
        return Number(value)
      case "boolean":
        return value === "true"
      case "json":
        try {
          return JSON.parse(value)
        } catch {
          return {}
        }
      case "string":
      default:
        return value
    }
  }

  /** Serialize a value to string for storage */
  export const serializeValue = (value: any, dataType: string): string => {
    switch (dataType) {
      case "json":
        return JSON.stringify(value)
      case "boolean":
        return value ? "true" : "false"
      case "number":
      case "string":
      default:
        return String(value)
    }
  }

  /** Common configuration namespaces */
  export const Namespaces = {
    UI: "ui",
    SYNC: "sync",
    FEATURE_FLAGS: "feature_flags",
    SYSTEM: "system",
    CLINIC: "clinic",
  } as const

  export type Namespace = (typeof Namespaces)[keyof typeof Namespaces]
}

export default AppConfig
