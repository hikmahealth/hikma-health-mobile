// @ts-check
import { Database } from "@nozbe/watermelondb"
import SQLiteAdapter from "@nozbe/watermelondb/adapters/sqlite"
import LokiJSAdapter from "@nozbe/watermelondb/adapters/lokijs"
import { v1 as uuidv1 } from "uuid"
import schema from "./schema"
import migrations from "./migrations"

// Import all models here
import PatientRegistrationForm from "./model/PatientRegistrationForm"
import Patient from "./model/Patient"
import Visit from "./model/Visit"
import Event from "./model/Event"
import EventForm from "./model/EventForm"
import User from "./model/User"
import Clinic from "./model/Clinic"
import { setGenerator } from "@nozbe/watermelondb/utils/common/randomId"
import PatientAdditionalAttribute from "./model/PatientAdditionalAttribute"
import Appointment from "./model/Appointment"
import Prescription from "./model/Prescription"

setGenerator(() => uuidv1())

console.log(process.env.NODE_ENV, process.env.__TEST__)

function createAdapter() {
  const isTest = process.env.NODE_ENV === "test"

  if (!isTest) {
    return new SQLiteAdapter({
      dbName: "hikmahealthdb",
      schema,
      // (You might want to comment it out for development purposes -- see Migrations documentation)
      migrations,
      // (recommended option, should work flawlessly out of the box on iOS. On Android,
      // additional installation steps have to be taken - disable if you run into issues...)
      jsi: true /* Platform.OS === 'ios' */,
      // (optional, but you should implement this method)
      onSetUpError: (error) => {
        // Database failed to load -- offer the user to reload the app or log out
        // TODO: add error reporting to Sentry or similar here
        console.error("Database failed to load!", error)
      },
    })
  } else {
    // For testing environment
    return new LokiJSAdapter({
      schema,
      // (You might want to comment out migrations for development purposes -- see Migrations documentation)
      migrations,
      useWebWorker: false,
      useIncrementalIndexedDB: true,
      dbName: "test_hikmahealthdb", // optional db name

      // --- Optional, but recommended event handlers:

      onQuotaExceededError: (error) => {
        // Browser ran out of disk space -- offer the user to reload the app or log out
      },
      onSetUpError: (error) => {
        // Database failed to load -- offer the user to reload the app or log out
      },
      extraIncrementalIDBOptions: {
        onDidOverwrite: () => {
          // Called when this adapter is forced to overwrite contents of IndexedDB.
          // This happens if there's another open tab of the same app that's making changes.
          // Try to synchronize the app now, and if user is offline, alert them that if they close this
          // tab, some data may be lost
        },
        onversionchange: () => {
          // database was deleted in another browser tab (user logged out), so we must make sure we delete
          // it in this tab as well - usually best to just refresh the page
          // if (checkIfUserIsLoggedIn()) {
          // window.location.reload()
          // }
        },
      },
    })
  }
}

export const database = new Database({
  adapter: createAdapter(),
  modelClasses: [
    PatientRegistrationForm,
    Patient,
    Visit,
    Event,
    EventForm,
    User,
    Clinic,

    // v2
    PatientAdditionalAttribute,

    // v3
    Appointment,

    // v4
    Prescription,
  ],
})

export default database
