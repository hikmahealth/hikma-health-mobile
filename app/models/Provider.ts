import { Instance, SnapshotIn, SnapshotOut, types } from "mobx-state-tree"
import { withSetPropAction } from "./helpers/withSetPropAction"
import { api } from "app/services/api"

export const defaultProvider = {
  id: "",
  name: "",
  role: "",
  email: "",
  instance_url: "",
  phone: "",
  clinic_id: "0000",
  clinic_name: "",
}

/**
 * Model description here for TypeScript hints.
 */
export const ProviderModel = types
  .model("Provider")
  .props({
    id: types.optional(types.string, ""),
    name: types.optional(types.string, ""),
    role: types.optional(types.string, ""),
    email: types.optional(types.string, ""),
    instance_url: types.optional(types.string, ""),
    phone: types.optional(types.string, ""),
    clinic_id: types.optional(types.string, ""),
    clinic_name: types.optional(types.string, ""),
  })
  .actions(withSetPropAction)
  .views((self) => ({
    /** Is there a currently signed in user or not */
    get isSignedIn() {
      return self.id && !!self.id
    },

    get clinic() {
      return {
        id: self.clinic_id,
        name: self.clinic_name || "",
      }
    },

    /** The clinic the current provider is registered to */
    get dbClinic() {
      return api.getClinic(self.clinic_id)
        .then(clinicFromDb => ({
          id: self.clinic_id,
          name: clinicFromDb.name || "",
        }))
        .catch(error => {
          console.error(error)
          return {
            id: self.clinic_id,
            name: self.clinic_name || "",
          }
        })
    },

    /** Get the providers information */
    get provider() {
      return {
        id: self.id,
        name: self.name,
        role: self.role,
        email: self.email,
        phone: self.phone,
      }
    },
  }))
  .actions((self) => ({
    /** Set the provider details */
    setProvider(provider: Partial<Provider> & { id: string; name: string; email: string }) {
      self.id = provider.id || ""
      self.name = provider.name || ""
      self.role = provider.role || ""
      self.email = provider.email || ""
      self.instance_url = provider.instance_url || ""
      self.phone = provider.phone || ""
      self.clinic_id = provider.clinic_id || ""
      self.clinic_name = provider.clinic_name || ""
    },

    /** Specifically update the clinic details for the current provider */
    setClinic(clinic: { id: string; name: string }) {
      self.clinic_id = clinic.id || ""
      self.clinic_name = clinic.name || ""
    },

    /** Sign out and reset the Provider store */
    resetProvider() {
      self.id = ""
      self.name = ""
      self.role = ""
      self.email = ""
      self.instance_url = ""
      self.phone = ""
      self.clinic_id = ""
      self.clinic_name = ""
    },
  }))

export interface Provider extends Instance<typeof ProviderModel> { }
export interface ProviderSnapshotOut extends SnapshotOut<typeof ProviderModel> { }
export interface ProviderSnapshotIn extends SnapshotIn<typeof ProviderModel> { }
export const createProviderDefaultModel = () => types.optional(ProviderModel, {})
