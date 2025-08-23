/**
 * Helper functions for benchmarking
 * Should only be used in development mode
 */

import { faker } from "@faker-js/faker"
import { format, isValid, addDays, addHours } from "date-fns"
import { Option } from "effect"
import { times } from "es-toolkit/compat"
import { v1 as uuidV1 } from "uuid"

import AppointmentModel from "@/db/model/Appointment"
import EventModel from "@/db/model/Event"
import PatientModel from "@/db/model/Patient"
import PrescriptionModel from "@/db/model/Prescription"
import VisitModel from "@/db/model/Visit"
import Appointment from "@/models/Appointment"
import Event from "@/models/Event"
import Patient from "@/models/Patient"
import Prescription from "@/models/Prescription"
import Visit from "@/models/Visit"

import database from "../db"

type PatientBenchmarkingData = Array<{
  patient: Patient.T
  patientAdditionalAttributes: Patient.AdditionalAttributes.T[]
  visits: Visit.T[]
  events: Event.T[]
  appointments: Appointment.T[]
  prescriptions: Prescription.T[]
}>

/**
 * Function that creates m number of patients, each with n number of visits and o number of events per visit
 * @param {number} patientsCount The number of patients to create
 * @param {number} visitsCount The number of visits to create per patient
 * @param {number} eventsCount The number of events to create per visit
 * @returns {PatientBenchmarkingData} Generated benchmarking data
 */
