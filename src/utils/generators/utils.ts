import { Event, Patient, Visit } from "../../types"
import { generateEvents } from "./events"
import { generatePatient, generatePatients } from "./patients"
import { generateVisit } from "./visits"

export type BenchmarkingData = {
  patient: Patient
  visit: Visit
  events: Event[]
}

// export function generateBenchmarkingData(
//   patientsCount: number,
//   eventsCount: number,
// ): BenchmarkingData[] {
//   const patients = generatePatients(patientsCount);

//   const clinicId = '';
//   const providerId ='';

//   const doctor = 'Dr. Rotcod';

//   return patients.map(patient => {
//     const visit = generateVisit(patient.id, providerId, clinicId);
//     return {
//       patient,
//       visit,
//       events: generateEvents(eventsCount, patient.id, visit.id, doctor),
//     };
//   });
// }
