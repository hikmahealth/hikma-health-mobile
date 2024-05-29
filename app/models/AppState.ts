import { Instance, SnapshotIn, SnapshotOut, types } from "mobx-state-tree"
import { withSetPropAction } from "./helpers/withSetPropAction"

const LOCK_TIMEOUT = 1000 * 60 * 5 // 5 minutes

/**
 * The app state model keeping track of the app state
 */
export const AppStateModel = types
  .model("AppState")
  .props({
    notificationsEnabled: types.optional(types.boolean, true),
    lockWhenIdle: types.optional(types.boolean, false),
    lastActiveTime: types.maybeNull(types.number),
    // hersEnabled: types.optional(types.boolean, false),
    hersEnabled: false,
  })
  .actions(withSetPropAction)
  .views((self) => ({
    // Check whether or not the app should be locked if the lastActiveTime is older than LOCK_TIMEOUT
    get isLocked() {
      // return self.lockWhenIdle && (new Date().getTime() - self.lastActiveTime) > LOCK_TIMEOUT
      if (self.lockWhenIdle && self.lastActiveTime) {
        return new Date().getTime() - self.lastActiveTime > LOCK_TIMEOUT
      }
      return false
    },
  }))
  .actions((self) => ({}))

export interface AppState extends Instance<typeof AppStateModel> {}
export interface AppStateSnapshotOut extends SnapshotOut<typeof AppStateModel> {}
export interface AppStateSnapshotIn extends SnapshotIn<typeof AppStateModel> {}
export const createAppStateDefaultModel = () => types.optional(AppStateModel, {})
