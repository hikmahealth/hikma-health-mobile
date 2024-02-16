// CRUD METHODS
import { Q } from "@nozbe/watermelondb"
import { isEmpty } from "lodash"
import database from "."
import { Patient, Event, Visit, EventTypes } from "../types"
import ClinicModel from "./model/Clinic"
import EventModel from "./model/Event"
import PatientModel from "./model/Patient"
import VisitModel from "./model/Visit"

////////////////////////////////////////////
//////////// PATIENTS /////////////////////
///////////////////////////////////////////

// Create a new Patient
// NOTE: Should the original text be stored with relation to the langage of the app when creating it?
export async function registerNewPatient(patient: Patient) {
  return await database.write(async () => {
    console.log("Inserting data: ", patient.additionalData)
    const pt = await database.get<PatientModel>("patients").create((newPatient) => {
      newPatient.givenName = patient.givenName
      newPatient.surname = patient.surname
      newPatient.sex = patient.sex
      // newPatient.phone = patient.phone
      newPatient.country = patient.country
      // newPatient.camp = patient.camp
      // newPatient.hometown = patient.hometown
      newPatient.dateOfBirth = patient.dateOfBirth
      newPatient.additionalData = patient.additionalData
      // newPatient.updatedAt = timestamp;
      // newPatient.createdAt = timestamp;
    })

    return pt
  })
}

// Update a Patient with id: patientId
export async function updatePatientWithId(patientId: string, patient: Patient) {
  return await database.write(async () => {
    const pt = await database.get<PatientModel>("patients").find(patientId)
    const res = pt.update((newPatient) => {
      newPatient.givenName = patient.givenName
      newPatient.surname = patient.surname
      newPatient.sex = patient.sex
      // newPatient.phone = patient.phone
      newPatient.country = patient.country
      // newPatient.camp = patient.camp
      // newPatient.hometown = patient.hometown
      newPatient.dateOfBirth = patient.dateOfBirth
      newPatient.additionalData = patient.additionalData
      // newPatient.updatedAt = timestamp;
      // newPatient.createdAt = timestamp;
    })

    return res
  })
}
///////////////////////////////////////////
//////////// VISITS //////////////////////
//////////////////////////////////////////

// Create a new Visit
export async function createVisit(visit: Omit<Visit, "id">) {
  return await database.write(async () => {
    const visitRes = await database.get<VisitModel>("visits").create((newVisit) => {
      newVisit.patientId = visit.patientId
      newVisit.clinicId = visit.clinicId
      newVisit.providerId = visit.providerId
      newVisit.providerName = visit.providerName
      newVisit.checkInTimestamp = visit.checkInTimestamp
      newVisit.metadata = visit.metadata
    })
    return visitRes
  })
}

// delete a visit
export async function deleteVisit(visitId: string) {
  return await database.write(async () => {
    const visit = await database.get<VisitModel>("visits").find(visitId)
    const deletedVisit = await visit.update((visit) => {
      visit.isDeleted = true
    })
    return await deletedVisit.markAsDeleted()
  })
}

///////////////////////////////////////////
//////////// EVENTS //////////////////////
//////////////////////////////////////////

// Create a new Event
export async function createEvent(event: Omit<Event, "id" | "createdAt" | "updatedAt">) {
  return await database.write(async () => {
    const eventRes = await database.get<EventModel>("events").create((newEvent) => {
      newEvent.patientId = event.patientId
      newEvent.visitId = event.visitId
      newEvent.eventType = event.eventType
      newEvent.eventMetadata = event.eventMetadata
      newEvent.isDeleted = event.isDeleted
    })
    return eventRes
  })
}


// Update an event
export async function updateEventMetaData(eventId: string, eventMetadata: EventModel["eventMetadata"]) {
  return await database.write(async () => {
    const evt = await database.get<EventModel>("events").find(eventId)
    const res = evt.update((newEvent) => {
      newEvent.eventMetadata = eventMetadata
    })

    return res
  })
}

/**
* Get latest event by type
* @param {string} patientId
* @param {EventTypes} eventType
* @returns {Promise}
*/
export async function getLatestPatientEventByType(
  patientId: string,
  eventType: EventTypes,
): Promise<Record<any, any>> {
  try {
    const results = await database
      .get<EventModel>("events")
      .query(
        Q.and(Q.where("patient_id", patientId), Q.where("event_type", eventType)),
        Q.sortBy("created_at", Q.desc),
        Q.take(1),
      )
      .fetch()

    const firstResult = results[0];
    if (firstResult && !isEmpty(firstResult.eventMetadata)) {
      return firstResult.eventMetadata
    }

    return {}
  } catch (error) {
    console.error("Error retrieving the latest patient event of type: " + eventType, error);
    return {}
  }
}


// Delete an event
export async function deleteEvent(eventId: string): Promise<any> {
  return await database.write(async () => {
    const event = await database.get<EventModel>("events").find(eventId)
    const deletedEvent = await event.update((evt) => {
      evt.isDeleted = true
    })
    return await event.markAsDeleted()
  })
}

// get all events of a patient by type
// NOTE: This function is similar to getLatestPatientEventByType ... consider a refactor?
export async function getAllPatientEventsByType(patientId: string, eventType: EventTypes) {
  return await database
    .get<EventModel>("events")
    .query(
      Q.and(Q.where("patient_id", patientId), Q.where("event_type", eventType)),
      Q.sortBy("created_at", Q.desc),
    )
}

///////////////////////////////////////////
//////////// CLINICS //////////////////////
//////////////////////////////////////////
export async function getClinic() {
  return await database.get<ClinicModel>("clinics").query(Q.take(1))
}

// 🔥DANGER: This is a temporary function to be used for development purposes only
///////////////////////////////////////////
//////////// BENCHMARKING //////////////////////
//////////////////////////////////////////
// export async function saveBenchmarkData(data: BenchmarkingData[]) {
//   data.forEach(async item => {
//     const {patient, events, visit} = item;
//     database.batch(
//        database
//       .get<VisitModel>('visits')
//       .create(newVisit => {
//         newVisit.patientId = visit.patientId;
//         newVisit.clinicId = visit.clinicId;
//         newVisit.providerId = visit.providerId;
//         newVisit.checkInTimestamp = visit.checkInTimestamp;
//       });

//       events.map(event =>
//         database.collections
//           .get<EventModel>('events')
//           .prepareCreate(newEvent => {
//             newEvent.patientId = event.patientId;
//             newEvent.visitId = event.visitId;
//             newEvent.eventType = event.eventType;
//             newEvent.eventMetadata = event.eventMetadata;
//             newEvent.isDeleted = event.isDeleted;
//           }),
//       ),
//     );
//   });
// }

export async function getUnsyncedRecords() {
  // return watermelon db rows that are not synced from the server
  return 0
}
