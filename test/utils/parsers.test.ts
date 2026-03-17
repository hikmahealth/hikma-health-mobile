import fc from "fast-check"

import Language from "../../app/models/Language"
import {
  parseMetadata,
  getTranslation,
  normalizeArabic,
  extendedSanitizeLikeString,
  safeStringify,
  joinCheckboxValues,
  splitCheckboxValues,
  CHECKBOX_SEPARATOR,
  default as invariant,
} from "../../app/utils/parsers"

describe("parseMetadata", () => {
  it("should return object as-is when metadata is already an object", () => {
    const input = { name: "John", age: 30 }
    const result = parseMetadata<typeof input>(input)
    expect(result.error).toBeNull()
    expect(result.result).toEqual(input)
  })

  it("should parse valid JSON string", () => {
    const input = '{"name":"John","age":30}'
    const result = parseMetadata<{ name: string; age: number }>(input)
    expect(result.error).toBeNull()
    expect(result.result).toEqual({ name: "John", age: 30 })
  })

  it("should return error for invalid JSON string", () => {
    const result = parseMetadata<any>("invalid json")
    expect(result.error).toBeInstanceOf(Error)
    expect(result.result).toBe("invalid json")
  })

  it("round-trips any JSON-serializable object", () => {
    fc.assert(
      fc.property(fc.jsonValue(), (value) => {
        const json = JSON.stringify(value)
        const result = parseMetadata(json)
        expect(result.error).toBeNull()
        expect(result.result).toEqual(value)
      }),
    )
  })
})

describe("getTranslation", () => {
  it("should return the requested language translation if it exists", () => {
    const translations: Language.TranslationObject = { en: "Hello", ar: "مرحبا", es: "Hola" }
    expect(getTranslation(translations, "ar")).toBe("مرحبا")
    expect(getTranslation(translations, "es")).toBe("Hola")
  })

  it("should fallback to English when requested language doesn't exist", () => {
    const translations: Language.TranslationObject = { en: "Hello", ar: "مرحبا" }
    expect(getTranslation(translations, "fr")).toBe("Hello")
  })

  it("should return first available translation when English doesn't exist", () => {
    const translations: Language.TranslationObject = { ar: "مرحبا", es: "Hola" }
    expect(getTranslation(translations, "fr")).toBe("مرحبا")
  })

  it("should return empty string for empty translations object", () => {
    expect(getTranslation({} as Language.TranslationObject, "en")).toBe("")
  })

  it("always returns a string for any non-empty translations object", () => {
    fc.assert(
      fc.property(
        fc.dictionary(fc.constantFrom("en", "ar", "es", "fr", "de"), fc.string({ minLength: 1 }), {
          minKeys: 1,
        }),
        fc.string({ minLength: 1 }),
        (translations, lang) => {
          const result = getTranslation(translations as Language.TranslationObject, lang)
          expect(typeof result).toBe("string")
          expect(result.length).toBeGreaterThan(0)
        },
      ),
    )
  })
})

describe("normalizeArabic", () => {
  it("should normalize different forms of Arabic characters", () => {
    expect(normalizeArabic("ي")).toBe("ی")
    expect(normalizeArabic("ى")).toBe("ی")
    expect(normalizeArabic("أ")).toBe("ا")
    expect(normalizeArabic("إ")).toBe("ا")
    expect(normalizeArabic("آ")).toBe("ا")
    expect(normalizeArabic("ة")).toBe("ه")
    expect(normalizeArabic("ئ")).toBe("ی")
    expect(normalizeArabic("ؤ")).toBe("و")
    expect(normalizeArabic("ء")).toBe("")
  })

  it("should collapse whitespace and trim", () => {
    expect(normalizeArabic("مرحبا    بك")).toBe("مرحبا بك")
    expect(normalizeArabic("  مرحبا  ")).toBe("مرحبا")
  })

  it("should handle complex Arabic text", () => {
    expect(normalizeArabic("أهلاً وسهلاً   بكم في  المؤسسة")).toBe("اهلاً وسهلاً بكم فی الموسسه")
  })

  it("is idempotent — normalizing twice gives the same result", () => {
    fc.assert(
      fc.property(fc.string(), (s) => {
        expect(normalizeArabic(normalizeArabic(s))).toBe(normalizeArabic(s))
      }),
    )
  })

  it("never produces leading/trailing whitespace or consecutive spaces", () => {
    fc.assert(
      fc.property(fc.string(), (s) => {
        const result = normalizeArabic(s)
        expect(result).toBe(result.trim())
        expect(result).not.toMatch(/  /)
      }),
    )
  })
})

