/**
 * Tests for pure functions exported from EventListItem.
 *
 * getDiagnosesFromFormData — extracts ICD entries from form data
 * getHtmlEventDisplay — generates HTML string for patient reports
 *
 * Adversarial focus: XSS in name fields, null entries in medicine arrays,
 * empty/malformed data, property-based invariants.
 */

import fc from "fast-check"

import { getDiagnosesFromFormData, getHtmlEventDisplay } from "../../app/components/EventListItem"
import type Event from "../../app/models/Event"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Minimal EventModel-like object for getHtmlEventDisplay */
function makeEvent(formData: Event.FormDataItem[]): any {
  return { eventType: "test-form", formData }
}

// ---------------------------------------------------------------------------
// getDiagnosesFromFormData
// ---------------------------------------------------------------------------

describe("getDiagnosesFromFormData", () => {
  it("returns empty array for empty formData", () => {
    expect(getDiagnosesFromFormData([])).toEqual([])
  })

  it("returns empty array when no diagnosis fields exist", () => {
    const formData: Event.FormDataItem[] = [
      { inputType: "text", fieldType: "text", name: "Notes", value: "some text", fieldId: "1" },
    ]
    expect(getDiagnosesFromFormData(formData)).toEqual([])
  })

  it("extracts diagnoses from a diagnosis field", () => {
    const icdEntries = [
      { code: "E11", desc: "Type 2 diabetes" },
      { code: "I10", desc: "Hypertension" },
    ]
    const formData: Event.FormDataItem[] = [
      {
        inputType: "select",
        fieldType: "diagnosis",
        name: "Diagnosis",
        value: icdEntries,
        fieldId: "1",
      },
    ]
    const result = getDiagnosesFromFormData(formData)
    expect(result).toEqual(icdEntries)
  })

  it("flattens multiple diagnosis fields", () => {
    const entries1 = [{ code: "E11", desc: "Diabetes" }]
    const entries2 = [{ code: "I10", desc: "Hypertension" }]
    const formData: Event.FormDataItem[] = [
      {
        inputType: "select",
        fieldType: "diagnosis",
        name: "Primary",
        value: entries1,
        fieldId: "1",
      },
      {
        inputType: "select",
        fieldType: "diagnosis",
        name: "Secondary",
        value: entries2,
        fieldId: "2",
      },
    ]
    const result = getDiagnosesFromFormData(formData)
    expect(result).toHaveLength(2)
    expect(result).toContainEqual({ code: "E11", desc: "Diabetes" })
    expect(result).toContainEqual({ code: "I10", desc: "Hypertension" })
  })

  it("handles diagnosis field with empty array value", () => {
    const formData: Event.FormDataItem[] = [
      { inputType: "select", fieldType: "diagnosis", name: "Diagnosis", value: [], fieldId: "1" },
    ]
    expect(getDiagnosesFromFormData(formData)).toEqual([])
  })

  it("handles diagnosis field with non-array value gracefully", () => {
    const formData: Event.FormDataItem[] = [
      {
        inputType: "select",
        fieldType: "diagnosis",
        name: "Diagnosis",
        value: "not-an-array" as any,
        fieldId: "1",
      },
    ]
    // value is not an array → the map returns undefined → filtered out
    const result = getDiagnosesFromFormData(formData)
    expect(Array.isArray(result)).toBe(true)
    // Should not contain undefined
    expect(result.every((item) => item !== undefined)).toBe(true)
  })

  it("property: output is always an array with no undefined entries", () => {
    const arbICD = fc.record({ code: fc.string(), desc: fc.string() })
    const arbDiagField = fc.record({
      inputType: fc.constant("select"),
      fieldType: fc.constant("diagnosis" as const),
      name: fc.string(),
      value: fc.array(arbICD),
      fieldId: fc.string(),
    })
    const arbOtherField = fc.record({
      inputType: fc.constant("text"),
      fieldType: fc.constant("text" as const),
      name: fc.string(),
      value: fc.string(),
      fieldId: fc.string(),
    })
    const arbFormData = fc.array(fc.oneof(arbDiagField, arbOtherField))

    fc.assert(
      fc.property(arbFormData, (formData) => {
        const result = getDiagnosesFromFormData(formData as Event.FormDataItem[])
        expect(Array.isArray(result)).toBe(true)
        expect(result.every((item) => item !== undefined)).toBe(true)
      }),
      { numRuns: 50 },
    )
  })
})

// ---------------------------------------------------------------------------
// getHtmlEventDisplay
// ---------------------------------------------------------------------------

