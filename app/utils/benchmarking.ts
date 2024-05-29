/**
 * Helper functions for benchmarking
 * Should only be used in development mode
 */

import { format, isValid } from "date-fns"
import EventModel from "../db/model/Event"
import PatientModel from "../db/model/Patient"
import VisitModel from "../db/model/Visit"
import database from "../db"
import { faker } from "@faker-js/faker"
import { times } from "lodash"
import PatientAdditionalAttribute from "app/db/model/PatientAdditionalAttribute"

type PatientBenchmarkingData = Array<{
  patient: PatientModel
  patientAdditionalAttributes: PatientAdditionalAttribute[]
  visits: VisitModel[]
  events: EventModel[]
}>

/**
 * Function that creates m number of patients, each with n number of visits and o number of events per visit
 * @param {number} patientsCount The number of patients to create
 * @param {number} visitsCount The number of visits to create per patient
 * @param {number} eventsCount The number of events to create per visit
 * @param {PatientBenchmarkingData} data
 */
export function generateDummyPatients(
  patientsCount: number,
  visitsCount: number,
  eventsCount: number,
): PatientBenchmarkingData {
  const result: PatientBenchmarkingData = []

  const clinic_id = "1234567890"
  const provider_id = "aaa11111111"
  const provider_name = "Dr. John Doe"

  const event_types = ["Vitals", "diagnosis", "Medical History", "Pediatric"]

  for (let i = 0; i < patientsCount; i++) {
    const patient = {
      givenName: faker.person.firstName(),
      surname: faker.person.lastName(),
      dateOfBirth: format(
        faker.date.birthdate({ min: 1960, max: new Date().getFullYear() }),
        "yyyy-MM-dd",
      ),
      phone: faker.phone.number(),
      sex: faker.person.sex(),
      camp: "",
      metadata: {},
      additionalData: {},
      photoUrl: "",
      governmentId: faker.number.int({ min: 1_000_000, max: 10_000_000 }).toString(),
      externalPatientId: faker.number.int({ min: 1_000_000, max: 10_000_000 }).toString(),
    } as unknown as PatientModel

    const visits = times(visitsCount, () => ({
      patientId: patient.id,
      clinicId: clinic_id,
      providerId: provider_id,
      providerName: provider_name,
      checkInTimestamp: new Date().getTime(),
      metadata: {},
    })) as unknown as VisitModel[]

    const events = times(eventsCount, () => {
      // form data events for each visit
      const form_data = times(3, () => ({
        inputType: "text",
        fieldType: "string",
        name: faker.commerce.productName(),
        value: faker.commerce.product(),
        fieldId: faker.string.uuid(),
      }))
      return {
        patientId: patient.id,
        formId: faker.string.uuid(),
        visitId: faker.string.uuid(),
        eventType: event_types[Math.floor(Math.random() * event_types.length)],
        formData: form_data,
        metadata: {},
      }
    }) as unknown as EventModel[]

    result.push({ patient, visits, events })
  }

  return result
}

/**
 * Given synthetic benchmarking data, insert it into the database
 * @param {PatientBenchmarkingData} data
 */
export async function insertBenchmarkingData(data: PatientBenchmarkingData): Promise<void> {
  await database.write(async () => {
    let patientQuery: PatientModel[] = []
    let visitQuery: VisitModel[] = []
    let eventQuery: EventModel[] = []
    for await (const entry of data) {
      const { patient, visits, events } = entry

      // create the patient
      let pq = await database.collections
        .get<PatientModel>("patients")
        .prepareCreate((newPatient) => {
          newPatient.givenName = patient.givenName
          newPatient.surname = patient.surname
          newPatient.sex = patient.sex
          newPatient.phone = patient.phone
          newPatient.citizenship = patient.citizenship
          newPatient.photoUrl = patient.photoUrl
          newPatient.camp = patient.camp
          newPatient.hometown = patient.hometown
          newPatient.dateOfBirth = patient.dateOfBirth
          newPatient.additionalData = patient.additionalData
          newPatient.governmentId = patient.governmentId
          newPatient.externalPatientId = patient.externalPatientId
        })

      // create the visits using the patientQuery id
      for await (const visit of visits) {
        const vq = await database.get<VisitModel>("visits").prepareCreate((newVisit) => {
          newVisit.patientId = pq.id
          newVisit.clinicId = visit.clinicId
          newVisit.providerId = visit.providerId
          newVisit.providerName = visit.providerName
          newVisit.checkInTimestamp = isValid(visit.checkInTimestamp)
            ? new Date(visit.checkInTimestamp)
            : new Date()
          newVisit.metadata = visit.metadata
        })
        visitQuery.push(vq)

        // create the events using the visitQuery id
        for await (const event of events) {
          const eq = await await database.get<EventModel>("events").prepareCreate((newEvent) => {
            newEvent.patientId = pq.id
            newEvent.formId = event.formId
            newEvent.visitId = vq.id
            newEvent.eventType = event.eventType
            newEvent.formData = event.formData
            newEvent.metadata = event.metadata
          })
          eventQuery.push(eq)
        }
      }
      patientQuery.push(pq)

      // console.log(
      //     patientQuery,
      //     visitQuery,
      //     eventQuery
      // )
    }

    // batch create both of them
    await database.batch([...patientQuery, ...visitQuery, ...eventQuery])
  })
}
