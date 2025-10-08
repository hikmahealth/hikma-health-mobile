import * as SecureStorage from "expo-secure-store"
import { createStore } from "@xstate/store"
import { Option } from "effect"

import User from "@/models/User"
import UserClinicPermissions from "@/models/UserClinicPermissions"

export const providerStore = createStore({
  context: {
    id: "",
    name: "",
    email: "",
    role: Option.none<User.Role>(),
    instance_url: Option.none<string>(),
    clinic_id: Option.none<string>(),
    clinic_name: Option.none<string>(),
    // Permissions
    permissions:
      Option.none<
        Pick<
          UserClinicPermissions.T,
          | "canRegisterPatients"
          | "canViewHistory"
          | "canEditRecords"
          | "canDeleteRecords"
          | "isClinicAdmin"
        >
      >(),
  },
  emits: {
    provider_changed: (payload: User.Provider) => {
      const toStore = {
        ...payload,
        role: Option.getOrNull(payload.role),
        instance_url: Option.getOrNull(payload.instance_url),
        clinic_id: Option.getOrNull(payload.clinic_id),
        clinic_name: Option.getOrNull(payload.clinic_name),
        // TODO: get the permissions
        permissions:
          payload.permissions &&
          Option.isOption(payload.permissions) &&
          Option.getOrNull(payload.permissions),
      }
      return SecureStorage.setItemAsync("providerStore", JSON.stringify(toStore))
    },
  },
  on: {
    reset: (context, _, enque) => {
      const payload = {
        id: "",
        name: "",
        email: "",
        role: Option.none<User.Role>(),
        instance_url: Option.none<string>(),
        clinic_id: Option.none<string>(),
        clinic_name: Option.none<string>(),
        permissions: Option.none<UserClinicPermissions.T>(),
      }
      enque.emit.provider_changed(payload)
      return {
        ...payload,
      }
    },

    set_provider: (context, event: User.Provider, enque) => {
      console.log("Setting provider:", JSON.stringify(event, null, 2))
      enque.emit.provider_changed(event)
      return {
        id: event.id,
        name: event.name,
        email: event.email,
        role: event.role,
        instance_url: event.instance_url,
        clinic_id: event.clinic_id,
        clinic_name: event.clinic_name,
        permissions: Option.none<UserClinicPermissions.T>(),
      }
    },
  },
})
