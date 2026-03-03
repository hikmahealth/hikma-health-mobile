/**
 * Vitals input types for the DataProvider.
 * Aligns with PatientVitals.T in app/models/PatientVitals.ts.
 */

import type PatientVitals from "../app/models/PatientVitals"

/** Input for creating a new vitals record */
export type CreateVitalsInput = Omit<PatientVitals.T, "id" | "createdAt" | "updatedAt" | "deletedAt">
