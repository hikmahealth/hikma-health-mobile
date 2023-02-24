export const eventTypes = [
  'Patient Summary',
  'Camp',
  'Visit Type',
  'Vitals',
  'Examination',
  'Examination Full',
  'Medicine',
  'Complaint',
  'Treatment',
  'Diagnosis',
  'Medicine Dispensed',
  'Prescriptions',
  'Allergies',
  'Medical History',
  'Medical History Full',
  'Notes',
  'COVID-19 Screening',
  'Dental Treatment',
  'Physiotherapy',
] as const;

export type EventTypes = (typeof eventTypes)[number];

export type Event = {
  id: string;
  patientId: string;
  visitId: string;
  eventType: EventTypes;
  eventMetadata: string;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
};
