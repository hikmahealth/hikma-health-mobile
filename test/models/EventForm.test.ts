import fc from "fast-check"

import EventForm from "../../app/models/EventForm"

describe("EventForm.isDisplayOnly", () => {
  it('returns true for "text" fieldType', () => {
    expect(EventForm.isDisplayOnly({ fieldType: "text" })).toBe(true)
  })

  it('returns true for "separator" fieldType', () => {
    expect(EventForm.isDisplayOnly({ fieldType: "separator" })).toBe(true)
  })

  it("returns false for input field types", () => {
    const inputTypes = ["binary", "free-text", "medicine", "diagnosis", "date", "options", "file"]
    for (const ft of inputTypes) {
      expect(EventForm.isDisplayOnly({ fieldType: ft })).toBe(false)
    }
  })

  it("returns false for any fieldType not in DISPLAY_ONLY_FIELD_TYPES", () => {
    fc.assert(
      fc.property(
        fc.string().filter((s) => s !== "text" && s !== "separator"),
        (fieldType) => {
          expect(EventForm.isDisplayOnly({ fieldType })).toBe(false)
        },
      ),
    )
  })

  it("DISPLAY_ONLY_FIELD_TYPES contains exactly text and separator", () => {
    expect([...EventForm.DISPLAY_ONLY_FIELD_TYPES].sort()).toEqual(["separator", "text"])
  })
})

describe("EventForm.isDisplayOnly filters display fields from form data", () => {
  const inputFieldType = fc.constantFrom(
    "binary",
    "free-text",
    "medicine",
    "diagnosis",
    "date",
    "options",
    "file",
  )

  const displayFieldType = fc.constantFrom("text", "separator")

  const makeField = (fieldType: string) => ({
    fieldType,
    id: fieldType,
    name: fieldType,
  })

  it("filtering with isDisplayOnly removes all display-only fields and keeps all input fields", () => {
    fc.assert(
      fc.property(
        fc.array(inputFieldType, { minLength: 0, maxLength: 10 }),
        fc.array(displayFieldType, { minLength: 0, maxLength: 5 }),
        (inputTypes, displayTypes) => {
          const allFields = [...inputTypes, ...displayTypes].map(makeField)
          const filtered = allFields.filter((f) => !EventForm.isDisplayOnly(f))

          // All display-only fields are removed
          expect(filtered.every((f) => !EventForm.isDisplayOnly(f))).toBe(true)
          // All input fields are preserved
          expect(filtered.length).toBe(inputTypes.length)
        },
      ),
    )
  })
})
