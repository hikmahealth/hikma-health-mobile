// @ts-check
import { Database } from "@nozbe/watermelondb"
import SQLiteAdapter from "@nozbe/watermelondb/adapters/sqlite"
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

setGenerator(() => uuidv1())

const adapter = new SQLiteAdapter({
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

export const database = new Database({
  adapter,
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
  ],
})

export default database
