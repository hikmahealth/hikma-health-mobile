/**
 * Event transformers: snake_case server ↔ camelCase domain model.
 */

import { Option } from "effect"
import EventNS from "@/models/Event"
import type { CreateEventInput, UpdateEventInput } from "../../../types/event"

/** Server-side event shape (snake_case) */
export type ServerEvent = {
  id: string
  patient_id: string
  visit_id: string
  event_type: string
  form_id: string
  form_data: EventNS.FormDataItem[]
  metadata: Record<string, any>
  is_deleted: boolean
  deleted_at: string | null
  created_at: string
  updated_at: string
}

/** Server event → domain Event.T */
export function eventFromServer(s: ServerEvent): EventNS.T {
  return {
    id: s.id,
    patientId: s.patient_id,
    visitId: s.visit_id,
    eventType: s.event_type,
    formId: s.form_id,
    formData: s.form_data ?? [],
    metadata: s.metadata ?? {},
    isDeleted: s.is_deleted,
    deletedAt: Option.fromNullable(s.deleted_at ? new Date(s.deleted_at) : null),
    createdAt: new Date(s.created_at),
    updatedAt: new Date(s.updated_at),
  }
}

/** Domain Event.T → server event shape */
export function eventToServer(e: EventNS.T): ServerEvent {
  return {
    id: e.id,
    patient_id: e.patientId,
    visit_id: e.visitId,
    event_type: e.eventType,
    form_id: e.formId,
    form_data: e.formData,
    metadata: e.metadata,
    is_deleted: e.isDeleted,
    deleted_at: Option.getOrNull(e.deletedAt)?.toISOString() ?? null,
    created_at: e.createdAt.toISOString(),
    updated_at: e.updatedAt.toISOString(),
  }
}

/** CreateEventInput → server payload for POST /api/events */
export function createEventToServer(input: CreateEventInput) {
  return {
    patient_id: input.patientId,
    visit_id: input.visitId,
    event_type: input.eventType,
    form_id: input.formId,
    form_data: input.formData,
    metadata: input.metadata ?? {},
    recorded_by_user_id: input.recordedByUserId,
  }
}

/** UpdateEventInput → server payload for PUT /api/events/:id */
export function updateEventToServer(input: UpdateEventInput) {
  return {
    form_data: input.formData,
    metadata: input.metadata ?? {},
  }
}
