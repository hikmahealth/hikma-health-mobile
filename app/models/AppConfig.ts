import { Option } from "effect"

import AppConfigModel from "@/db/model/AppConfig"
import database from "@/db"
import { Q } from "@nozbe/watermelondb"

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

  export type EncodedT = {
    id: string
    namespace: string
    key: string
    value: string
    dataType: string
    displayName: string | null
    lastModifiedBy: string | null
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
  export type DataType = "string" | "number" | "boolean" | "json" | "array"

  /** Common configuration namespaces */
  export const Namespaces = {
    UI: "ui",
    SYNC: "sync",
    FEATURE_FLAGS: "feature_flags",
    SYSTEM: "system",
    CLINIC: "clinic",
    ORGANIZATION: "organization",
    AUTH: "auth",
  } as const

  export type Namespace = (typeof Namespaces)[keyof typeof Namespaces]

  export namespace DB {
    export type T = AppConfigModel

    /**
     * Given a namespace and key, retrieve the configuration value
     * @param {Namespace} namespace - The namespace of the configuration
     * @param {string} key - The key of the configuration
     * @returns {Promise<string | number | boolean | object | Array<any> | null>} - The configuration value
     */
    export const getValue = async (
      namespace: Namespace,
      key: string,
    ): Promise<string | number | boolean | object | Array<any> | null> => {
      const res = await database
        .get<AppConfigModel>("app_config")
        .query(Q.where("namespace", namespace), Q.where("key", key), Q.take(1))
        .fetch()

      await database
        .get<AppConfigModel>("app_config")
        .query()
        .fetchCount()
        .then((count) => {
          console.log({ count })
        })
      console.log({ res, namespace, key })

      if (res.length === 0) {
        return null
      }
      const config = res[0]
      if (!config) {
        return null
      }
      console.log({ config })
      return Utils.parseValue(config) || null
    }
  }

  /**
   * Utility functions for working with typed configuration values
   */
  export namespace Utils {
    /**
     * Parse a configuration value based on its data type
     * @param {AppConfig.EncodedT} config - The configuration entry
     * @returns {any} - The parsed value
     */
    export const parseValue = (config: AppConfig.EncodedT): any => {
      if (config.value === null) return null

      switch (config.dataType) {
        case "string":
          return String(config.value).replace(/"/g, "")
        case "number":
          return parseFloat(config.value)
        case "boolean":
          return config.value.toLowerCase() === "true"
        case "json":
          try {
            return JSON.parse(config.value)
          } catch {
            return null
          }
        case "array":
          try {
            const parsed = JSON.parse(config.value)
            return Array.isArray(parsed) ? parsed : []
          } catch {
            return []
          }
        default:
          return config.value
      }
    }

    /**
     * Serialize a value for storage
     * @param {any} value - The value to serialize
     * @param {AppConfig.DataType} dataType - The target data type
     * @returns {string | null} - The serialized value
     */
    export const serializeValue = (value: any, dataType: AppConfig.DataType): string | null => {
      if (value === null || value === undefined) return null

      switch (dataType) {
        case "string":
          return String(value)
        case "number":
          return String(value)
        case "boolean":
          return String(Boolean(value))
        case "json":
        case "array":
          return JSON.stringify(value)
        default:
          return String(value)
      }
    }

    /**
     * Given a Config object, and a key of interest, return the value or null
     * @param {AppConfig.EncodedT} config - The Config object
     * @param {AppConfig.Namespace} namespace - The namespace of interest
     * @param {string} key - The key of interest
     * @returns {T | null} - The value or null
     */
    export const getValue = <T>(
      config: AppConfig.EncodedT[],
      namespace: AppConfig.Namespace,
      key: string,
    ): T | null => {
      const item = config.find((item) => item.namespace === namespace && item.key === key)
      if (!item) return null

      return parseValue(item)
    }
  }
}

export default AppConfig
