/**
 * Visit input types for the DataProvider.
 * Aligns with Visit.T in app/models/Visit.ts.
 */

/** Input for creating a new visit */
export type CreateVisitInput = {
  id?: string
  patientId: string
  clinicId: string
  providerId: string
  providerName: string
  checkInTimestamp: Date | number
  metadata?: Record<string, any>
}
