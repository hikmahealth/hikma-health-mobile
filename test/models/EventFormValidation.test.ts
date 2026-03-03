/**
 * Tests for EventForm.getMissingRequiredFields
 *
 * Validates required-field enforcement logic used by EventFormScreen
 * before submission. Combines deterministic unit tests with fast-check
 * property-based tests for robustness.
 */

import fc from "fast-check"
import { Option } from "effect"

import EventForm from "../../app/models/EventForm"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a minimal FieldItem with sensible defaults */
function makeField(
  overrides: Partial<EventForm.FieldItem> & Pick<EventForm.FieldItem, "name">,
): EventForm.FieldItem {
  return {
    id: overrides.id ?? overrides.name,
    name: overrides.name,
    fieldType: overrides.fieldType ?? "free-text",
    inputType: overrides.inputType ?? "text",
    multi: overrides.multi ?? Option.none(),
    options: overrides.options ?? Option.none(),
    required: overrides.required ?? false,
    ...overrides,
  }
}

/** Shorthand for a required text field */
function requiredText(name: string): EventForm.FieldItem {
  return makeField({ name, required: true, fieldType: "free-text", inputType: "text" })
}

/** Empty context — no fields, no data */
const emptyCtx: EventForm.RequiredFieldContext = {
  formFields: [],
  data: {},
  diagnoses: [],
  medicines: [],
  fileUploads: {},
}

// ---------------------------------------------------------------------------
// Unit tests — deterministic edge cases
// ---------------------------------------------------------------------------

