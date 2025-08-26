import { Q } from "@nozbe/watermelondb"
import { Option } from "effect"

import database from "@/db"
import PatientProblemModel from "@/db/model/PatientProblems"

namespace PatientProblems {
  export type ProblemCodeSystem = "icd10cm" | "snomed" | "icd11" | "icd10"
  export type ClinicalStatus = "active" | "remission" | "resolved" | "unknown"
  export type VerificationStatus = "provisional" | "confirmed" | "refuted" | "unconfirmed"

  export type T = {
    id: string
    patientId: string
    visitId: Option.Option<string>
    problemCodeSystem: ProblemCodeSystem
    problemCode: string
    problemLabel: string
    clinicalStatus: ClinicalStatus
    verificationStatus: VerificationStatus
    severityScore: Option.Option<number>
    onsetDate: Option.Option<Date>
    endDate: Option.Option<Date>
    recordedByUserId: Option.Option<string>
    metadata: Record<string, any>
    isDeleted: boolean
    createdAt: Date
    updatedAt: Date
    deletedAt: Option.Option<Date>
  }

  /** Default empty PatientProblems Item */
  export const empty: T = {
    id: "",
    patientId: "",
    visitId: Option.none(),
    problemCodeSystem: "icd10",
    problemCode: "",
    problemLabel: "",
    clinicalStatus: "active",
    verificationStatus: "provisional",
    severityScore: Option.none(),
    onsetDate: Option.none(),
    endDate: Option.none(),
    recordedByUserId: Option.none(),
    metadata: {},
    isDeleted: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: Option.none(),
  }

  /**
   * Examples of Common ICD-10 codes for quick reference
   */
  export const CommonICD10Codes = {
    // Endocrine, nutritional and metabolic diseases
    DIABETES_TYPE2: { code: "E11.9", label: "Type 2 diabetes mellitus without complications" },
    DIABETES_TYPE1: { code: "E10.9", label: "Type 1 diabetes mellitus without complications" },
    HYPERLIPIDEMIA: { code: "E78.5", label: "Hyperlipidemia, unspecified" },
    OBESITY: { code: "E66.9", label: "Obesity, unspecified" },

    // Circulatory system
    HYPERTENSION: { code: "I10", label: "Essential (primary) hypertension" },
    HEART_FAILURE: { code: "I50.9", label: "Heart failure, unspecified" },
    ATRIAL_FIBRILLATION: { code: "I48.91", label: "Unspecified atrial fibrillation" },

    // Respiratory system
    ASTHMA: { code: "J45.909", label: "Unspecified asthma, uncomplicated" },
    COPD: {
      code: "J44.0",
      label: "Chronic obstructive pulmonary disease with acute lower respiratory infection",
    },
    PNEUMONIA: { code: "J18.9", label: "Pneumonia, unspecified organism" },

    // Mental and behavioral disorders
    DEPRESSION: { code: "F32.9", label: "Major depressive disorder, single episode, unspecified" },
    ANXIETY: { code: "F41.9", label: "Anxiety disorder, unspecified" },

    // Musculoskeletal system
    BACK_PAIN: { code: "M54.5", label: "Low back pain" },
    ARTHRITIS: { code: "M19.90", label: "Unspecified osteoarthritis, unspecified site" },

    // Digestive system
    GERD: { code: "K21.9", label: "Gastro-esophageal reflux disease without esophagitis" },
    GASTRITIS: { code: "K29.70", label: "Gastritis, unspecified, without bleeding" },
  }

  /**
   * Check if a problem is currently active
   * @param problem Patient problem
   * @returns True if problem is active
   */
  export const isActive = (problem: T): boolean => {
    return problem.clinicalStatus === "active" && !Option.isSome(problem.endDate)
  }

  /**
   * Check if a problem is chronic (active for more than 3 months)
   * @param problem Patient problem
   * @returns True if problem is chronic
   */
  export const isChronic = (problem: T): boolean => {
    if (!isActive(problem)) return false

    const onsetDate = Option.getOrNull(problem.onsetDate)
    if (!onsetDate) return false

    const threeMonthsAgo = new Date()
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)

