/**
 * Tests for PatientRegistrationForm.getMissingRequiredFields
 *
 * Validates required-field enforcement for patient registration.
 * Combines deterministic unit tests with fast-check property-based tests.
 */

import fc from "fast-check"

import PatientRegistrationForm from "../../app/models/PatientRegistrationForm"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a minimal RegistrationFormField with sensible defaults */
function makeField(
  overrides: Partial<PatientRegistrationForm.RegistrationFormField> &
    Pick<PatientRegistrationForm.RegistrationFormField, "id">,
): PatientRegistrationForm.RegistrationFormField {
  return {
    id: overrides.id,
    position: overrides.position ?? 0,
    column: overrides.column ?? ("given_name" as PatientRegistrationForm.BaseColumn),
    label: overrides.label ?? { en: overrides.id },
    fieldType: overrides.fieldType ?? "text",
    options: overrides.options ?? [],
    required: overrides.required ?? false,
    baseField: overrides.baseField ?? false,
    visible: overrides.visible ?? true,
    isSearchField: overrides.isSearchField ?? false,
    deleted: overrides.deleted ?? false,
  }
}

function requiredField(id: string, label?: string): PatientRegistrationForm.RegistrationFormField {
  return makeField({ id, required: true, label: { en: label ?? id } })
}

const emptyCtx: PatientRegistrationForm.RequiredFieldContext = {
  fields: [],
  values: {},
}

// ---------------------------------------------------------------------------
// Deterministic unit tests
// ---------------------------------------------------------------------------

describe("PatientRegistrationForm.getMissingRequiredFields", () => {
  it("returns empty array when there are no fields", () => {
    expect(PatientRegistrationForm.getMissingRequiredFields(emptyCtx)).toEqual([])
  })

  it("returns empty array when no fields are required", () => {
    const ctx: PatientRegistrationForm.RequiredFieldContext = {
      fields: [
        makeField({ id: "f1", required: false }),
        makeField({ id: "f2", required: false }),
      ],
      values: {},
    }
    expect(PatientRegistrationForm.getMissingRequiredFields(ctx)).toEqual([])
  })

  // ---- missing values ----

  it("flags a required field when value is undefined", () => {
    const ctx: PatientRegistrationForm.RequiredFieldContext = {
      fields: [requiredField("given_name", "First Name")],
      values: {},
    }
    expect(PatientRegistrationForm.getMissingRequiredFields(ctx)).toEqual(["First Name"])
  })

  it("flags a required field when value is null", () => {
    const ctx: PatientRegistrationForm.RequiredFieldContext = {
      fields: [requiredField("given_name", "First Name")],
      values: { given_name: null as any },
    }
    expect(PatientRegistrationForm.getMissingRequiredFields(ctx)).toEqual(["First Name"])
  })

  it("flags a required field when value is an empty string", () => {
    const ctx: PatientRegistrationForm.RequiredFieldContext = {
      fields: [requiredField("given_name", "First Name")],
      values: { given_name: "" },
    }
    expect(PatientRegistrationForm.getMissingRequiredFields(ctx)).toEqual(["First Name"])
  })

  it("flags a required field when value is whitespace only", () => {
    for (const ws of [" ", "  ", "\t", "\n", " \t\n "]) {
      const ctx: PatientRegistrationForm.RequiredFieldContext = {
        fields: [requiredField("notes", "Notes")],
        values: { notes: ws },
      }
      expect(PatientRegistrationForm.getMissingRequiredFields(ctx)).toEqual(["Notes"])
    }
  })

  // ---- present values ----

  it("passes a required field with a non-empty string value", () => {
    const ctx: PatientRegistrationForm.RequiredFieldContext = {
      fields: [requiredField("given_name", "First Name")],
      values: { given_name: "Jane" },
    }
    expect(PatientRegistrationForm.getMissingRequiredFields(ctx)).toEqual([])
  })

  it("passes a required field with value 0 (falsy but present)", () => {
    const ctx: PatientRegistrationForm.RequiredFieldContext = {
      fields: [requiredField("age", "Age")],
      values: { age: 0 },
    }
    expect(PatientRegistrationForm.getMissingRequiredFields(ctx)).toEqual([])
  })

  it("passes a required field with value false (falsy but present)", () => {
    const ctx: PatientRegistrationForm.RequiredFieldContext = {
      fields: [requiredField("consent", "Consent")],
      values: { consent: false },
    }
    expect(PatientRegistrationForm.getMissingRequiredFields(ctx)).toEqual([])
  })

  // ---- visibility and deletion ----

  it("skips hidden fields even if required", () => {
    const ctx: PatientRegistrationForm.RequiredFieldContext = {
      fields: [makeField({ id: "hidden", required: true, visible: false })],
      values: {},
    }
    expect(PatientRegistrationForm.getMissingRequiredFields(ctx)).toEqual([])
  })

  it("skips deleted fields even if required", () => {
    const ctx: PatientRegistrationForm.RequiredFieldContext = {
      fields: [makeField({ id: "deleted", required: true, deleted: true })],
      values: {},
    }
    expect(PatientRegistrationForm.getMissingRequiredFields(ctx)).toEqual([])
  })

  // ---- fallback label ----

  it("falls back to column name when label.en is empty", () => {
    const ctx: PatientRegistrationForm.RequiredFieldContext = {
      fields: [
        makeField({
          id: "f1",
          required: true,
          label: { en: "" },
          column: "surname",
        }),
      ],
      values: {},
    }
    expect(PatientRegistrationForm.getMissingRequiredFields(ctx)).toEqual(["surname"])
  })

  // ---- mixed fields ----

  it("returns only the labels of missing required fields in field order", () => {
    const ctx: PatientRegistrationForm.RequiredFieldContext = {
      fields: [
        requiredField("given_name", "First Name"),
        makeField({ id: "notes", required: false }),
        requiredField("surname", "Last Name"),
        makeField({ id: "hidden_field", required: true, visible: false }),
        requiredField("sex", "Sex"),
      ],
      values: {
        given_name: "Jane",
        surname: "",   // empty → missing
        // sex is undefined → missing
      },
    }
    expect(PatientRegistrationForm.getMissingRequiredFields(ctx)).toEqual(["Last Name", "Sex"])
  })

  it("handles a realistic registration form", () => {
    const ctx: PatientRegistrationForm.RequiredFieldContext = {
      fields: [
        requiredField("given_name", "First Name"),
        requiredField("surname", "Last Name"),
        requiredField("dob", "Date of Birth"),
        requiredField("sex", "Sex"),
        makeField({ id: "phone", required: false, label: { en: "Phone" } }),
        requiredField("govt_id", "Government ID"),
      ],
      values: {
        given_name: "Jane",
        surname: "Doe",
        dob: "1990-01-15",
        sex: "female",
        govt_id: "",   // missing
      },
    }
    expect(PatientRegistrationForm.getMissingRequiredFields(ctx)).toEqual(["Government ID"])
  })
})

