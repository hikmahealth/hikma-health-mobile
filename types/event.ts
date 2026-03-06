/**
 * Event input types for the DataProvider.
 * Aligns with Event.T in app/models/Event.ts.
 */

import type Event from "../app/models/Event"

/** Input for creating a new event (optionally with a new visit) */
export type CreateEventInput = {
  patientId: string
  /** If null, a new visit will be created (offline) or must be created first (online) */
  visitId: string | null
  eventType: string
  formId: string
  formData: Event.FormDataItem[]
  metadata?: Record<string, any>
  /** Required when visitId is null and a new visit must be created */
  clinicId?: string
  providerId?: string
  providerName?: string
  checkInTimestamp?: number
  /** The user who recorded this event */
  recordedByUserId?: string
}

/** Input for updating an existing event */
export type UpdateEventInput = {
  formData: Event.FormDataItem[]
  metadata?: Record<string, any>
}
