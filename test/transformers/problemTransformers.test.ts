import { Option } from "effect"
import {
  problemFromServer,
  problemToServer,
  createProblemToServer,
  updateProblemToServer,
  type ServerProblem,
} from "../../app/providers/transformers/problemTransformers"
import type { CreateProblemInput, UpdateProblemInput } from "../../types/problem"

const MOCK_SERVER_PROBLEM: ServerProblem = {
  id: "prob1",
  patient_id: "p1",
  visit_id: "vis1",
  problem_code_system: "icd11",
  problem_code: "BA00",
  problem_label: "Essential hypertension",
  clinical_status: "active",
  verification_status: "confirmed",
  severity_score: 5,
  onset_date: "2024-01-15T00:00:00.000Z",
  end_date: null,
  recorded_by_user_id: "user1",
  metadata: { notes: "review needed" },
  is_deleted: false,
  created_at: "2024-01-15T10:00:00.000Z",
  updated_at: "2024-06-01T10:00:00.000Z",
  deleted_at: null,
}

describe("problemTransformers", () => {
  describe("problemFromServer", () => {
    it("maps snake_case server problem to camelCase domain type", () => {
      const result = problemFromServer(MOCK_SERVER_PROBLEM)

      expect(result.id).toBe("prob1")
      expect(result.patientId).toBe("p1")
      expect(Option.getOrNull(result.visitId)).toBe("vis1")
      expect(result.problemCodeSystem).toBe("icd11")
      expect(result.problemCode).toBe("BA00")
      expect(result.problemLabel).toBe("Essential hypertension")
      expect(result.clinicalStatus).toBe("active")
      expect(result.verificationStatus).toBe("confirmed")
      expect(Option.getOrNull(result.severityScore)).toBe(5)
      expect(Option.isSome(result.onsetDate)).toBe(true)
      expect(Option.isNone(result.endDate)).toBe(true)
      expect(result.metadata).toEqual({ notes: "review needed" })
    })

    it("wraps null fields in Option.none()", () => {
      const serverWithNulls: ServerProblem = {
        ...MOCK_SERVER_PROBLEM,
        visit_id: null,
        severity_score: null,
        onset_date: null,
        recorded_by_user_id: null,
      }
      const result = problemFromServer(serverWithNulls)

      expect(Option.isNone(result.visitId)).toBe(true)
      expect(Option.isNone(result.severityScore)).toBe(true)
      expect(Option.isNone(result.onsetDate)).toBe(true)
      expect(Option.isNone(result.recordedByUserId)).toBe(true)
    })
  })

  describe("round-trip: problemFromServer -> problemToServer", () => {
    it("preserves all fields through round-trip", () => {
      const domain = problemFromServer(MOCK_SERVER_PROBLEM)
      const backToServer = problemToServer(domain)

      expect(backToServer.id).toBe(MOCK_SERVER_PROBLEM.id)
      expect(backToServer.patient_id).toBe(MOCK_SERVER_PROBLEM.patient_id)
      expect(backToServer.visit_id).toBe(MOCK_SERVER_PROBLEM.visit_id)
      expect(backToServer.problem_code_system).toBe(MOCK_SERVER_PROBLEM.problem_code_system)
      expect(backToServer.problem_code).toBe(MOCK_SERVER_PROBLEM.problem_code)
      expect(backToServer.problem_label).toBe(MOCK_SERVER_PROBLEM.problem_label)
      expect(backToServer.clinical_status).toBe(MOCK_SERVER_PROBLEM.clinical_status)
      expect(backToServer.verification_status).toBe(MOCK_SERVER_PROBLEM.verification_status)
      expect(backToServer.severity_score).toBe(MOCK_SERVER_PROBLEM.severity_score)
      expect(backToServer.is_deleted).toBe(MOCK_SERVER_PROBLEM.is_deleted)
      expect(backToServer.metadata).toEqual(MOCK_SERVER_PROBLEM.metadata)
    })
  })

  describe("createProblemToServer", () => {
    it("maps CreateProblemInput to server payload", () => {
      const input: CreateProblemInput = {
        patientId: "p1",
        visitId: Option.none(),
        problemCodeSystem: "icd11",
        problemCode: "BA00",
        problemLabel: "Essential hypertension",
        clinicalStatus: "active",
        verificationStatus: "provisional",
        severityScore: Option.some(3),
        onsetDate: Option.some(new Date("2024-01-15T00:00:00.000Z")),
        endDate: Option.none(),
        recordedByUserId: Option.some("user1"),
        metadata: {},
        isDeleted: false,
      }

      const result = createProblemToServer(input)

      expect(result.patient_id).toBe("p1")
      expect(result.visit_id).toBeUndefined()
      expect(result.problem_code_system).toBe("icd11")
      expect(result.problem_code).toBe("BA00")
      expect(result.clinical_status).toBe("active")
      expect(result.severity_score).toBe(3)
      expect(result.onset_date).toBe("2024-01-15T00:00:00.000Z")
      expect(result.end_date).toBeUndefined()
    })
  })

  describe("updateProblemToServer", () => {
    it("maps UpdateProblemInput to partial server payload", () => {
      const input: UpdateProblemInput = {
        clinicalStatus: "resolved",
        endDate: Option.some(new Date("2024-06-01T00:00:00.000Z")),
      }

      const result = updateProblemToServer(input)

      expect(result.clinical_status).toBe("resolved")
      expect(result.end_date).toBe("2024-06-01T00:00:00.000Z")
      // Fields not in input should not appear
      expect(result).not.toHaveProperty("severity_score")
      expect(result).not.toHaveProperty("verification_status")
    })
  })
})
