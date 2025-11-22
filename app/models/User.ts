import * as SecureStorage from "expo-secure-store"
import { Option } from "effect"

import { providerStore } from "@/store/provider"
import { getHHApiUrl } from "@/utils/storage"
import UserClinicPermissions from "./UserClinicPermissions"
import database from "@/db"
import UserModel from "@/db/model/User"
import { Q } from "@nozbe/watermelondb"

namespace User {
  export const Roles = {
    ADMIN: "admin",
    PROVIDER: "provider",
  }
  export type Role = (typeof Roles)[keyof typeof Roles]
  export type T = {
    id: string
    name: string
    email: string
    role: Option.Option<Role>
    isDeleted: boolean
    createdAt: Date
    updatedAt: Date
    deletedAt: Option.Option<Date>
  }

  export type Provider = {
    id: string
    name: string
    email: string
    role: Option.Option<Role>
    instance_url: Option.Option<string>
    clinic_id: Option.Option<string>
    clinic_name: Option.Option<string>
    permissions: Option.Option<
      Pick<
        UserClinicPermissions.T,
        | "canRegisterPatients"
        | "canViewHistory"
        | "canEditRecords"
        | "canDeleteRecords"
        | "isClinicAdmin"
      >
    >
  }

  /** Default empty User Item */
  export const empty: T = {
    id: "",
    name: "",
    email: "",
    role: Option.none(),
    isDeleted: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: Option.none(),
  }

  /**
   * Sign into the application as a provider or admin
   * @param email - The email of the provider or admin
   * @param password - The password of the provider or admin
   * @returns A promise that resolves to the provider or admin
   */
  export const signIn = async (email: string, password: string): Promise<Provider> => {
    const HIKMA_API = await getHHApiUrl()
    if (Option.isNone(HIKMA_API)) {
      throw new Error("Invalid API URL")
    }

    if (email.length < 4 || password.length < 4) {
      throw new Error("Invalid email or password")
    }

    try {
      const response = await fetch(`${HIKMA_API.value}/api/login`, {
        method: "POST",
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      })

      const result = await response.json()

      // console.log("Response:", response)
      console.log("Result:", result)

      if (response.status === 200 && result.message === undefined) {
        // Store credentials securely
        await SecureStorage.setItemAsync("provider_password", password)
        await SecureStorage.setItemAsync("provider_email", email)

        // update the provider store
        providerStore.send({
          type: "set_provider",
          id: result.id,
          name: result.name,
          email: result.email,
          role: Option.fromNullable(result.role),
          instance_url: Option.fromNullable(result.instance_url),
          clinic_id: Option.fromNullable(result.clinic_id),
          clinic_name: Option.fromNullable(result.clinic_name),
        })

        // Return the user data
        return {
          id: result.id,
          name: result.name,
          email: result.email,
          role: Option.fromNullable(result.role),
          instance_url: Option.fromNullable(result.instance_url),
          clinic_id: Option.fromNullable(result.clinic_id),
          clinic_name: Option.fromNullable(result.clinic_name),
        }
      } else {
        throw new Error("Invalid credentials")
      }
    } catch (e) {
      console.error(e)
      throw e
    }
  }

  export namespace DB {
    /**
     * Given a user id, return the user data
     * @param {string} id
     * @returns {Promise<UserModel>}
     */
    export async function getById(id: string): Promise<UserModel> {
      const user = await database.get<UserModel>("users").find(id)
      if (!user) throw new Error("User not found")
      return user
    }
  }
}

export default User