export function generateDummyPatients(
  patientsCount: number,
  visitsCount: number,
  eventsCount: number,
): PatientBenchmarkingData {
  const result: PatientBenchmarkingData = []

  const clinic_id = "607c8990-36f7-4b9b-b71c-5fbcbe1d65f2"
  const provider_id = "8366285f-5c9d-49b0-9161-16961d3a40e9"
  const provider_name = "Hikma Admin"
  const user_id = provider_id

  const event_types = ["diagnosis", "Medical History", "Pediatric"]

  for (let i = 0; i < patientsCount; i++) {
    const patientId = uuidV1()
    const patient: Patient.T = {
      givenName: faker.person.firstName(),
      surname: faker.person.lastName(),
      dateOfBirth: format(
        faker.date.birthdate({ mode: "year", min: 1960, max: new Date().getFullYear() }),
        "yyyy-MM-dd",
      ),
      phone: faker.phone.number(),
      sex: faker.person.sex(),
      camp: faker.string.alpha({ casing: "lower", length: 6 }),
      metadata: {
        testData: true,
      },
      additionalData: {},
      photoUrl: "",
      governmentId: faker.number.int({ min: 1000000, max: 10000000 }).toString(),
      externalPatientId: faker.number.int({ min: 1000000, max: 10000000 }).toString(),
      id: patientId,
      citizenship: faker.location.country(),
      hometown: faker.location.city(),
      isDeleted: false,
      deletedAt: Option.none<Date>(),
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const visits: Visit.T[] = times(visitsCount, (visitIndex) => {
      const visitId = uuidV1()
      return {
        patientId: patient.id,
        clinicId: clinic_id,
        providerId: provider_id,
        providerName: provider_name,
        checkInTimestamp: addDays(new Date(), -visitIndex * 7), // Space visits out by a week
        metadata: Option.some({ testData: true }),
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: Option.none<Date>(),
        id: visitId,
        isDeleted: false,
      }
    })

    const events: Event.T[] = []
    // Generate events for each visit
    visits.forEach((visit) => {
      const visitEvents = times(eventsCount, () => {
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
          visitId: visit.id, // Use the actual visit ID instead of a random UUID
          eventType: event_types[Math.floor(Math.random() * event_types.length)] + " (TEST)",
          formData: form_data,
          metadata: { testData: true },
          id: faker.string.uuid(),
          isDeleted: false,
          deletedAt: Option.none<Date>(),
          createdAt: new Date(),
          updatedAt: new Date(),
        }
      })
      events.push(...visitEvents)
    })

    // Generate appointments (2-3 per patient)
    const appointmentCount = faker.number.int({ min: 2, max: 3 })
    const appointments: Appointment.T[] = times(appointmentCount, () => {
      const futureDate = addDays(new Date(), faker.number.int({ min: 1, max: 30 }))
      const randomVisit = visits[Math.floor(Math.random() * visits.length)]

      return {
        id: uuidV1(),
        providerId: Option.some(provider_id),
        clinicId: clinic_id,
        patientId: patient.id,
        userId: user_id,
        currentVisitId: randomVisit ? randomVisit.id : "",
        fulfilledVisitId: Option.none(),
        timestamp: futureDate,
        duration: faker.helpers.arrayElement([15, 30, 45, 60]), // Duration in minutes
        reason: faker.helpers.arrayElement([
          "Follow-up visit",
          "Annual checkup",
          "Consultation",
          "Vaccination",
          "Lab results review",
        ]),
        notes: faker.lorem.sentence(),
        status: faker.helpers.arrayElement([
          Appointment.Status.PENDING,
          Appointment.Status.CONFIRMED,
          Appointment.Status.COMPLETED,
        ]) as Appointment.Status,
        metadata: { testData: true },
        isDeleted: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: Option.none(),
      }
    })

    // Generate prescriptions (1-2 per patient)
    const prescriptionCount = faker.number.int({ min: 1, max: 2 })
    const prescriptions: Prescription.T[] = times(prescriptionCount, () => {
      const randomVisit = visits[Math.floor(Math.random() * visits.length)]
      const itemCount = faker.number.int({ min: 1, max: 4 })

      const items: Prescription.Item[] = times(itemCount, () => ({
        id: uuidV1(),
        medicationId: faker.string.uuid(),
        name: faker.helpers.arrayElement([
          "Amoxicillin",
          "Ibuprofen",
          "Paracetamol",
          "Aspirin",
          "Omeprazole",
          "Metformin",
          "Lisinopril",
        ]),
        route: faker.helpers.arrayElement(Prescription.routeList) as Prescription.Route,
        form: faker.helpers.arrayElement(Prescription.formList) as Prescription.Form,
        frequency: faker.number.int({ min: 1, max: 4 }),
        intervals: faker.number.int({ min: 4, max: 24 }),
        dose: faker.number.int({ min: 100, max: 1000 }),
        doseUnits: faker.helpers.arrayElement(Prescription.doseUnitList) as Prescription.DoseUnit,
        duration: faker.number.int({ min: 3, max: 30 }),
        durationUnits: faker.helpers.arrayElement(
          Prescription.durationUnitList,
        ) as Prescription.DurationUnit,
        quantity: faker.number.int({ min: 10, max: 100 }),
        status: faker.helpers.arrayElement(Prescription.statusList) as Prescription.Status,
        priority: faker.helpers.arrayElement(Prescription.priorityList) as Prescription.Priority,
        filledAt: faker.datatype.boolean() ? faker.date.recent() : null,
        filledByUserId: faker.datatype.boolean() ? user_id : null,
      }))

      return {
        id: uuidV1(),
        patientId: patient.id,
        providerId: provider_id,
        filledBy: faker.datatype.boolean() ? Option.some(user_id) : Option.none(),
        pickupClinicId: Option.some(clinic_id),
        visitId: randomVisit ? Option.some(randomVisit.id) : Option.none(),
        priority: faker.helpers.arrayElement(Prescription.priorityList) as Prescription.Priority,
        status: faker.helpers.arrayElement(Prescription.statusList) as Prescription.Status,
        items: items,
        notes: faker.lorem.sentence(),
        expirationDate: addDays(new Date(), faker.number.int({ min: 30, max: 365 })),
        prescribedAt: faker.date.recent(),
        filledAt: faker.datatype.boolean() ? Option.some(faker.date.recent()) : Option.none(),
        metadata: { testData: true },
        isDeleted: false,
        deletedAt: Option.none(),
        createdAt: new Date(),
        updatedAt: new Date(),
      }
    })

    result.push({
      patient,
      patientAdditionalAttributes: [],
      visits,
      events,
      appointments,
      prescriptions,
    })
  }

  return result
}

/**
 * Given synthetic benchmarking data, insert it into the database
 * @param {PatientBenchmarkingData} data
 */