    return onsetDate < threeMonthsAgo
  }

  /**
   * Get severity label from score
   * @param score Severity score (1-10)
   * @returns Severity label
   */
  export const getSeverityLabel = (score: Option.Option<number>): string => {
    const value = Option.getOrNull(score)
    if (!value) return "Unknown"

    if (value <= 3) return "Mild"
    if (value <= 6) return "Moderate"
    if (value <= 8) return "Severe"
    return "Critical"
  }

  /**
   * Group problems by clinical status
   * @param problems Array of patient problems
   * @returns Grouped problems
   */
  export const groupByClinicalStatus = (problems: T[]): Record<ClinicalStatus, T[]> => {
    return problems.reduce(
      (acc, problem) => {
        const status = problem.clinicalStatus
        if (!acc[status]) acc[status] = []
        acc[status].push(problem)
        return acc
      },
      {} as Record<ClinicalStatus, T[]>,
    )
  }

  /**
   * Format problem for display
   * @param problem Patient problem
   * @returns Formatted problem string
   */
  export const formatProblem = (problem: T): string => {
    const status =
      problem.clinicalStatus === "active"
        ? "Active"
        : problem.clinicalStatus === "resolved"
          ? "Resolved"
          : problem.clinicalStatus === "remission"
            ? "In Remission"
            : "Unknown"

    return `${problem.problemLabel} (${problem.problemCode}) - ${status}`
  }

  export namespace DB {
    export type T = PatientProblemModel

    /**
     * Create a new patient problem
     * @param problem Problem data to create
     * @returns Promise with created problem ID
     */
    export const create = async (
      problem: Omit<PatientProblems.T, "id" | "createdAt" | "updatedAt" | "deletedAt">,
    ): Promise<string> => {
      return await database.write(async () => {
        const problemRecord = await database
          .get<PatientProblemModel>("patient_problems")
          .create((newProblem) => {
            newProblem.patientId = problem.patientId
            newProblem.visitId = Option.getOrUndefined(problem.visitId)
            newProblem.problemCodeSystem = problem.problemCodeSystem
            newProblem.problemCode = problem.problemCode
            newProblem.problemLabel = problem.problemLabel
            newProblem.clinicalStatus = problem.clinicalStatus
            newProblem.verificationStatus = problem.verificationStatus
            newProblem.severityScore = Option.getOrUndefined(problem.severityScore)
            newProblem.onsetDate = Option.getOrUndefined(problem.onsetDate)
            newProblem.endDate = Option.getOrUndefined(problem.endDate)
            newProblem.recordedByUserId = Option.getOrUndefined(problem.recordedByUserId) || ""
            newProblem.metadata = problem.metadata || {}
            newProblem.isDeleted = problem.isDeleted || false
          })

        return problemRecord.id
      })
    }

    /**
     * Update a patient problem
     * @param problemId Problem ID to update
     * @param updates Partial problem updates
     * @returns Promise with updated problem ID
     */
    export const update = async (
      problemId: string,
      updates: Partial<Omit<PatientProblems.T, "id" | "patientId" | "createdAt">>,
    ): Promise<string> => {
      return await database.write(async () => {
        const problem = await database.get<PatientProblemModel>("patient_problems").find(problemId)

        const updated = await problem.update((prob) => {
          if (updates.clinicalStatus !== undefined) {
            prob.clinicalStatus = updates.clinicalStatus
          }
          if (updates.verificationStatus !== undefined) {
            prob.verificationStatus = updates.verificationStatus
          }
          if (updates.severityScore !== undefined && Option.isSome(updates.severityScore)) {
            prob.severityScore = updates.severityScore.value
          }
          if (updates.endDate !== undefined && Option.isSome(updates.endDate)) {
            prob.endDate = updates.endDate.value
          }
          if (updates.metadata !== undefined) {
            prob.metadata = updates.metadata
          }
        })

        return updated.id
      })
    }

    /**
     * Get all active problems for a patient
     * @param patientId Patient ID
     * @returns Array of active problems
     */
    export const getActiveForPatient = async (patientId: string): Promise<PatientProblems.T[]> => {
      const problems = await database
        .get<PatientProblemModel>("patient_problems")
        .query(
          Q.where("patient_id", patientId),
          Q.where("clinical_status", "active"),
          Q.where("is_deleted", false),
          Q.sortBy("onset_date", Q.desc),
        )
        .fetch()

      return problems.map(fromDB)
    }

    /**
     * Get all problems for a patient
     * @param patientId Patient ID
     * @returns Array of all problems
     */
    export const getAllForPatient = async (patientId: string): Promise<PatientProblems.T[]> => {
      const problems = await database
        .get<PatientProblemModel>("patient_problems")
        .query(
          Q.where("patient_id", patientId),
          Q.where("is_deleted", false),
          Q.sortBy("onset_date", Q.desc),
        )
        .fetch()

      return problems.map(fromDB)
    }

    /**
     * Get problems for a specific visit
     * @param visitId Visit ID
     * @returns Array of problems
     */
    export const getForVisit = async (visitId: string): Promise<PatientProblems.T[]> => {
      const problems = await database
        .get<PatientProblemModel>("patient_problems")
        .query(Q.where("visit_id", visitId), Q.where("is_deleted", false))
        .fetch()

      return problems.map(fromDB)
    }

    /**
     * Mark a problem as resolved
     * @param problemId Problem ID
     * @param endDate End date (defaults to now)
     * @returns Promise with resolved problem ID
     */
    export const resolve = async (
      problemId: string,
      endDate: Date = new Date(),
    ): Promise<string> => {
      return await database.write(async () => {
        const problem = await database.get<PatientProblemModel>("patient_problems").find(problemId)

        const updated = await problem.update((prob) => {
          prob.clinicalStatus = "resolved"
          prob.endDate = endDate
        })

        return updated.id
      })
    }

    /**
     * Subscribe to patient problems updates
     * @param patientId Patient ID
     * @param callback Function called when problems data updates
     * @returns Object containing unsubscribe function
     */
    export function subscribe(
      patientId: string,
      callback: (problems: Option.Option<PatientProblems.T[]>, isLoading: boolean) => void,
    ): { unsubscribe: () => void } {
      let isLoading = true

      const subscription = database
        .get<PatientProblemModel>("patient_problems")
        .query(
          Q.where("patient_id", patientId),
          Q.where("is_deleted", false),
          Q.sortBy("onset_date", Q.desc),
        )
        .observe()
        .subscribe((dbProblems) => {
          const problems = dbProblems.map(fromDB)
          callback(Option.fromNullable(problems), isLoading)
          isLoading = false
        })

      return {
        unsubscribe: () => subscription.unsubscribe(),
      }
    }

    /**
     * Convert from PatientProblemModel to PatientProblems.T
     * @param dbProblem The PatientProblemModel to convert
     * @returns The converted PatientProblems.T
     */
    export const fromDB = (dbProblem: DB.T): PatientProblems.T => ({
      id: dbProblem.id,
      patientId: dbProblem.patient.id,
      visitId: Option.fromNullable(dbProblem.visit?.id),
      problemCodeSystem: dbProblem.problemCodeSystem as ProblemCodeSystem,
      problemCode: dbProblem.problemCode,
      problemLabel: dbProblem.problemLabel,
      clinicalStatus: dbProblem.clinicalStatus as ClinicalStatus,
      verificationStatus: dbProblem.verificationStatus as VerificationStatus,
      severityScore: Option.fromNullable(dbProblem.severityScore),
      onsetDate: Option.fromNullable(dbProblem.onsetDate),
      endDate: Option.fromNullable(dbProblem.endDate),
      recordedByUserId: Option.fromNullable(dbProblem.recordedByUser?.id),
      metadata: dbProblem.metadata || {},
      isDeleted: dbProblem.isDeleted,
      createdAt: dbProblem.createdAt,
      updatedAt: dbProblem.updatedAt,
      deletedAt: Option.fromNullable(dbProblem.deletedAt),
    })
  }
}

export default PatientProblems
