import { assign, createMachine } from "xstate"

type SyncContext = {
  downloadedRecords: number
  uploadedRecords: number
}

export const syncMachine = createMachine(
  {
    id: "syncState",
    initial: "idle",
    predictableActionArguments: true,
    context: {
      downloadedRecords: 0,
      uploadedRecords: 0,
      errorMessage: undefined as unknown as string | string,
    } as SyncContext,
    schema: {
      events: {} as
        | { type: "FETCH" }
        | { type: "RESOLVE_CONFLICTS"; downloadedRecords: number }
        | { type: "COMPLETED"; downloadedRecords: number }
        | { type: "COMPLETED" }
        | { type: "ERROR"; downloadedRecords: number }
        | { type: "UPLOAD"; uploadedRecords: number },
    },
    states: {
      idle: {
        on: { FETCH: "fetch" },
      },
      fetch: {
        on: {
          RESOLVE_CONFLICTS: {
            target: "resolveConflicts",
            actions: "setDownloadedRecords",
          },
          COMPLETED: {
            actions: "setDownloadedRecords",
            target: "idle",
          },
          ERROR: {
            actions: "setDownloadedRecords",
            target: "idle",
          },
        },
      },
      resolveConflicts: {
        on: {
          UPLOAD: { target: "upload", actions: "setUploadedRecords" },
          COMPLETED: "idle",
        },
      },
      upload: {
        on: {
          COMPLETED: {
            target: "idle",
            actions: "setUploadedRecords",
          },
        },
      },
    },
  },
  {
    actions: {
      setDownloadedRecords: assign((context, event) => {
        return {
          // @ts-ignore
          downloadedRecords: event.downloadedRecords,
        }
      }),
      setUploadedRecords: assign((context, event) => {
        return {
          // @ts-ignore
          uploadedRecords: event.uploadedRecords,
        }
      }),
    },
  },
)
