import { Database } from "@nozbe/watermelondb"
import LokiJSAdapter from "@nozbe/watermelondb/adapters/lokijs"
import SQLiteAdapter from "@nozbe/watermelondb/adapters/sqlite"
import { setGenerator } from "@nozbe/watermelondb/utils/common/randomId"
import * as Sentry from "@sentry/react-native"
import { v1 as uuidv1 } from "uuid"

import migrations from "./migrations"

// Import all models here
import AppConfig from "./model/AppConfig"
import Appointment from "./model/Appointment"
import Clinic from "./model/Clinic"
import ClinicDepartment from "./model/ClinicDepartment"
import ClinicInventory from "./model/ClinicInventory"
import DispensingRecord from "./model/DispensingRecord"
import DrugCatalogue from "./model/DrugCatalogue"
import Event from "./model/Event"
import EventForm from "./model/EventForm"
import Patient from "./model/Patient"
import PatientAdditionalAttribute from "./model/PatientAdditionalAttribute"
import PatientProblems from "./model/PatientProblems"
import PatientRegistrationForm from "./model/PatientRegistrationForm"
import PatientVitals from "./model/PatientVitals"
import Prescription from "./model/Prescription"
import PrescriptionItem from "./model/PrescriptionItem"
import User from "./model/User"
import UserClinicPermissions from "./model/UserClinicPermissions"
import Visit from "./model/Visit"
import schema from "./schema"

setGenerator(() => uuidv1())

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
        Sentry.captureException(error)
        // FIXME: Must inform the user on quota exceeded error
      },
      onSetUpError: (error) => {
        // Database failed to load -- offer the user to reload the app or log out
        Sentry.captureException(error)
        // FIXME: Must inform the user on database setup error
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

    // v5
    AppConfig,
    PatientVitals,
    PatientProblems,
    UserClinicPermissions,

    // v6
    ClinicDepartment,

    // V7
    DrugCatalogue,
    ClinicInventory,
    PrescriptionItem,
    DispensingRecord,
  ],
})

export default database
