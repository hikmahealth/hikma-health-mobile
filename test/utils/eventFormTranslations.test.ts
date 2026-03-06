import fc from "fast-check"

import { getOptionId, resolveFormTranslations } from "../../app/utils/eventFormTranslations"
import type { ResolvedFormTranslations } from "../../app/utils/eventFormTranslations"
import { Option } from "effect"

// ── getOptionId ───────────────────────────────────────────────────────────

describe("getOptionId", () => {
  it("returns id when present", () => {
    expect(getOptionId({ id: "opt-1", value: "v1" })).toBe("opt-1")
  })

  it("falls back to value when id is undefined", () => {
    expect(getOptionId({ value: "fallback-val" })).toBe("fallback-val")
  })

  it("prefers id over value even when both present", () => {
    expect(getOptionId({ id: "the-id", value: "the-value" })).toBe("the-id")
  })

  it("returns value when id is explicitly undefined", () => {
    expect(getOptionId({ id: undefined, value: "val" })).toBe("val")
  })

  it("always returns a string", () => {
    fc.assert(
      fc.property(
        fc.record({
          id: fc.option(fc.string(), { nil: undefined }),
          value: fc.string(),
        }),
        (option) => {
          const result = getOptionId(option)
          expect(typeof result).toBe("string")
        },
      ),
    )
  })

  it("returns id whenever id is a non-undefined string", () => {
    fc.assert(
      fc.property(fc.string(), fc.string(), (id, value) => {
        expect(getOptionId({ id, value })).toBe(id)
      }),
    )
  })
})

// ── resolveFormTranslations ───────────────────────────────────────────────

