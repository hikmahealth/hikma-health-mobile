import {
  sanitizeFieldName,
  unsanitizeFieldName,
  unsanitizeFormData,
} from "@/utils/fieldNameSanitizer"

describe("fieldNameSanitizer", () => {
  describe("sanitizeFieldName", () => {
    it("replaces dots with placeholder", () => {
      const input = "Was a plan prescribed. (For caregivers)"
      const result = sanitizeFieldName(input)
      expect(result).not.toContain(".")
      expect(result).toContain("〔dot〕")
    })

    it("handles multiple dots", () => {
      const input = "Counseling Notes / Key Messages.."
      const result = sanitizeFieldName(input)
      expect(result).toBe("Counseling Notes / Key Messages〔dot〕〔dot〕")
    })

    it("replaces pipes with placeholder", () => {
      const input =
        "Maternal Mental Health | During the past two weeks, has the mother/caregiver experienced any of the following?"
      const result = sanitizeFieldName(input)
      expect(result).not.toContain("|")
      expect(result).toContain("〔pipe〕")
    })

    it("replaces square brackets with placeholders", () => {
      const input = "items[0]"
      const result = sanitizeFieldName(input)
      expect(result).not.toContain("[")
      expect(result).not.toContain("]")
      expect(result).toContain("〔lbracket〕")
      expect(result).toContain("〔rbracket〕")
    })

    it("replaces double quotes with placeholder", () => {
      const input = 'Field "quoted" name'
      const result = sanitizeFieldName(input)
      expect(result).not.toContain('"')
      expect(result).toContain("〔dquote〕")
    })

    it("replaces single quotes with placeholder", () => {
      const input = "Patient's condition"
      const result = sanitizeFieldName(input)
      expect(result).not.toContain("'")
      expect(result).toContain("〔squote〕")
    })

    it("handles multiple special characters together", () => {
      const input = "Plan. [optional] | \"note\" for patient's care"
      const result = sanitizeFieldName(input)
      expect(result).not.toMatch(/[.\[\]|"']/)
    })

    it("returns unchanged string when no special characters", () => {
      const input = "Dietitian Name"
      expect(sanitizeFieldName(input)).toBe("Dietitian Name")
    })

    it("handles empty string", () => {
      expect(sanitizeFieldName("")).toBe("")
    })
  })

  describe("unsanitizeFieldName", () => {
    it("restores dots from placeholder", () => {
      const sanitized = "Plan〔dot〕 (For caregivers)"
      expect(unsanitizeFieldName(sanitized)).toBe("Plan. (For caregivers)")
    })

    it("restores pipes from placeholder", () => {
      const sanitized = "Health 〔pipe〕 Screening"
      expect(unsanitizeFieldName(sanitized)).toBe("Health | Screening")
    })

    it("restores brackets from placeholder", () => {
      const sanitized = "items〔lbracket〕0〔rbracket〕"
      expect(unsanitizeFieldName(sanitized)).toBe("items[0]")
    })

    it("restores quotes from placeholder", () => {
      const sanitized = "Field 〔dquote〕quoted〔dquote〕 and 〔squote〕s"
      expect(unsanitizeFieldName(sanitized)).toBe('Field "quoted" and \'s')
    })

    it("returns unchanged string when no placeholders", () => {
      expect(unsanitizeFieldName("Dietitian Name")).toBe("Dietitian Name")
    })
  })

  describe("roundtrip", () => {
    const fieldNames = [
      "Was a therapeutic feeding plan prescribed for this patient. (For breastfeeding mothers or caregivers)",
      "Counseling Notes / Key Messages.",
      "Counseling Notes / Key Messages..",
      "Simple field name",
      "Field.with.many.dots",
      "",
      "Maternal Mental Health | During the past two weeks",
      "items[0]",
      "nested[0][1]",
      'Field "with" quotes',
      "Patient's condition",
      "Plan. [optional] | \"note\" for patient's care",
    ]

    it.each(fieldNames)("sanitize then unsanitize returns original: %s", (name) => {
      expect(unsanitizeFieldName(sanitizeFieldName(name))).toBe(name)
    })
  })

  describe("unsanitizeFormData", () => {
    it("restores all keys in a record", () => {
      const sanitized = {
        [sanitizeFieldName("Plan. (For caregivers)")]: "yes",
        [sanitizeFieldName("Notes.")]: "some text",
        ["No dots"]: "value",
      }

      const result = unsanitizeFormData(sanitized)

      expect(result["Plan. (For caregivers)"]).toBe("yes")
      expect(result["Notes."]).toBe("some text")
      expect(result["No dots"]).toBe("value")
    })

    it("restores keys with pipes and brackets", () => {
      const sanitized = {
        [sanitizeFieldName("Health | Screening")]: "done",
        [sanitizeFieldName("items[0]")]: "first",
      }

      const result = unsanitizeFormData(sanitized)

      expect(result["Health | Screening"]).toBe("done")
      expect(result["items[0]"]).toBe("first")
    })

    it("preserves values of any type", () => {
      const sanitized = {
        [sanitizeFieldName("Field.one")]: 42,
        [sanitizeFieldName("Field.two")]: ["a", "b"],
        [sanitizeFieldName("Field.three")]: { nested: true },
      }

      const result = unsanitizeFormData(sanitized)

      expect(result["Field.one"]).toBe(42)
      expect(result["Field.two"]).toEqual(["a", "b"])
      expect(result["Field.three"]).toEqual({ nested: true })
    })

    it("handles empty record", () => {
      expect(unsanitizeFormData({})).toEqual({})
    })
  })

  describe("react-hook-form safety", () => {
    it("sanitized name contains none of the characters RHF treats as special", () => {
      const problematic = "Plan. [0] | \"quoted\" for patient's care"
      const sanitized = sanitizeFieldName(problematic)

      // Must not contain any character from RHF's stringToPath regex
      expect(sanitized).not.toMatch(/[.\[|\]"']/)
    })
  })
})
