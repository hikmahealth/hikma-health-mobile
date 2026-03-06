/**
 * Problem/diagnosis transformers: snake_case server <-> camelCase domain model.
 */

import { Option } from "effect"
import PatientProblems from "@/models/PatientProblems"
import type { CreateProblemInput, UpdateProblemInput } from "../../../types/problem"

/** Server-side problem shape (snake_case) */
export type ServerProblem = {
  id: string
  patient_id: string
  visit_id: string | null
  problem_code_system: string
  problem_code: string
  problem_label: string
  clinical_status: string
  verification_status: string
  severity_score: number | null
  onset_date: string | null
  end_date: string | null
  recorded_by_user_id: string | null
  metadata: Record<string, any>
  is_deleted: boolean
  created_at: string
  updated_at: string
  deleted_at: string | null
}

/** Server problem -> domain PatientProblems.T */
export function problemFromServer(s: ServerProblem): PatientProblems.T {
  return {
    id: s.id,
    patientId: s.patient_id,
    visitId: Option.fromNullable(s.visit_id),
    problemCodeSystem: s.problem_code_system as PatientProblems.ProblemCodeSystem,
    problemCode: s.problem_code,
    problemLabel: s.problem_label,
    clinicalStatus: s.clinical_status as PatientProblems.ClinicalStatus,
    verificationStatus: s.verification_status as PatientProblems.VerificationStatus,
    severityScore: Option.fromNullable(s.severity_score),
    onsetDate: Option.fromNullable(s.onset_date ? new Date(s.onset_date) : null),
    endDate: Option.fromNullable(s.end_date ? new Date(s.end_date) : null),
    recordedByUserId: Option.fromNullable(s.recorded_by_user_id),
    metadata: s.metadata ?? {},
    isDeleted: s.is_deleted,
    createdAt: new Date(s.created_at),
    updatedAt: new Date(s.updated_at),
    deletedAt: Option.fromNullable(s.deleted_at ? new Date(s.deleted_at) : null),
  }
}

/** Domain PatientProblems.T -> server problem shape */
export function problemToServer(p: PatientProblems.T): ServerProblem {
  return {
    id: p.id,
    patient_id: p.patientId,
    visit_id: Option.getOrNull(p.visitId),
    problem_code_system: p.problemCodeSystem,
    problem_code: p.problemCode,
    problem_label: p.problemLabel,
    clinical_status: p.clinicalStatus,
    verification_status: p.verificationStatus,
    severity_score: Option.getOrNull(p.severityScore),
    onset_date: Option.getOrNull(p.onsetDate)?.toISOString() ?? null,
    end_date: Option.getOrNull(p.endDate)?.toISOString() ?? null,
    recorded_by_user_id: Option.getOrNull(p.recordedByUserId),
    metadata: p.metadata,
    is_deleted: p.isDeleted,
    created_at: p.createdAt.toISOString(),
    updated_at: p.updatedAt.toISOString(),
    deleted_at: Option.getOrNull(p.deletedAt)?.toISOString() ?? null,
  }
}

/** CreateProblemInput -> server payload for POST /api/problems */
export function createProblemToServer(input: CreateProblemInput) {
  return {
    patient_id: input.patientId,
    visit_id: Option.getOrUndefined(input.visitId),
    problem_code_system: input.problemCodeSystem,
    problem_code: input.problemCode,
    problem_label: input.problemLabel,
    clinical_status: input.clinicalStatus,
    verification_status: input.verificationStatus,
    severity_score: Option.getOrUndefined(input.severityScore),
    onset_date: Option.getOrNull(input.onsetDate)?.toISOString(),
    end_date: Option.getOrNull(input.endDate)?.toISOString(),
    recorded_by_user_id: Option.getOrUndefined(input.recordedByUserId),
    metadata: input.metadata ?? {},
    is_deleted: input.isDeleted,
  }
}

/** UpdateProblemInput -> server payload for PUT /api/problems/:id */
export function updateProblemToServer(input: UpdateProblemInput) {
  const payload: Record<string, any> = {}
  if (input.clinicalStatus !== undefined) payload.clinical_status = input.clinicalStatus
  if (input.verificationStatus !== undefined) payload.verification_status = input.verificationStatus
  if (input.severityScore !== undefined)
    payload.severity_score = Option.getOrNull(input.severityScore)
  if (input.onsetDate !== undefined)
    payload.onset_date = Option.getOrNull(input.onsetDate)?.toISOString() ?? null
  if (input.endDate !== undefined)
    payload.end_date = Option.getOrNull(input.endDate)?.toISOString() ?? null
  if (input.metadata !== undefined) payload.metadata = input.metadata
  return payload
}
