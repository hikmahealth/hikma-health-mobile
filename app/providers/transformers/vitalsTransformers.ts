/**
 * Vitals transformers: snake_case server <-> camelCase domain model.
 */

import { Option } from "effect"
import PatientVitals from "@/models/PatientVitals"
import type { CreateVitalsInput } from "../../../types/vitals"

/** Server-side vitals shape (snake_case) */
export type ServerVitals = {
  id: string
  patient_id: string
  visit_id: string | null
  timestamp: string
  systolic_bp: number | null
  diastolic_bp: number | null
  bp_position: string | null
  height_cm: number | null
  weight_kg: number | null
  bmi: number | null
  waist_circumference_cm: number | null
  heart_rate: number | null
  pulse_rate: number | null
  oxygen_saturation: number | null
  respiratory_rate: number | null
  temperature_celsius: number | null
  pain_level: number | null
  recorded_by_user_id: string | null
  metadata: Record<string, any>
  is_deleted: boolean
  created_at: string
  updated_at: string
  deleted_at: string | null
}

/** Server vitals -> domain PatientVitals.T */
export function vitalsFromServer(s: ServerVitals): PatientVitals.T {
  return {
    id: s.id,
    patientId: s.patient_id,
    visitId: Option.fromNullable(s.visit_id),
    timestamp: new Date(s.timestamp),
    systolicBp: Option.fromNullable(s.systolic_bp),
    diastolicBp: Option.fromNullable(s.diastolic_bp),
    bpPosition: Option.fromNullable(s.bp_position as PatientVitals.BPPosition | null),
    heightCm: Option.fromNullable(s.height_cm),
    weightKg: Option.fromNullable(s.weight_kg),
    bmi: Option.fromNullable(s.bmi),
    waistCircumferenceCm: Option.fromNullable(s.waist_circumference_cm),
    heartRate: Option.fromNullable(s.heart_rate),
    pulseRate: Option.fromNullable(s.pulse_rate),
    oxygenSaturation: Option.fromNullable(s.oxygen_saturation),
    respiratoryRate: Option.fromNullable(s.respiratory_rate),
    temperatureCelsius: Option.fromNullable(s.temperature_celsius),
    painLevel: Option.fromNullable(s.pain_level),
    recordedByUserId: Option.fromNullable(s.recorded_by_user_id),
    metadata: s.metadata ?? {},
    isDeleted: s.is_deleted,
    createdAt: new Date(s.created_at),
    updatedAt: new Date(s.updated_at),
    deletedAt: Option.fromNullable(s.deleted_at ? new Date(s.deleted_at) : null),
  }
}

/** Domain PatientVitals.T -> server vitals shape */
export function vitalsToServer(v: PatientVitals.T): ServerVitals {
  return {
    id: v.id,
    patient_id: v.patientId,
    visit_id: Option.getOrNull(v.visitId),
    timestamp: v.timestamp.toISOString(),
    systolic_bp: Option.getOrNull(v.systolicBp),
    diastolic_bp: Option.getOrNull(v.diastolicBp),
    bp_position: Option.getOrNull(v.bpPosition),
    height_cm: Option.getOrNull(v.heightCm),
    weight_kg: Option.getOrNull(v.weightKg),
    bmi: Option.getOrNull(v.bmi),
    waist_circumference_cm: Option.getOrNull(v.waistCircumferenceCm),
    heart_rate: Option.getOrNull(v.heartRate),
    pulse_rate: Option.getOrNull(v.pulseRate),
    oxygen_saturation: Option.getOrNull(v.oxygenSaturation),
    respiratory_rate: Option.getOrNull(v.respiratoryRate),
    temperature_celsius: Option.getOrNull(v.temperatureCelsius),
    pain_level: Option.getOrNull(v.painLevel),
    recorded_by_user_id: Option.getOrNull(v.recordedByUserId),
    metadata: v.metadata,
    is_deleted: v.isDeleted,
    created_at: v.createdAt.toISOString(),
    updated_at: v.updatedAt.toISOString(),
    deleted_at: Option.getOrNull(v.deletedAt)?.toISOString() ?? null,
  }
}

/** CreateVitalsInput -> server payload for POST /api/vitals */
export function createVitalsToServer(input: CreateVitalsInput) {
  return {
    patient_id: input.patientId,
    visit_id: Option.getOrUndefined(input.visitId),
    timestamp: input.timestamp.toISOString(),
    systolic_bp: Option.getOrUndefined(input.systolicBp),
    diastolic_bp: Option.getOrUndefined(input.diastolicBp),
    bp_position: Option.getOrUndefined(input.bpPosition),
    height_cm: Option.getOrUndefined(input.heightCm),
    weight_kg: Option.getOrUndefined(input.weightKg),
    bmi: Option.getOrUndefined(input.bmi),
    waist_circumference_cm: Option.getOrUndefined(input.waistCircumferenceCm),
    heart_rate: Option.getOrUndefined(input.heartRate),
    pulse_rate: Option.getOrUndefined(input.pulseRate),
    oxygen_saturation: Option.getOrUndefined(input.oxygenSaturation),
    respiratory_rate: Option.getOrUndefined(input.respiratoryRate),
    temperature_celsius: Option.getOrUndefined(input.temperatureCelsius),
    pain_level: Option.getOrUndefined(input.painLevel),
    recorded_by_user_id: Option.getOrUndefined(input.recordedByUserId),
    metadata: input.metadata ?? {},
    is_deleted: input.isDeleted,
  }
}
