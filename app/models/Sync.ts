import { Instance, SnapshotIn, SnapshotOut, types } from "mobx-state-tree"
import { withSetPropAction } from "./helpers/withSetPropAction"

type SyncState = "idle" | "fetching" | "resolving" | "pushing" | "error"
const syncStates = ["idle", "fetching", "resolving", "pushing", "error"] as const

/**
 * Values keeping track of how many records were fetched vs pushed and resolved
 */
type SyncStats = {
  fetched: number
  pushed: number
}

const SyncStatsModel = types.model("SyncStats").props({
  fetched: types.optional(types.number, 0),
  pushed: types.optional(types.number, 0),
})

/**
 * The sync model keeping track of the sync state and stats
 */
export const SyncModel = types
  .model("Sync")
  .props({
    state: types.optional(types.enumeration(syncStates), "idle"),
    stats: types.optional(SyncStatsModel, {
      fetched: 0,
      pushed: 0,
    }),
    error: types.maybeNull(types.string),
  })
  .actions(withSetPropAction)
  .views((self) => ({})) // eslint-disable-line @typescript-eslint/no-unused-vars
  .actions((self) => ({
    /** Start the sync process */
    startSync() {
      if (self.state !== "idle") {
        console.error("Sync is already in progress")
        return;
      }
      self.setProp("state", "fetching")
    },

    /** 
     * Start conflict resolution 
     * Accepts the number of records that were fetched
     * @param {number} fetched
    */
    startResolve(fetched: number) {
      if (self.state !== "fetching") {
        console.error("Sync is not in fetching state")
        return;
      }
      self.setProp("state", "resolving")
      self.setProp("stats", { fetched, pushed: 0 })
    },

    /** 
     * Start pushing changes
     * Accepts the number of records that are going to be pushed
     * @param {number} pushed
    */
    startPush(pushed: number) {
      if (self.state !== "resolving") {
        console.error("Sync is not in resolving state")
        return;
      }
      self.setProp("state", "pushing")
      self.setProp("stats", { fetched: 0, pushed })
    },

    /** Finish the sync process */
    finishSync() {
      if (self.state !== "pushing" && self.state !== "resolving") {
        console.error("Sync is not in pushing state")
        return;
      }
      self.setProp("state", "idle")
      self.setProp("stats", { fetched: 0, pushed: 0 })
    },

    /** 
     * Error occured 
     * Accepts the error message
     * @param {string} error
     * */
    errorSync(error: string) {
      self.setProp("state", "error")
      self.setProp("error", error)
    },

    /** Clear the error state (reset the error) */
    clearError() {
      if (self.state !== "error") {
        console.error("Sync is not in error state")
        return;
      }
      self.setProp("state", "idle")
      self.setProp("error", null)
    },
  }))

export interface Sync extends Instance<typeof SyncModel> { }
export interface SyncSnapshotOut extends SnapshotOut<typeof SyncModel> { }
export interface SyncSnapshotIn extends SnapshotIn<typeof SyncModel> { }
export const createSyncDefaultModel = () => types.optional(SyncModel, {})
