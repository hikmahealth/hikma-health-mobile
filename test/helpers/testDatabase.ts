/**
 * Creates isolated WatermelonDB instances backed by LokiJSAdapter for
 * integration tests. Each call to `createTestDatabase()` returns a fresh,
 * empty database — no shared state between tests.
 *
 * Usage:
 *   const db = createTestDatabase()
 *   afterEach(() => resetTestDatabase(db))
 */

import { Database } from "@nozbe/watermelondb"
import LokiJSAdapter from "@nozbe/watermelondb/adapters/lokijs"
import logger from "@nozbe/watermelondb/utils/common/logger"

// Silence WatermelonDB's chatty Loki logs during tests
logger.silence()

import AppConfig from "../../app/db/model/AppConfig"
import Appointment from "../../app/db/model/Appointment"
import Clinic from "../../app/db/model/Clinic"
import ClinicDepartment from "../../app/db/model/ClinicDepartment"
import ClinicInventory from "../../app/db/model/ClinicInventory"
import DispensingRecord from "../../app/db/model/DispensingRecord"
import DrugCatalogue from "../../app/db/model/DrugCatalogue"
import Event from "../../app/db/model/Event"
import EventForm from "../../app/db/model/EventForm"
import EventLog from "../../app/db/model/EventLog"
import Patient from "../../app/db/model/Patient"
import PatientAdditionalAttribute from "../../app/db/model/PatientAdditionalAttribute"
import PatientProblems from "../../app/db/model/PatientProblems"
import PatientRegistrationForm from "../../app/db/model/PatientRegistrationForm"
import PatientVitals from "../../app/db/model/PatientVitals"
import Peer from "../../app/db/model/Peer"
import Prescription from "../../app/db/model/Prescription"
import PrescriptionItem from "../../app/db/model/PrescriptionItem"
import User from "../../app/db/model/User"
import UserClinicPermissions from "../../app/db/model/UserClinicPermissions"
import Visit from "../../app/db/model/Visit"
import schema from "../../app/db/schema"

let dbCounter = 0


const allModelClasses = [
  PatientRegistrationForm,
  Patient,
  Visit,
  Event,
  EventForm,
  User,
  Clinic,
  PatientAdditionalAttribute,
  Appointment,
  Prescription,
  AppConfig,
  PatientVitals,
  PatientProblems,
  UserClinicPermissions,
  ClinicDepartment,
  DrugCatalogue,
  ClinicInventory,
  PrescriptionItem,
  DispensingRecord,
  EventLog,
  Peer,
]

/** Create a fresh, isolated WatermelonDB instance for testing. */
export function createTestDatabase(): Database {
  dbCounter++
  const adapter = new LokiJSAdapter({
    schema,
    useWebWorker: false,
    useIncrementalIndexedDB: false,
    dbName: `test_db_${dbCounter}_${Date.now()}`,
  })

  return new Database({
    adapter,
    modelClasses: allModelClasses,
  })
}

/**
 * Wipe all data from a test database so it can be reused across tests
 * within the same describe block, or call in afterEach for full isolation.
 */
export async function resetTestDatabase(db: Database): Promise<void> {
  await db.write(async () => {
    await db.unsafeResetDatabase()
  })
}