describe("extendedSanitizeLikeString", () => {
  it("should keep letters and numbers unchanged", () => {
    expect(extendedSanitizeLikeString("abc123")).toBe("abc123")
  })

  it("should replace special characters with underscores", () => {
    expect(extendedSanitizeLikeString("hello@world.com")).toBe("hello_world_com")
  })

  it("should preserve Unicode letters", () => {
    expect(extendedSanitizeLikeString("مرحبا")).toBe("مرحبا")
    expect(extendedSanitizeLikeString("你好")).toBe("你好")
  })

  it("should throw for non-string input", () => {
    expect(() => extendedSanitizeLikeString(null as any)).toThrow()
    expect(() => extendedSanitizeLikeString(123 as any)).toThrow()
  })

  it("output length always equals input length", () => {
    fc.assert(
      fc.property(fc.string(), (s) => {
        expect(extendedSanitizeLikeString(s).length).toBe(s.length)
      }),
    )
  })

  it("output only contains letters, digits, or underscores", () => {
    fc.assert(
      fc.property(fc.string(), (s) => {
        const result = extendedSanitizeLikeString(s)
        // Every character should be a letter, digit, or underscore
        for (const ch of result) {
          expect(ch === "_" || /[\p{L}\p{N}]/u.test(ch)).toBe(true)
        }
      }),
    )
  })
})

describe("safeStringify", () => {
  it("should return defaultValue for null and undefined", () => {
    expect(safeStringify(null, "fallback")).toBe("fallback")
    expect(safeStringify(undefined, "fallback")).toBe("fallback")
  })

  it("should stringify objects", () => {
    expect(safeStringify({ a: 1 }, "{}")).toBe('{"a":1}')
    expect(safeStringify([1, 2, 3], "[]")).toBe("[1,2,3]")
  })

  it("should pass through a valid JSON string re-stringified", () => {
    expect(safeStringify('{"a":1}', "{}")).toBe('{"a":1}')
  })

  it("should stringify non-JSON strings as JSON strings", () => {
    expect(safeStringify("hello world", "default")).toBe('"hello world"')
    expect(safeStringify("FAIL", "default")).toBe('"FAIL"')
  })

  it("should return defaultValue for empty string, null, and undefined", () => {
    expect(safeStringify("", "[]")).toBe("[]")
    expect(safeStringify(null, "{}")).toBe("{}")
    expect(safeStringify(undefined, "[]")).toBe("[]")
  })

  it("should handle boolean and number inputs", () => {
    expect(safeStringify(true, "")).toBe("true")
    expect(safeStringify(42, "")).toBe("42")
  })

  it("round-trips any non-null JSON value through stringify", () => {
    // null/undefined/empty string are handled separately (return defaultValue)
    // Exclude strings that are themselves valid JSON (e.g. "0", "true") because
    // safeStringify normalizes those: "0" → parse(0) → stringify → "0" (number),
    // which is correct behavior but changes the JS type after round-trip.
    const nonNullNonStringJson = fc.oneof(
      fc.integer(),
      fc.double({ noNaN: true, noDefaultInfinity: true }),
      fc.boolean(),
      fc.array(fc.jsonValue()),
      fc.dictionary(fc.string(), fc.jsonValue()),
    )
    fc.assert(
      fc.property(nonNullNonStringJson, (value) => {
        const result = safeStringify(value, "__SENTINEL__")
        expect(result).not.toBe("__SENTINEL__")
        // Compare against JSON.parse(JSON.stringify(value)) to account for
        // JSON-inherent lossy conversions (e.g. -0 → 0)
        expect(JSON.parse(result)).toEqual(JSON.parse(JSON.stringify(value)))
      }),
    )
  })

  it("normalizes string inputs that are valid JSON", () => {
    // safeStringify("0") normalizes via JSON.parse then JSON.stringify,
    // so "0" → 0 → "0". The result is valid JSON representing the parsed value.
    expect(safeStringify("0", "default")).toBe("0")
    expect(safeStringify("true", "default")).toBe("true")
    expect(safeStringify("[1,2]", "default")).toBe("[1,2]")
    // Non-JSON strings get wrapped in quotes
    expect(safeStringify("hello", "default")).toBe('"hello"')
  })

  it("never throws for any input", () => {
    fc.assert(
      fc.property(fc.anything(), fc.string(), (input, defaultVal) => {
        expect(() => safeStringify(input, defaultVal)).not.toThrow()
      }),
    )
  })

  it("always returns a string", () => {
    fc.assert(
      fc.property(fc.anything(), (input) => {
        const result = safeStringify(input, "default")
        expect(typeof result).toBe("string")
      }),
    )
  })
})