describe("getHtmlEventDisplay", () => {
  it("returns empty string for empty formData", () => {
    const event = makeEvent([])
    const result = getHtmlEventDisplay(event, "en")
    expect(result).toBe("")
  })

  it("renders a simple text field", () => {
    const event = makeEvent([
      {
        inputType: "text",
        fieldType: "text",
        name: "Notes",
        value: "Patient stable",
        fieldId: "1",
      },
    ])
    const result = getHtmlEventDisplay(event, "en")
    expect(result).toContain("Notes:")
    expect(result).toContain("Patient stable")
  })

  it("renders diagnosis entries with ICD labels", () => {
    const event = makeEvent([
      {
        inputType: "select",
        fieldType: "diagnosis",
        name: "Diagnosis",
        value: [{ code: "E11", desc: "Type 2 diabetes" }],
        fieldId: "1",
      },
    ])
    const result = getHtmlEventDisplay(event, "en")
    expect(result).toContain("Diagnosis:")
    expect(result).toContain("Type 2 diabetes (E11)")
  })

  it("renders medicine entries", () => {
    const event = makeEvent([
      {
        inputType: "input-group",
        fieldType: "medicine",
        name: "Medications",
        value: [
          {
            id: "m1",
            name: "amoxicillin",
            dose: "500",
            doseUnits: "mg",
            route: "oral",
            form: "tablet",
            frequency: "3x/day",
          },
        ],
        fieldId: "1",
      },
    ])
    const result = getHtmlEventDisplay(event, "en")
    expect(result).toContain("Medications:")
    expect(result).toContain("500 mg")
    expect(result).toContain("Oral Tablet: 3x/day")
  })

  it("XSS: script tag in name field is HTML-escaped", () => {
    const xssPayload = '<script>alert("xss")</script>'
    const event = makeEvent([
      { inputType: "text", fieldType: "text", name: xssPayload, value: "safe", fieldId: "1" },
    ])
    const result = getHtmlEventDisplay(event, "en")
    // Raw XSS payload must NOT appear in output
    expect(result).not.toContain("<script>")
    // Escaped version should be present
    expect(result).toContain("&lt;script&gt;")
  })

  it("XSS: img onerror in value field is HTML-escaped", () => {
    const xssPayload = "<img src=x onerror=alert(1)>"
    const event = makeEvent([
      { inputType: "text", fieldType: "text", name: "Notes", value: xssPayload, fieldId: "1" },
    ])
    const result = getHtmlEventDisplay(event, "en")
    expect(result).not.toContain("<img")
    expect(result).toContain("&lt;img")
  })

  it("handles medicine entry with null properties without crash", () => {
    const event = makeEvent([
      {
        inputType: "input-group",
        fieldType: "medicine",
        name: "Medications",
        value: [
          {
            id: "m1",
            name: null,
            dose: null,
            doseUnits: null,
            route: null,
            form: null,
            frequency: null,
          },
        ],
        fieldId: "1",
      },
    ])
    // Should not crash — uses String(med.dose || "") pattern
    const result = getHtmlEventDisplay(event, "en")
    expect(typeof result).toBe("string")
  })

  it("handles diagnosis field with non-array value without crash", () => {
    const event = makeEvent([
      {
        inputType: "select",
        fieldType: "diagnosis",
        name: "Diagnosis",
        value: "not-array" as any,
        fieldId: "1",
      },
    ])
    // The guard `if (Array.isArray(value))` should prevent crash
    const result = getHtmlEventDisplay(event, "en")
    expect(typeof result).toBe("string")
  })

  it("handles medicine field with non-array value without crash", () => {
    const event = makeEvent([
      {
        inputType: "input-group",
        fieldType: "medicine",
        name: "Meds",
        value: "not-array" as any,
        fieldId: "1",
      },
    ])
    const result = getHtmlEventDisplay(event, "en")
    expect(typeof result).toBe("string")
  })

  it("handles null entries in medicine array without crash", () => {
    const event = makeEvent([
      {
        inputType: "input-group",
        fieldType: "medicine",
        name: "Medications",
        value: [
          null,
          undefined,
          {
            id: "m1",
            name: "aspirin",
            dose: "100",
            doseUnits: "mg",
            route: "oral",
            form: "tablet",
            frequency: "daily",
          },
        ],
        fieldId: "1",
      },
    ])
    const result = getHtmlEventDisplay(event, "en")
    expect(typeof result).toBe("string")
    expect(result).toContain("100 mg")
  })
})