describe("resolveFormTranslations", () => {
  const makeField = (
    id: string,
    name: string,
    opts?: Array<{ id?: string; value: string; label: string }>,
  ) => ({
    id,
    name,
    fieldType: "text",
    inputType: "text" as const,
    multi: Option.none(),
    options: opts ? Option.some(opts) : Option.none(),
  })

  const FORM_NAME_ID = "__form_name__"
  const FORM_DESC_ID = "__form_description__"

  it("returns form name and description when no translations exist", () => {
    const result = resolveFormTranslations(
      {
        name: "My Form",
        description: "A description",
        formFields: [],
        translations: [],
      },
      "en",
    )
    expect(result.formName).toBe("My Form")
    expect(result.formDescription).toBe("A description")
  })

  it("resolves form-level name translation", () => {
    const result = resolveFormTranslations(
      {
        name: "Original",
        description: "Desc",
        formFields: [],
        translations: [
          {
            fieldId: FORM_NAME_ID,
            name: { en: "English Name", ar: "اسم عربي" },
            description: {},
            options: {},
            createdAt: "",
            updatedAt: "",
          },
        ],
      },
      "ar",
    )
    expect(result.formName).toBe("اسم عربي")
  })

  it("resolves form-level description from description field", () => {
    const result = resolveFormTranslations(
      {
        name: "Form",
        description: "Original Desc",
        formFields: [],
        translations: [
          {
            fieldId: FORM_DESC_ID,
            name: {},
            description: { en: "English Desc", es: "Desc en español" },
            options: {},
            createdAt: "",
            updatedAt: "",
          },
        ],
      },
      "es",
    )
    expect(result.formDescription).toBe("Desc en español")
  })

  it("falls back to description name field when description is empty", () => {
    const result = resolveFormTranslations(
      {
        name: "Form",
        description: "Original Desc",
        formFields: [],
        translations: [
          {
            fieldId: FORM_DESC_ID,
            name: { en: "Name as fallback" },
            description: {},
            options: {},
            createdAt: "",
            updatedAt: "",
          },
        ],
      },
      "en",
    )
    expect(result.formDescription).toBe("Name as fallback")
  })

  it("falls back to form.description when no translation entry exists", () => {
    const result = resolveFormTranslations(
      {
        name: "Form",
        description: "Fallback Desc",
        formFields: [],
      },
      "fr",
    )
    expect(result.formDescription).toBe("Fallback Desc")
  })

  it("resolves field-level name translations", () => {
    const field = makeField("f1", "Original Name")
    const result = resolveFormTranslations(
      {
        name: "Form",
        description: "",
        formFields: [field],
        translations: [
          {
            fieldId: "f1",
            name: { ar: "اسم الحقل" },
            description: {},
            options: {},
            createdAt: "",
            updatedAt: "",
          },
        ],
      },
      "ar",
    )
    expect(result.fieldNames["f1"]).toBe("اسم الحقل")
  })

  it("falls back to field.name when no field translation exists", () => {
    const field = makeField("f1", "Fallback Name")
    const result = resolveFormTranslations(
      {
        name: "Form",
        description: "",
        formFields: [field],
        translations: [],
      },
      "ar",
    )
    expect(result.fieldNames["f1"]).toBe("Fallback Name")
  })

  it("resolves field-level description translations", () => {
    const field = makeField("f1", "Name")
    const result = resolveFormTranslations(
      {
        name: "Form",
        description: "",
        formFields: [field],
        translations: [
          {
            fieldId: "f1",
            name: {},
            description: { en: "Field description" },
            options: {},
            createdAt: "",
            updatedAt: "",
          },
        ],
      },
      "en",
    )
    expect(result.fieldDescriptions["f1"]).toBe("Field description")
  })

  it("resolves option label translations", () => {
    const field = makeField("f1", "Color", [
      { id: "opt-r", value: "red", label: "Red" },
      { id: "opt-b", value: "blue", label: "Blue" },
    ])
    const result = resolveFormTranslations(
      {
        name: "Form",
        description: "",
        formFields: [field],
        translations: [
          {
            fieldId: "f1",
            name: {},
            description: {},
            options: {
              "opt-r": { en: "Red", es: "Rojo" },
              "opt-b": { en: "Blue", es: "Azul" },
            },
            createdAt: "",
            updatedAt: "",
          },
        ],
      },
      "es",
    )
    expect(result.optionLabels["f1"]["opt-r"]).toBe("Rojo")
    expect(result.optionLabels["f1"]["opt-b"]).toBe("Azul")
  })

  it("falls back to option.label when no option translation exists", () => {
    const field = makeField("f1", "Size", [
      { id: "opt-s", value: "small", label: "Small" },
    ])
    const result = resolveFormTranslations(
      {
        name: "Form",
        description: "",
        formFields: [field],
        translations: [
          {
            fieldId: "f1",
            name: {},
            description: {},
            options: { "opt-s": {} }, // empty translation obj
            createdAt: "",
            updatedAt: "",
          },
        ],
      },
      "ar",
    )
    expect(result.optionLabels["f1"]["opt-s"]).toBe("Small")
  })

  it("skips string options (medicine options)", () => {
    const field = {
      ...makeField("f1", "Meds"),
      options: Option.some(["aspirin", "ibuprofen"]),
    }
    const result = resolveFormTranslations(
      {
        name: "Form",
        description: "",
        formFields: [field],
        translations: [
          {
            fieldId: "f1",
            name: {},
            description: {},
            options: { aspirin: { en: "Aspirin Translated" } },
            createdAt: "",
            updatedAt: "",
          },
        ],
      },
      "en",
    )
    // String options are skipped, so no labels resolved
    expect(result.optionLabels["f1"]).toEqual({})
  })

  it("handles multiple fields simultaneously", () => {
    const f1 = makeField("f1", "Name")
    const f2 = makeField("f2", "Age")
    const f3 = makeField("f3", "Gender")
    const result = resolveFormTranslations(
      {
        name: "Patient Form",
        description: "A form",
        formFields: [f1, f2, f3],
        translations: [
          {
            fieldId: "f1",
            name: { es: "Nombre" },
            description: {},
            options: {},
            createdAt: "",
            updatedAt: "",
          },
          {
            fieldId: "f3",
            name: { es: "Género" },
            description: {},
            options: {},
            createdAt: "",
            updatedAt: "",
          },
        ],
      },
      "es",
    )
    expect(result.fieldNames["f1"]).toBe("Nombre")
    expect(result.fieldNames["f2"]).toBe("Age") // no translation, fallback
    expect(result.fieldNames["f3"]).toBe("Género")
  })

  // ── Property-based ──────────────────────────────────────────────────────

  it("always returns all expected keys in the result", () => {
    fc.assert(
      fc.property(
        fc.string(),
        fc.string(),
        fc.string(),
        (name, desc, lang) => {
          const result = resolveFormTranslations(
            { name, description: desc, formFields: [] },
            lang,
          )
          expect(result).toHaveProperty("formName")
          expect(result).toHaveProperty("formDescription")
          expect(result).toHaveProperty("fieldNames")
          expect(result).toHaveProperty("fieldDescriptions")
          expect(result).toHaveProperty("optionLabels")
        },
      ),
    )
  })

  it("fieldNames always has an entry for every field", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            id: fc.string({ minLength: 1 }),
            name: fc.string(),
          }),
          { maxLength: 10 },
        ),
        (fields) => {
          const formFields = fields.map((f) => makeField(f.id, f.name))
          const result = resolveFormTranslations(
            { name: "F", description: "D", formFields },
            "en",
          )
          for (const field of formFields) {
            expect(field.id in result.fieldNames).toBe(true)
          }
        },
      ),
    )
  })
})
