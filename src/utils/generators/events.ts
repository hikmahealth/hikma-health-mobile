import { faker } from "@faker-js/faker"
import { sample } from "lodash"
import { Covid19FormMetadata } from "../../screens/Covid19Form"
import { MedicalHistoryMetadata } from "../../screens/MedicalHistoryForm"
import { MedicineMetadata } from "../../screens/Medicine"
import { PhysiotherapyMetadata } from "../../screens/PhysiotherapyForm"
import { VitalsMetadata } from "../../screens/VitalsForm"
import { Event, EventTypes, eventTypes, Examination } from "../../types"
import { generateVisit } from "./visits"

type EventMetadata =
  | VitalsMetadata
  | Examination
  | PhysiotherapyMetadata
  | MedicineMetadata
  | MedicalHistoryMetadata
  | Covid19FormMetadata
  | Record<string, any> // Support for dynamic data from created forms on the admin dashboard
  | string

const generateMedicineMetadata = (doctor?: string): MedicineMetadata => ({
  doctor: doctor || faker.name.fullName(),
  medication: faker.science.chemicalElement().name,
  type: faker.science.chemicalElement().name,
  dosage: faker.lorem.word({ length: 4 }),
  days: faker.datatype.number({ min: 1, max: 30 }),
})

const generatePhysiotherapyMetadata = (doctor?: string): PhysiotherapyMetadata => ({
  doctor: doctor || faker.name.fullName(),
  previousTreatment: sample([true, false]) as boolean,
  previousTreatmentText: faker.lorem.sentence(),
  complaint: faker.lorem.sentence(),
  findings: faker.lorem.sentence(),
  treatmentPlan: faker.lorem.sentence(),
  treatmentSession: faker.lorem.sentence(),
  recommendations: faker.lorem.sentence(),
  referral: sample([true, false]) as boolean,
  referralText: faker.lorem.sentence(),
})

const generateExaminationMetadata = (doctor?: string): Examination => ({
  doctor: doctor || faker.name.fullName(),
  examination: faker.lorem.word(),
  generalObservations: faker.lorem.sentence(),
  diagnosis: faker.word.noun(),
  treatment: faker.lorem.sentence(),
  covid19: sample([true, false]) as boolean,
  referral: sample([true, false]) as boolean,
  referralText: faker.lorem.sentence(),
})

const generateVitalsMetadata = (doctor?: string): VitalsMetadata => ({
  doctor: doctor || faker.name.fullName(),
  heartRate: faker.datatype.number({ min: 40, max: 100 }),
  systolic: faker.datatype.number({ min: 80, max: 140 }),
  diastolic: faker.datatype.number({ min: 60, max: 110 }),
  oxygenSaturation: faker.datatype.number({ min: 80, max: 100 }),
  temperature: faker.datatype.number({ min: 35, max: 42 }),
  respiratoryRate: faker.datatype.number({ min: 10, max: 30 }),
  weight: faker.datatype.number({ min: 30, max: 100 }),
  bloodGlucose: faker.datatype.number({ min: 40, max: 200 }),
})

const generateEventAndMetadata = (doctor?: string): [EventTypes, EventMetadata] => {
  const eventType = sample([
    "Complaint",
    "Vitals",
    "Examination",
    "Medicine",
    "Physiotherapy",
  ]) as EventTypes
  switch (eventType) {
    case "Vitals":
      return [eventType, generateVitalsMetadata(doctor)]
    case "Examination":
      return [eventType, generateExaminationMetadata(doctor)]
    case "Physiotherapy":
      return [eventType, generatePhysiotherapyMetadata(doctor)]
    case "Medicine":
      return [eventType, generateMedicineMetadata(doctor)]
    case "Complaint":
      return [eventType, {}]
    default:
      // @ts-ignore
      return [eventType, { doctor: doctor || faker.name.fullName }]
  }
}

// generate a random event using faker
export const generateEvent = (patientId: string, visitId: string, doctor?: string): Event => {
  const [eventType, eventMetadata] = generateEventAndMetadata(doctor)
  return {
    id: faker.datatype.uuid(),
    patientId,
    visitId,
    eventType,
    eventMetadata: eventMetadata,
    isDeleted: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  }
}

// generate a list of random events
export const generateEvents = (
  count: number,
  patientId: string,
  visitId: string,
  doctor?: string,
): Event[] => {
  return Array.from({ length: count }, () => generateEvent(patientId, visitId, doctor))
}
