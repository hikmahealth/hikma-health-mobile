import { Instance, SnapshotOut, types } from "mobx-state-tree"
import { LanguageModel } from "./Language"
import { ProviderModel } from "./Provider"
import { SyncModel } from "./Sync"
import { AppStateModel } from "./AppState"

/**
 * A RootStore model.
 */
export const RootStoreModel = types.model("RootStore").props({
  language: types.optional(LanguageModel, { current: "en-US", isRTL: false }),
  provider: types.optional(ProviderModel, {
    id: "",
    name: "",
    role: "",
    email: "",
    instance_url: "",
    phone: "",

    clinic_id: "",
    clinic_name: "",
  }),
  sync: types.optional(SyncModel, {
    state: "idle",
    stats: {
      fetched: 0,
      pushed: 0,
    },
    error: null,
  }),
  appState: types.optional(AppStateModel, {
    notificationsEnabled: false,
    lockWhenIdle: false,
    hersEnabled: false, // health enviromnet record system
  })
})



/**
 * The RootStore instance.
 */
export interface RootStore extends Instance<typeof RootStoreModel> { }
/**
 * The data of a RootStore.
 */
export interface RootStoreSnapshot extends SnapshotOut<typeof RootStoreModel> { }