describe("EventForm.getMissingRequiredFields", () => {
  it("returns empty array when there are no form fields", () => {
    expect(EventForm.getMissingRequiredFields(emptyCtx)).toEqual([])
  })

  it("returns empty array when no fields are required", () => {
    const ctx: EventForm.RequiredFieldContext = {
      ...emptyCtx,
      formFields: [
        makeField({ name: "notes", required: false }),
        makeField({ name: "age", required: false, inputType: "number" }),
      ],
      data: {},
    }
    expect(EventForm.getMissingRequiredFields(ctx)).toEqual([])
  })

  // ---- text / generic inputs ----

  it("flags a required text field when data value is undefined", () => {
    const ctx: EventForm.RequiredFieldContext = {
      ...emptyCtx,
      formFields: [requiredText("chief_complaint")],
      data: {},
    }
    expect(EventForm.getMissingRequiredFields(ctx)).toEqual(["chief_complaint"])
  })

  it("flags a required text field when data value is null", () => {
    const ctx: EventForm.RequiredFieldContext = {
      ...emptyCtx,
      formFields: [requiredText("chief_complaint")],
      data: { chief_complaint: null },
    }
    expect(EventForm.getMissingRequiredFields(ctx)).toEqual(["chief_complaint"])
  })

  it("flags a required text field when data value is an empty string", () => {
    const ctx: EventForm.RequiredFieldContext = {
      ...emptyCtx,
      formFields: [requiredText("chief_complaint")],
      data: { chief_complaint: "" },
    }
    expect(EventForm.getMissingRequiredFields(ctx)).toEqual(["chief_complaint"])
  })

  it("flags a required text field when data value is whitespace only", () => {
    const whitespaceVariants = [" ", "  ", "\t", "\n", " \t\n "]
    for (const ws of whitespaceVariants) {
      const ctx: EventForm.RequiredFieldContext = {
        ...emptyCtx,
        formFields: [requiredText("notes")],
        data: { notes: ws },
      }
      expect(EventForm.getMissingRequiredFields(ctx)).toEqual(["notes"])
    }
  })

  it("passes a required text field when data value is a non-empty string", () => {
    const ctx: EventForm.RequiredFieldContext = {
      ...emptyCtx,
      formFields: [requiredText("notes")],
      data: { notes: "Patient has fever" },
    }
    expect(EventForm.getMissingRequiredFields(ctx)).toEqual([])
  })

  it("passes a required number field when data value is 0", () => {
    const ctx: EventForm.RequiredFieldContext = {
      ...emptyCtx,
      formFields: [makeField({ name: "age", required: true, inputType: "number" })],
      data: { age: 0 },
    }
    expect(EventForm.getMissingRequiredFields(ctx)).toEqual([])
  })

  it("passes a required field when data value is a number", () => {
    const ctx: EventForm.RequiredFieldContext = {
      ...emptyCtx,
      formFields: [makeField({ name: "weight", required: true, inputType: "number" })],
      data: { weight: 72.5 },
    }
    expect(EventForm.getMissingRequiredFields(ctx)).toEqual([])
  })

  // ---- select / radio / checkbox ----

  it("flags a required select field when value is empty string", () => {
    const ctx: EventForm.RequiredFieldContext = {
      ...emptyCtx,
      formFields: [makeField({ name: "severity", required: true, inputType: "select" })],
      data: { severity: "" },
    }
    expect(EventForm.getMissingRequiredFields(ctx)).toEqual(["severity"])
  })

  it("passes a required select field when value is set", () => {
    const ctx: EventForm.RequiredFieldContext = {
      ...emptyCtx,
      formFields: [makeField({ name: "severity", required: true, inputType: "select" })],
      data: { severity: "moderate" },
    }
    expect(EventForm.getMissingRequiredFields(ctx)).toEqual([])
  })

  it("passes a required checkbox field when value is truthy", () => {
    const ctx: EventForm.RequiredFieldContext = {
      ...emptyCtx,
      formFields: [makeField({ name: "consent", required: true, inputType: "checkbox" })],
      data: { consent: true },
    }
    expect(EventForm.getMissingRequiredFields(ctx)).toEqual([])
  })

  it("flags a required radio field when value is empty string (deselected)", () => {
    const ctx: EventForm.RequiredFieldContext = {
      ...emptyCtx,
      formFields: [makeField({ name: "blood_type", required: true, inputType: "radio" })],
      data: { blood_type: "" },
    }
    expect(EventForm.getMissingRequiredFields(ctx)).toEqual(["blood_type"])
  })

  // ---- display-only fields (text / separator) are always skipped ----

  it("skips display-only text fields even if marked required", () => {
    const ctx: EventForm.RequiredFieldContext = {
      ...emptyCtx,
      formFields: [
        makeField({ name: "heading", required: true, fieldType: "text", inputType: "text" }),
      ],
      data: {},
    }
    expect(EventForm.getMissingRequiredFields(ctx)).toEqual([])
  })

  it("skips separator fields even if marked required", () => {
    const ctx: EventForm.RequiredFieldContext = {
      ...emptyCtx,
      formFields: [
        makeField({ name: "sep1", required: true, fieldType: "separator", inputType: "text" }),
      ],
      data: {},
    }
    expect(EventForm.getMissingRequiredFields(ctx)).toEqual([])
  })

  // ---- diagnosis fields ----

  it("flags a required diagnosis field when diagnoses array is empty", () => {
    const ctx: EventForm.RequiredFieldContext = {
      ...emptyCtx,
      formFields: [
        makeField({ name: "Diagnosis", required: true, fieldType: "diagnosis", inputType: "select" }),
      ],
      diagnoses: [],
    }
    expect(EventForm.getMissingRequiredFields(ctx)).toEqual(["Diagnosis"])
  })

  it("passes a required diagnosis field when diagnoses array has entries", () => {
    const ctx: EventForm.RequiredFieldContext = {
      ...emptyCtx,
      formFields: [
        makeField({ name: "Diagnosis", required: true, fieldType: "diagnosis", inputType: "select" }),
      ],
      diagnoses: [{ code: "E11", desc: "Type 2 diabetes" }],
    }
    expect(EventForm.getMissingRequiredFields(ctx)).toEqual([])
  })

  // ---- medicine fields ----

  it("flags a required medicine field when medicines array is empty", () => {
    const ctx: EventForm.RequiredFieldContext = {
      ...emptyCtx,
      formFields: [
        makeField({
          name: "Medications",
          required: true,
          fieldType: "medicine",
          inputType: "input-group",
        }),
      ],
      medicines: [],
    }
    expect(EventForm.getMissingRequiredFields(ctx)).toEqual(["Medications"])
  })

  it("passes a required medicine field when medicines array has entries", () => {
    const ctx: EventForm.RequiredFieldContext = {
      ...emptyCtx,
      formFields: [
        makeField({
          name: "Medications",
          required: true,
          fieldType: "medicine",
          inputType: "input-group",
        }),
      ],
      medicines: [{ id: "1", name: "Aspirin", dose: "500mg" }],
    }
    expect(EventForm.getMissingRequiredFields(ctx)).toEqual([])
  })

  // ---- file fields ----

  it("flags a required file field when fileUploads has no entry", () => {
    const ctx: EventForm.RequiredFieldContext = {
      ...emptyCtx,
      formFields: [
        makeField({ name: "lab_report", required: true, fieldType: "file", inputType: "file" }),
      ],
      fileUploads: {},
    }
    expect(EventForm.getMissingRequiredFields(ctx)).toEqual(["lab_report"])
  })

  it("flags a required file field when fileId is undefined", () => {
    const ctx: EventForm.RequiredFieldContext = {
      ...emptyCtx,
      formFields: [
        makeField({ name: "lab_report", required: true, fieldType: "file", inputType: "file" }),
      ],
      fileUploads: { lab_report: { fileId: undefined } },
    }
    expect(EventForm.getMissingRequiredFields(ctx)).toEqual(["lab_report"])
  })

  it("flags a required file field when fileId is empty string", () => {
    const ctx: EventForm.RequiredFieldContext = {
      ...emptyCtx,
      formFields: [
        makeField({ name: "lab_report", required: true, fieldType: "file", inputType: "file" }),
      ],
      fileUploads: { lab_report: { fileId: "" } },
    }
    expect(EventForm.getMissingRequiredFields(ctx)).toEqual(["lab_report"])
  })

  it("passes a required file field when fileId is present", () => {
    const ctx: EventForm.RequiredFieldContext = {
      ...emptyCtx,
      formFields: [
        makeField({ name: "lab_report", required: true, fieldType: "file", inputType: "file" }),
      ],
      fileUploads: { lab_report: { fileId: "abc-123" } },
    }
    expect(EventForm.getMissingRequiredFields(ctx)).toEqual([])
  })

  // ---- multiple fields mixed ----

  it("returns only the names of missing required fields in form order", () => {
    const ctx: EventForm.RequiredFieldContext = {
      ...emptyCtx,
      formFields: [
        requiredText("chief_complaint"),
        makeField({ name: "notes", required: false }),
        requiredText("exam_findings"),
        makeField({ name: "heading", required: true, fieldType: "text", inputType: "text" }),
        makeField({
          name: "Diagnosis",
          required: true,
          fieldType: "diagnosis",
          inputType: "select",
        }),
      ],
      data: {
        chief_complaint: "headache",
        exam_findings: "", // empty → missing
      },
      diagnoses: [], // empty → missing
    }
    expect(EventForm.getMissingRequiredFields(ctx)).toEqual(["exam_findings", "Diagnosis"])
  })

  it("handles a realistic form with all field types", () => {
    const ctx: EventForm.RequiredFieldContext = {
      formFields: [
        makeField({ name: "Section Title", required: false, fieldType: "text" }),
        makeField({ name: "divider", required: false, fieldType: "separator" }),
        requiredText("patient_name"),
        makeField({ name: "age", required: true, inputType: "number" }),
        makeField({ name: "gender", required: true, inputType: "select" }),
        makeField({ name: "notes", required: false, inputType: "textarea" }),
        makeField({
          name: "Diagnosis",
          required: true,
          fieldType: "diagnosis",
          inputType: "select",
        }),
        makeField({
          name: "Medications",
          required: true,
          fieldType: "medicine",
          inputType: "input-group",
        }),
        makeField({ name: "xray", required: true, fieldType: "file", inputType: "file" }),
        makeField({ name: "consent", required: true, inputType: "checkbox" }),
      ],
      data: {
        patient_name: "Jane Doe",
        age: 30,
        gender: "female",
        notes: "",
        consent: true,
      },
      diagnoses: [{ code: "J06", desc: "Acute upper respiratory infection" }],
      medicines: [], // missing
      fileUploads: { xray: { fileId: "file-001" } },
    }

    // Only Medications should be missing
    expect(EventForm.getMissingRequiredFields(ctx)).toEqual(["Medications"])
  })
})