describe("joinCheckboxValues / splitCheckboxValues", () => {
  it("joins values with \\x1F separator", () => {
    expect(joinCheckboxValues(["A", "B"])).toBe("A\x1FB")
  })

  it("returns empty string for empty array", () => {
    expect(joinCheckboxValues([])).toBe("")
  })

  it("splits \\x1F separated string", () => {
    expect(splitCheckboxValues("A\x1FB\x1FC")).toEqual(["A", "B", "C"])
  })

  it("returns empty array for falsy input", () => {
    expect(splitCheckboxValues("")).toEqual([])
    expect(splitCheckboxValues(null)).toEqual([])
    expect(splitCheckboxValues(undefined)).toEqual([])
  })

  it("round-trips: split(join(arr)) === arr for option labels", () => {
    // \x1F is a non-printable control char that won't appear in human-readable labels
    const optionLabel = fc.string({ minLength: 1 }).filter((s) => !s.includes("\x1F"))
    fc.assert(
      fc.property(fc.array(optionLabel), (values) => {
        expect(splitCheckboxValues(joinCheckboxValues(values))).toEqual(values)
      }),
    )
  })

  it("join then split preserves count for option labels", () => {
    const optionLabel = fc.string({ minLength: 1 }).filter((s) => !s.includes("\x1F"))
    fc.assert(
      fc.property(fc.array(optionLabel, { minLength: 1 }), (values) => {
        const result = splitCheckboxValues(joinCheckboxValues(values))
        expect(result.length).toBe(values.length)
      }),
    )
  })

  it("split always returns an array", () => {
    fc.assert(
      fc.property(fc.oneof(fc.string(), fc.constant(null), fc.constant(undefined)), (input) => {
        expect(Array.isArray(splitCheckboxValues(input))).toBe(true)
      }),
    )
  })
})

describe("invariant", () => {
  it("does not throw when condition is truthy", () => {
    expect(() => invariant(true)).not.toThrow()
    expect(() => invariant(1)).not.toThrow()
    expect(() => invariant("non-empty")).not.toThrow()
    expect(() => invariant({})).not.toThrow()
    expect(() => invariant([])).not.toThrow()
  })

  it("throws when condition is falsy", () => {
    expect(() => invariant(false)).toThrow("Broken invariant")
    expect(() => invariant(0)).toThrow("Broken invariant")
    expect(() => invariant("")).toThrow("Broken invariant")
    expect(() => invariant(null)).toThrow("Broken invariant")
    expect(() => invariant(undefined)).toThrow("Broken invariant")
  })

  it("throws with custom error message", () => {
    expect(() => invariant(false, "Custom message")).toThrow("Custom message")
  })

  it("thrown error has framesToPop property", () => {
    try {
      invariant(false, "test")
    } catch (e: any) {
      expect(e.framesToPop).toBe(1)
    }
  })

  it("truthy values never throw", () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.integer({ min: 1 }),
          fc.string({ minLength: 1 }),
          fc.constant(true),
          fc.constant({}),
          fc.constant([]),
        ),
        (value) => {
          expect(() => invariant(value)).not.toThrow()
        },
      ),
    )
  })

  it("falsy values always throw", () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.constant(false),
          fc.constant(0),
          fc.constant(""),
          fc.constant(null),
          fc.constant(undefined),
          fc.constant(NaN),
        ),
        (value) => {
          expect(() => invariant(value)).toThrow()
        },
      ),
    )
  })
})
