import fc from "fast-check"
import { Option } from "effect"

import PatientProblems from "../../app/models/PatientProblems"

/** Helper to build a PatientProblems.T with overrides */
function makeProblem(overrides: Partial<PatientProblems.T> = {}): PatientProblems.T {
  return { ...PatientProblems.empty, ...overrides }
}

describe("PatientProblems.isActive", () => {
  it("returns true for active status with no end date", () => {
    const p = makeProblem({ clinicalStatus: "active", endDate: Option.none() })
    expect(PatientProblems.isActive(p)).toBe(true)
  })

  it("returns false for active status with an end date", () => {
    const p = makeProblem({ clinicalStatus: "active", endDate: Option.some(new Date()) })
    expect(PatientProblems.isActive(p)).toBe(false)
  })

  it("returns false for non-active statuses", () => {
    const statuses: PatientProblems.ClinicalStatus[] = ["remission", "resolved", "unknown"]
    for (const status of statuses) {
      const p = makeProblem({ clinicalStatus: status, endDate: Option.none() })
      expect(PatientProblems.isActive(p)).toBe(false)
    }
  })
})

describe("PatientProblems.isChronic", () => {
  it("returns true for active problem with onset > 3 months ago", () => {
    const fourMonthsAgo = new Date()
    fourMonthsAgo.setMonth(fourMonthsAgo.getMonth() - 4)
    const p = makeProblem({
      clinicalStatus: "active",
      endDate: Option.none(),
      onsetDate: Option.some(fourMonthsAgo),
    })
    expect(PatientProblems.isChronic(p)).toBe(true)
  })

  it("returns false for active problem with recent onset", () => {
    const oneWeekAgo = new Date()
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)
    const p = makeProblem({
      clinicalStatus: "active",
      endDate: Option.none(),
      onsetDate: Option.some(oneWeekAgo),
    })
    expect(PatientProblems.isChronic(p)).toBe(false)
  })

  it("returns false for resolved problems regardless of onset date", () => {
    const longAgo = new Date()
    longAgo.setFullYear(longAgo.getFullYear() - 2)
    const p = makeProblem({
      clinicalStatus: "resolved",
      endDate: Option.none(),
      onsetDate: Option.some(longAgo),
    })
    expect(PatientProblems.isChronic(p)).toBe(false)
  })

  it("returns false when onset date is missing", () => {
    const p = makeProblem({
      clinicalStatus: "active",
      endDate: Option.none(),
      onsetDate: Option.none(),
    })
    expect(PatientProblems.isChronic(p)).toBe(false)
  })
})

describe("PatientProblems.getSeverityLabel", () => {
  it("returns 'Unknown' for none", () => {
    expect(PatientProblems.getSeverityLabel(Option.none())).toBe("Unknown")
  })

  it("returns correct labels for score ranges", () => {
    expect(PatientProblems.getSeverityLabel(Option.some(1))).toBe("Mild")
    expect(PatientProblems.getSeverityLabel(Option.some(3))).toBe("Mild")
    expect(PatientProblems.getSeverityLabel(Option.some(4))).toBe("Moderate")
    expect(PatientProblems.getSeverityLabel(Option.some(6))).toBe("Moderate")
    expect(PatientProblems.getSeverityLabel(Option.some(7))).toBe("Severe")
    expect(PatientProblems.getSeverityLabel(Option.some(8))).toBe("Severe")
    expect(PatientProblems.getSeverityLabel(Option.some(9))).toBe("Critical")
    expect(PatientProblems.getSeverityLabel(Option.some(10))).toBe("Critical")
  })

  it("maps all scores 1-10 to a known label (property)", () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 10 }), (score) => {
        const label = PatientProblems.getSeverityLabel(Option.some(score))
        expect(["Mild", "Moderate", "Severe", "Critical"]).toContain(label)
      }),
    )
  })
})

describe("PatientProblems.groupByClinicalStatus", () => {
  it("groups problems correctly", () => {
    const problems = [
      makeProblem({ clinicalStatus: "active", problemCode: "A" }),
      makeProblem({ clinicalStatus: "resolved", problemCode: "B" }),
      makeProblem({ clinicalStatus: "active", problemCode: "C" }),
    ]
    const grouped = PatientProblems.groupByClinicalStatus(problems)
    expect(grouped.active).toHaveLength(2)
    expect(grouped.resolved).toHaveLength(1)
  })

  it("returns empty groups for empty input", () => {
    const grouped = PatientProblems.groupByClinicalStatus([])
    expect(Object.keys(grouped)).toHaveLength(0)
  })
})

describe("PatientProblems.formatProblem", () => {
  it("formats an active problem", () => {
    const p = makeProblem({
      problemLabel: "Type 2 diabetes",
      problemCode: "E11.9",
      clinicalStatus: "active",
    })
    expect(PatientProblems.formatProblem(p)).toBe("Type 2 diabetes (E11.9) - Active")
  })

  it("formats a resolved problem", () => {
    const p = makeProblem({
      problemLabel: "Cholera",
      problemCode: "1A00",
      clinicalStatus: "resolved",
    })
    expect(PatientProblems.formatProblem(p)).toBe("Cholera (1A00) - Resolved")
  })

  it("formats a remission problem", () => {
    const p = makeProblem({
      problemLabel: "Asthma",
      problemCode: "J45",
      clinicalStatus: "remission",
    })
    expect(PatientProblems.formatProblem(p)).toBe("Asthma (J45) - In Remission")
  })

  it("formats unknown status", () => {
    const p = makeProblem({
      problemLabel: "Unknown condition",
      problemCode: "X00",
      clinicalStatus: "unknown",
    })
    expect(PatientProblems.formatProblem(p)).toBe("Unknown condition (X00) - Unknown")
  })
})
