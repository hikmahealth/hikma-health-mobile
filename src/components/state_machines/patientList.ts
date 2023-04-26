import { assign, createMachine } from "xstate"

type PatientListContext = {
  searchResults: Patient[]
}

export const patientListMachine = createMachine({
  id: "patientListState",
  initial: "idle",
    predictableActionArguments: true,
  context: {
    searchResults: [],
  } as PatientListContext,
  states: {
    idle: {
      on: { SEARCH: { target: "searching", actions: "clearSearchResults" } },
    },
    searching: {
      on: { RESULTS: { target: "results", actions: "setSearchResults" } } ,
    },
    results: {
      on: { 
        RESET: {target: "idle", actions: "clearSearchResults"},
        SEARCH: {target: "searching", actions: "clearSearchResults"}
      },
    }
  },
}, {
  actions: {
    setSearchResults: assign((context, event) => {
      return {
        searchResults: event.results,
      }
    }),
    clearSearchResults: assign((context, event) => {
      return {
        searchResults: [],
      }
    })
  }
});

