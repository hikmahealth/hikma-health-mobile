import * as SecureStorage from "expo-secure-store"
import { Option } from "effect"

import Peer from "@/models/Peer"
import { providerStore } from "@/store/provider"
import UserClinicPermissions from "./UserClinicPermissions"
import database from "@/db"
import UserModel from "@/db/model/User"
import { Q } from "@nozbe/watermelondb"
import { LoginResponse } from "@/rpc/types"

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
    const HIKMA_API = await Peer.getActiveUrl()
    if (!HIKMA_API) {
      throw new Error("Invalid API URL")
    }

    if (email.length < 4 || password.length < 4) {
      throw new Error("Invalid email or password")
    }

    try {
      const response = await fetch(`${HIKMA_API}/api/login`, {
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
        // Store credentials securely (for offline sync + fallback)
        await SecureStorage.setItemAsync("provider_password", password)
        await SecureStorage.setItemAsync("provider_email", email)

        // Obtain Bearer token for online mode tRPC calls
        try {
          const tokenResponse = await fetch(`${HIKMA_API}/api/auth/sign-in`, {
            method: "POST",
            headers: { "Accept": "application/json", "Content-Type": "application/json" },
            body: JSON.stringify({ email, password }),
          })
          const tokenResult = await tokenResponse.json()
          if (tokenResponse.ok && tokenResult.token) {
            await SecureStorage.setItemAsync("provider_token", tokenResult.token)
            console.log("[User.signIn] Bearer token stored")
          } else {
            console.warn("[User.signIn] No token in response — online tRPC writes may not work")
          }
        } catch (e) {
          console.warn("[User.signIn] Failed to obtain Bearer token:", e)
        }

        // update the provider store
        console.log("🚩🚩 Set from Cloud Login")
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

  /**
   * Set user from a hub login response (no HTTP calls — hub already authenticated).
   * Stores credentials and token, updates providerStore.
   */
  export const setFromHubLogin = async (
    response: LoginResponse,
    email: string,
    password: string,
  ): Promise<Provider> => {
    // Store credentials for session restore
    await SecureStorage.setItemAsync("provider_email", email)
    await SecureStorage.setItemAsync("provider_password", password)
    await SecureStorage.setItemAsync("provider_token", response.token)

    const provider: Provider = {
      id: response.user_id,
      name: response.provider_name ?? "",
      email: response.email ?? email,
      role: Option.fromNullable(response.role as Role),
      instance_url: Option.none(),
      clinic_id: Option.fromNullable(response.clinic_id),
      clinic_name: Option.none(),
    }

    console.log("🚩🚩 Set from Hub Login")
    console.log({ provider })

    providerStore.send({ type: "set_provider", ...provider })
    return provider
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
