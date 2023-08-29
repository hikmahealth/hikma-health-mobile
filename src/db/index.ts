import { Platform } from "react-native"
import { Database } from "@nozbe/watermelondb"
import SQLiteAdapter from "@nozbe/watermelondb/adapters/sqlite"
import { v1 as uuidv1 } from "uuid"

// DATABASE SETUP
import schema from "./schema"
import migrations from "./migrations"
import Patient from "./model/Patient"
import StringId from "./model/StringId"
import StringContent from "./model/StringContent"
import User from "./model/User"
import EventModel from "./model/Event"
import VisitModel from "./model/Visit"
import { setGenerator } from "@nozbe/watermelondb/utils/common/randomId"
import ClinicModel from "./model/Clinic"
import EventFormModel from "./model/EventForm"
import mockDBAdapter from "../../test/mockDBAdapter"

// set the unique identifier to be uuid1
setGenerator(() => uuidv1())


const isTest = process.env.JEST_WORKER_ID !== undefined || process.env.NODE_ENV === 'test'

const adapter = isTest ? mockDBAdapter : new SQLiteAdapter({
  schema,
  // (You might want to comment it out for development purposes -- see Migrations documentation)
  migrations,
  dbName: "hikmadb",
  jsi: true,
  onSetUpError: (error) => {
    // TODO: Handle error appropriately
    console.warn("Database failed to load: ", error)
    // Database failed to load -- offer the user to reload the app or log out
  },
})

// Then, make a Watermelon database from it!
const database = new Database({
  adapter,
  modelClasses: [Patient, StringId, StringContent, User, EventModel, VisitModel, ClinicModel, EventFormModel],
})

export default database