export async function insertBenchmarkingData(data: PatientBenchmarkingData): Promise<void> {
  await database.write(async () => {
    const patientQuery: PatientModel[] = []
    const visitQuery: VisitModel[] = []
    const eventQuery: EventModel[] = []
    const appointmentQuery: AppointmentModel[] = []
    const prescriptionQuery: PrescriptionModel[] = []

    for await (const entry of data) {
      const { patient, visits, events, appointments, prescriptions } = entry

      // create the patient
      const pq = database.collections.get<PatientModel>("patients").prepareCreate((newPatient) => {
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
      const visitIdMap = new Map<string, string>() // Map old visit IDs to new ones
      for await (const visit of visits) {
        const vq = database.get<VisitModel>("visits").prepareCreate((newVisit) => {
          newVisit.patientId = pq.id
          newVisit.clinicId = visit.clinicId
          newVisit.providerId = visit.providerId
          newVisit.providerName = visit.providerName
          newVisit.checkInTimestamp = isValid(visit.checkInTimestamp)
            ? new Date(visit.checkInTimestamp)
            : new Date()
          newVisit.metadata = Option.getOrElse(visit.metadata, () => ({ testData: true }))
        })
        visitIdMap.set(visit.id, vq.id)
        visitQuery.push(vq)
      }

      // create the events using the actual visit IDs
      for await (const event of events) {
        const actualVisitId = visitIdMap.get(event.visitId) || event.visitId
        const eq = database.get<EventModel>("events").prepareCreate((newEvent) => {
          newEvent.patientId = pq.id
          newEvent.formId = event.formId
          newEvent.visitId = actualVisitId
          newEvent.eventType = event.eventType
          newEvent.formData = event.formData
          newEvent.metadata = event.metadata
        })
        eventQuery.push(eq)
      }

      // create appointments
      for await (const appointment of appointments) {
        const actualVisitId =
          visitIdMap.get(appointment.currentVisitId) || appointment.currentVisitId
        const aq = database
          .get<AppointmentModel>("appointments")
          .prepareCreate((newAppointment) => {
            newAppointment.patientId = pq.id
            newAppointment.providerId = Option.getOrElse(appointment.providerId, () => null)
            newAppointment.clinicId = appointment.clinicId
            newAppointment.userId = appointment.userId
            newAppointment.currentVisitId = actualVisitId
            newAppointment.fulfilledVisitId = Option.getOrElse(
              appointment.fulfilledVisitId,
              () => null,
            )
            newAppointment.timestamp = appointment.timestamp.getTime()
            newAppointment.duration = appointment.duration
            newAppointment.reason = appointment.reason
            newAppointment.notes = appointment.notes
            newAppointment.status = appointment.status
            newAppointment.metadata = appointment.metadata
            newAppointment.isDeleted = false
          })
        appointmentQuery.push(aq)
      }

      // create prescriptions
      for await (const prescription of prescriptions) {
        const actualVisitId = Option.map(prescription.visitId, (vid) => visitIdMap.get(vid) || vid)
        const prsq = database
          .get<PrescriptionModel>("prescriptions")
          .prepareCreate((newPrescription) => {
            newPrescription.patientId = pq.id
            newPrescription.providerId = prescription.providerId
            newPrescription.filledBy = Option.getOrElse(prescription.filledBy, () => null)
            newPrescription.pickupClinicId = Option.getOrElse(
              prescription.pickupClinicId,
              () => null,
            )
            newPrescription.visitId = Option.getOrElse(actualVisitId, () => null)
            newPrescription.priority = prescription.priority
            newPrescription.status = prescription.status
            newPrescription.items = prescription.items
            newPrescription.notes = prescription.notes
            newPrescription.expirationDate = prescription.expirationDate
            newPrescription.prescribedAt = prescription.prescribedAt
            newPrescription.filledAt = Option.getOrElse(prescription.filledAt, () => null)
            newPrescription.metadata = prescription.metadata
            newPrescription.isDeleted = false
          })
        prescriptionQuery.push(prsq)
      }

      patientQuery.push(pq)
    }

    // batch create all of them
    await database.batch([
      ...patientQuery,
      ...visitQuery,
      ...eventQuery,
      ...appointmentQuery,
      ...prescriptionQuery,
    ])
  })
}