// ---------------------------------------------------------------------------
// Property-based tests
// ---------------------------------------------------------------------------

describe("PatientRegistrationForm.getMissingRequiredFields — property-based", () => {
  // -- Arbitraries -----------------------------------------------------------

  const arbFieldId = fc.uuid()
  const arbLabel = fc.string({ minLength: 1, maxLength: 30 }).filter((s) => s.trim().length > 0)
  const arbFieldType = fc.constantFrom(
    ...PatientRegistrationForm.inputTypeList,
  ) as fc.Arbitrary<PatientRegistrationForm.InputType>
  const arbColumn = fc.constantFrom(
    ...PatientRegistrationForm.baseColumns,
  ) as fc.Arbitrary<PatientRegistrationForm.BaseColumn>

  const arbField: fc.Arbitrary<PatientRegistrationForm.RegistrationFormField> = fc.record({
    id: arbFieldId,
    position: fc.nat(100),
    column: arbColumn,
    label: arbLabel.map((en) => ({ en })),
    fieldType: arbFieldType,
    options: fc.constant([]),
    required: fc.boolean(),
    baseField: fc.boolean(),
    visible: fc.boolean(),
    isSearchField: fc.boolean(),
    deleted: fc.boolean(),
  })

  /** A field that is visible, not deleted, and required */
  const arbActiveRequiredField = arbField.map((f) => ({
    ...f,
    required: true,
    visible: true,
    deleted: false,
  }))

  /** A non-empty, non-whitespace string value */
  const arbFilledValue = fc.string({ minLength: 1 }).filter((s) => s.trim().length > 0)

  // -- Properties ------------------------------------------------------------

  it("non-required fields never appear in output", () => {
    fc.assert(
      fc.property(
        fc.array(arbField.map((f) => ({ ...f, required: false })), {
          minLength: 1,
          maxLength: 10,
        }),
        (fields) => {
          const result = PatientRegistrationForm.getMissingRequiredFields({
            fields,
            values: {},
          })
          expect(result).toEqual([])
        },
      ),
      { numRuns: 100 },
    )
  })

  it("hidden or deleted fields never appear in output even if required", () => {
    const arbInvisible = arbField.map((f) => ({
      ...f,
      required: true,
      visible: fc.sample(fc.boolean(), 1)[0],
      deleted: true, // at least one disqualifier
    }))
    const arbHidden = arbField.map((f) => ({
      ...f,
      required: true,
      visible: false,
      deleted: fc.sample(fc.boolean(), 1)[0],
    }))

    fc.assert(
      fc.property(
        fc.array(fc.oneof(arbInvisible, arbHidden), { minLength: 1, maxLength: 10 }),
        (fields) => {
          const result = PatientRegistrationForm.getMissingRequiredFields({
            fields,
            values: {},
          })
          expect(result).toEqual([])
        },
      ),
      { numRuns: 100 },
    )
  })

  it("output is always a subset of field labels", () => {
    fc.assert(
      fc.property(
        fc.array(arbField, { minLength: 0, maxLength: 15 }),
        fc.dictionary(arbFieldId, fc.oneof(fc.constant(""), arbFilledValue, fc.constant(null as any))),
        (fields, values) => {
          const result = PatientRegistrationForm.getMissingRequiredFields({ fields, values })
          const validLabels = new Set(fields.map((f) => f.label.en || f.column))
          for (const label of result) {
            expect(validLabels.has(label)).toBe(true)
          }
        },
      ),
      { numRuns: 100 },
    )
  })

  it("output length never exceeds the number of active required fields", () => {
    fc.assert(
      fc.property(
        fc.array(arbField, { minLength: 0, maxLength: 20 }),
        (fields) => {
          const result = PatientRegistrationForm.getMissingRequiredFields({
            fields,
            values: {},
          })
          const activeRequired = fields.filter(
            (f) => f.required && f.visible && !f.deleted,
          )
          expect(result.length).toBeLessThanOrEqual(activeRequired.length)
        },
      ),
      { numRuns: 100 },
    )
  })

  it("when all active required fields have non-empty values, output is empty", () => {
    fc.assert(
      fc.property(
        fc.array(arbActiveRequiredField, { minLength: 1, maxLength: 10 }),
        (fields) => {
          // Deduplicate by id
          const seen = new Set<string>()
          const uniqueFields = fields.filter((f) => {
            if (seen.has(f.id)) return false
            seen.add(f.id)
            return true
          })

          const values: Record<string, string> = {}
          for (const f of uniqueFields) {
            values[f.id] = "filled-value"
          }

          const result = PatientRegistrationForm.getMissingRequiredFields({
            fields: uniqueFields,
            values,
          })
          expect(result).toEqual([])
        },
      ),
      { numRuns: 100 },
    )
  })

  it("a required active field with undefined/null/empty value always appears in output", () => {
    const arbEmptyValue = fc.constantFrom(undefined, null, "", " ", "\t", "\n")

    fc.assert(
      fc.property(
        arbActiveRequiredField,
        arbEmptyValue,
        (field, emptyVal) => {
          const result = PatientRegistrationForm.getMissingRequiredFields({
            fields: [field],
            values: { [field.id]: emptyVal as any },
          })
          expect(result).toEqual([field.label.en || field.column])
        },
      ),
      { numRuns: 100 },
    )
  })

  it("0 and false are treated as present values, not missing", () => {
    fc.assert(
      fc.property(
        arbActiveRequiredField,
        fc.constantFrom(0, false),
        (field, value) => {
          const result = PatientRegistrationForm.getMissingRequiredFields({
            fields: [field],
            values: { [field.id]: value as any },
          })
          expect(result).toEqual([])
        },
      ),
      { numRuns: 100 },
    )
  })

  it("output preserves field order", () => {
    fc.assert(
      fc.property(
        fc.array(arbActiveRequiredField, { minLength: 2, maxLength: 10 }),
        (fields) => {
          // Deduplicate by id
          const seen = new Set<string>()
          const uniqueFields = fields.filter((f) => {
            if (seen.has(f.id)) return false
            seen.add(f.id)
            return true
          })
          if (uniqueFields.length < 2) return

          const result = PatientRegistrationForm.getMissingRequiredFields({
            fields: uniqueFields,
            values: {}, // all missing
          })

          const labelOrder = uniqueFields.map((f) => f.label.en || f.column)
          let lastIdx = -1
          for (const label of result) {
            const idx = labelOrder.indexOf(label)
            expect(idx).toBeGreaterThan(lastIdx)
            lastIdx = idx
          }
        },
      ),
      { numRuns: 100 },
    )
  })
})
