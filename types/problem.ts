/**
 * Problem/diagnosis input types for the DataProvider.
 * Aligns with PatientProblems.T in app/models/PatientProblems.ts.
 */

import type PatientProblems from "../app/models/PatientProblems"

/** Input for creating a new problem/diagnosis */
export type CreateProblemInput = Omit<
  PatientProblems.T,
  "id" | "createdAt" | "updatedAt" | "deletedAt"
>

/** Input for updating an existing problem/diagnosis */
export type UpdateProblemInput = Partial<
  Omit<PatientProblems.T, "id" | "patientId" | "createdAt">
>