// ---------------------------------------------------------------------------
// Property-based tests
// ---------------------------------------------------------------------------

describe("EventForm.getMissingRequiredFields — property-based", () => {
  // -- Arbitraries -----------------------------------------------------------

  const arbFieldName = fc.string({ minLength: 1, maxLength: 30 }).filter((s) => s.trim().length > 0)

  /** A non-display, non-special input type */
  const arbGenericInputType = fc.constantFrom("text", "number", "select", "radio", "checkbox", "textarea")

  /** A non-display, non-special field type */
  const arbGenericFieldType = fc.constantFrom("free-text", "binary", "date", "options")

  /** Arbitrary FieldItem that is a generic (non-diagnosis, non-medicine, non-file, non-display) field */
  const arbGenericField = fc.record({
    id: fc.uuid(),
    name: arbFieldName,
    fieldType: arbGenericFieldType,
    inputType: arbGenericInputType,
    multi: fc.constant(Option.none() as Option.Option<boolean>),
    options: fc.constant(Option.none() as Option.Option<any[]>),
    required: fc.boolean(),
  })

  /** Arbitrary display-only field */
  const arbDisplayField = fc.record({
    id: fc.uuid(),
    name: arbFieldName,
    fieldType: fc.constantFrom("text", "separator"),
    inputType: fc.constant("text" as EventForm.InputType),
    multi: fc.constant(Option.none() as Option.Option<boolean>),
    options: fc.constant(Option.none() as Option.Option<any[]>),
    required: fc.boolean(), // even if true, should be ignored
  })

  // A non-empty, non-whitespace string value
  const arbFilledValue = fc.string({ minLength: 1 }).filter((s) => s.trim().length > 0)

  // -- Properties ------------------------------------------------------------

  it("display-only fields never appear in output regardless of data", () => {
    fc.assert(
      fc.property(fc.array(arbDisplayField, { minLength: 1, maxLength: 10 }), (fields) => {
        const result = EventForm.getMissingRequiredFields({
          formFields: fields,
          data: {},
          diagnoses: [],
          medicines: [],
          fileUploads: {},
        })
        expect(result).toEqual([])
      }),
      { numRuns: 100 },
    )
  })

  it("non-required fields never appear in output regardless of data", () => {
    fc.assert(
      fc.property(
        fc.array(arbGenericField.map((f) => ({ ...f, required: false })), {
          minLength: 1,
          maxLength: 10,
        }),
        (fields) => {
          const result = EventForm.getMissingRequiredFields({
            formFields: fields,
            data: {},
            diagnoses: [],
            medicines: [],
            fileUploads: {},
          })
          expect(result).toEqual([])
        },
      ),
      { numRuns: 100 },
    )
  })

  it("output is always a subset of form field names", () => {
    fc.assert(
      fc.property(
        fc.array(arbGenericField, { minLength: 0, maxLength: 15 }),
        fc.dictionary(arbFieldName, fc.oneof(fc.constant(""), arbFilledValue, fc.constant(null))),
        (fields, data) => {
          const result = EventForm.getMissingRequiredFields({
            formFields: fields,
            data,
            diagnoses: [],
            medicines: [],
            fileUploads: {},
          })
          const fieldNames = new Set(fields.map((f) => f.name))
          for (const name of result) {
            expect(fieldNames.has(name)).toBe(true)
          }
        },
      ),
      { numRuns: 100 },
    )
  })

  it("output length never exceeds the number of required non-display fields", () => {
    fc.assert(
      fc.property(
        fc.array(fc.oneof(arbGenericField, arbDisplayField), { minLength: 0, maxLength: 20 }),
        (fields) => {
          const result = EventForm.getMissingRequiredFields({
            formFields: fields,
            data: {},
            diagnoses: [],
            medicines: [],
            fileUploads: {},
          })
          const requiredNonDisplay = fields.filter(
            (f) => f.required && !EventForm.isDisplayOnly(f),
          )
          expect(result.length).toBeLessThanOrEqual(requiredNonDisplay.length)
        },
      ),
      { numRuns: 100 },
    )
  })

  it("when all required generic fields have non-empty values, output is empty", () => {
    fc.assert(
      fc.property(
        fc.array(arbGenericField.map((f) => ({ ...f, required: true })), {
          minLength: 1,
          maxLength: 10,
        }),
        (fields) => {
          // Deduplicate by name to avoid ambiguity
          const seen = new Set<string>()
          const uniqueFields = fields.filter((f) => {
            if (seen.has(f.name)) return false
            seen.add(f.name)
            return true
          })

          // Fill every field with a valid value
          const data: Record<string, any> = {}
          for (const f of uniqueFields) {
            data[f.name] = "filled-value"
          }

          const result = EventForm.getMissingRequiredFields({
            formFields: uniqueFields,
            data,
            diagnoses: [],
            medicines: [],
            fileUploads: {},
          })
          expect(result).toEqual([])
        },
      ),
      { numRuns: 100 },
    )
  })

  it("a required generic field with undefined/null/empty value always appears in output", () => {
    const arbEmptyValue = fc.constantFrom(undefined, null, "", " ", "\t", "\n")

    fc.assert(
      fc.property(
        arbGenericField.map((f) => ({ ...f, required: true })),
        arbEmptyValue,
        (field, emptyVal) => {
          const result = EventForm.getMissingRequiredFields({
            formFields: [field],
            data: { [field.name]: emptyVal },
            diagnoses: [],
            medicines: [],
            fileUploads: {},
          })
          expect(result).toEqual([field.name])
        },
      ),
      { numRuns: 100 },
    )
  })

  it("required diagnosis field: missing iff diagnoses array is empty", () => {
    const arbDiagField = fc.record({
      id: fc.uuid(),
      name: arbFieldName,
      fieldType: fc.constant("diagnosis"),
      inputType: fc.constant("select" as EventForm.InputType),
      multi: fc.constant(Option.none() as Option.Option<boolean>),
      options: fc.constant(Option.none() as Option.Option<any[]>),
      required: fc.constant(true),
    })

    const arbDiagnoses = fc.array(fc.record({ code: fc.string(), desc: fc.string() }), {
      minLength: 0,
      maxLength: 5,
    })

    fc.assert(
      fc.property(arbDiagField, arbDiagnoses, (field, diagnoses) => {
        const result = EventForm.getMissingRequiredFields({
          formFields: [field],
          data: {},
          diagnoses,
          medicines: [],
          fileUploads: {},
        })
        if (diagnoses.length === 0) {
          expect(result).toEqual([field.name])
        } else {
          expect(result).toEqual([])
        }
      }),
      { numRuns: 100 },
    )
  })

  it("required medicine field: missing iff medicines array is empty", () => {
    const arbMedField = fc.record({
      id: fc.uuid(),
      name: arbFieldName,
      fieldType: fc.constant("medicine"),
      inputType: fc.constant("input-group" as EventForm.InputType),
      multi: fc.constant(Option.none() as Option.Option<boolean>),
      options: fc.constant(Option.none() as Option.Option<any[]>),
      required: fc.constant(true),
    })

    const arbMedicines = fc.array(fc.record({ id: fc.uuid(), name: fc.string() }), {
      minLength: 0,
      maxLength: 5,
    })

    fc.assert(
      fc.property(arbMedField, arbMedicines, (field, medicines) => {
        const result = EventForm.getMissingRequiredFields({
          formFields: [field],
          data: {},
          diagnoses: [],
          medicines,
          fileUploads: {},
        })
        if (medicines.length === 0) {
          expect(result).toEqual([field.name])
        } else {
          expect(result).toEqual([])
        }
      }),
      { numRuns: 100 },
    )
  })

  it("required file field: missing iff fileId is falsy", () => {
    const arbFileField = fc.record({
      id: fc.uuid(),
      name: arbFieldName,
      fieldType: fc.constant("file"),
      inputType: fc.constant("file" as EventForm.InputType),
      multi: fc.constant(Option.none() as Option.Option<boolean>),
      options: fc.constant(Option.none() as Option.Option<any[]>),
      required: fc.constant(true),
    })

    const arbFileId = fc.oneof(
      fc.constant(undefined),
      fc.constant(""),
      fc.string({ minLength: 1 }).filter((s) => s.trim().length > 0),
    )

    fc.assert(
      fc.property(arbFileField, arbFileId, (field, fileId) => {
        const result = EventForm.getMissingRequiredFields({
          formFields: [field],
          data: {},
          diagnoses: [],
          medicines: [],
          fileUploads: { [field.name]: { fileId } },
        })
        if (!fileId) {
          expect(result).toEqual([field.name])
        } else {
          expect(result).toEqual([])
        }
      }),
      { numRuns: 100 },
    )
  })

  it("output preserves the order of formFields", () => {
    fc.assert(
      fc.property(
        fc.array(
          arbGenericField.map((f) => ({ ...f, required: true })),
          { minLength: 2, maxLength: 10 },
        ),
        (fields) => {
          // Deduplicate by name
          const seen = new Set<string>()
          const uniqueFields = fields.filter((f) => {
            if (seen.has(f.name)) return false
            seen.add(f.name)
            return true
          })
          if (uniqueFields.length < 2) return // need at least 2 for ordering test

          const result = EventForm.getMissingRequiredFields({
            formFields: uniqueFields,
            data: {}, // all missing
            diagnoses: [],
            medicines: [],
            fileUploads: {},
          })

          // Result should be in the same relative order as the form fields
          const fieldNameOrder = uniqueFields.map((f) => f.name)
          let lastIdx = -1
          for (const name of result) {
            const idx = fieldNameOrder.indexOf(name)
            expect(idx).toBeGreaterThan(lastIdx)
            lastIdx = idx
          }
        },
      ),
      { numRuns: 100 },
    )
  })
})
