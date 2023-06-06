export type Visit = {
  id: string
  patientId: string
  clinicId: string
  providerId: string
  providerName: string
  checkInTimestamp: number
  isDeleted: boolean
  metadata: Object
}

export type VisitUI = Visit & {
  providerName: string
}
