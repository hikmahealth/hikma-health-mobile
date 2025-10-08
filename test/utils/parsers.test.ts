import {
  parseMetadata,
  getTranslation,
  normalizeArabic,
  extendedSanitizeLikeString,
} from "../../app/utils/parsers"
import Language from "../../app/models/Language"

describe("parsers", () => {
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
      const input = "invalid json"
      const result = parseMetadata<any>(input)

      expect(result.error).toBeInstanceOf(Error)
      expect(result.result).toBe(input)
    })

    it("should handle empty string", () => {
      const input = ""
      const result = parseMetadata<any>(input)

      expect(result.error).toBeInstanceOf(Error)
      expect(result.result).toBe(input)
    })

    it("should handle complex nested objects", () => {
      const input = {
        user: {
          name: "John",
          address: {
            street: "123 Main St",
            city: "New York",
          },
        },
        tags: ["admin", "user"],
      }
      const result = parseMetadata<typeof input>(input)

      expect(result.error).toBeNull()
      expect(result.result).toEqual(input)
    })

    it("should parse array JSON string", () => {
      const input = "[1,2,3,4,5]"
      const result = parseMetadata<number[]>(input)

      expect(result.error).toBeNull()
      expect(result.result).toEqual([1, 2, 3, 4, 5])
    })
  })

  describe("getTranslation", () => {
    it("should return the requested language translation if it exists", () => {
      const translations: Language.TranslationObject = {
        en: "Hello",
        ar: "مرحبا",
        es: "Hola",
      }

      expect(getTranslation(translations, "ar")).toBe("مرحبا")
      expect(getTranslation(translations, "es")).toBe("Hola")
    })

    it("should fallback to English when requested language doesn't exist", () => {
      const translations: Language.TranslationObject = {
        en: "Hello",
        ar: "مرحبا",
      }

      expect(getTranslation(translations, "fr")).toBe("Hello")
    })

    it("should return first available translation when English doesn't exist", () => {
      const translations: Language.TranslationObject = {
        ar: "مرحبا",
        es: "Hola",
      }

      expect(getTranslation(translations, "fr")).toBe("مرحبا")
    })

    it("should return empty string for empty translations object", () => {
      const translations: Language.TranslationObject = {}

      expect(getTranslation(translations, "en")).toBe("")
    })

    it("should handle single translation", () => {
      const translations: Language.TranslationObject = {
        en: "Hello",
      }

      expect(getTranslation(translations, "en")).toBe("Hello")
      expect(getTranslation(translations, "ar")).toBe("Hello")
    })

    it("should handle non-English single translation", () => {
      const translations: Language.TranslationObject = {
        ar: "مرحبا",
      }

      expect(getTranslation(translations, "en")).toBe("مرحبا")
      expect(getTranslation(translations, "ar")).toBe("مرحبا")
    })
  })

  describe("normalizeArabic", () => {
    it("should normalize different forms of Arabic yaa", () => {
      expect(normalizeArabic("ي")).toBe("ی")
      expect(normalizeArabic("ى")).toBe("ی")
      expect(normalizeArabic("يى")).toBe("یی")
    })

    it("should normalize different forms of Arabic alif", () => {
      expect(normalizeArabic("أ")).toBe("ا")
      expect(normalizeArabic("إ")).toBe("ا")
      expect(normalizeArabic("آ")).toBe("ا")
      expect(normalizeArabic("ا")).toBe("ا")
      expect(normalizeArabic("أإآا")).toBe("اااا")
    })

    it("should normalize taa marbuta to haa", () => {
      expect(normalizeArabic("ة")).toBe("ه")
      expect(normalizeArabic("مدرسة")).toBe("مدرسه")
    })

    it("should normalize hamza combinations", () => {
      expect(normalizeArabic("ئ")).toBe("ی")
      expect(normalizeArabic("ؤ")).toBe("و")
      expect(normalizeArabic("ء")).toBe("")
      expect(normalizeArabic("ٔ")).toBe("")
    })

    it("should normalize multiple spaces to single space", () => {
      expect(normalizeArabic("مرحبا    بك")).toBe("مرحبا بك")
      expect(normalizeArabic("  مرحبا  ")).toBe("مرحبا")
    })

    it("should trim whitespace", () => {
      expect(normalizeArabic("  مرحبا  ")).toBe("مرحبا")
      expect(normalizeArabic("\t\nمرحبا\t\n")).toBe("مرحبا")
    })

    it("should handle complex Arabic text", () => {
      const input = "أهلاً وسهلاً   بكم في  المؤسسة"
      const expected = "اهلاً وسهلاً بكم فی الموسسه"
      expect(normalizeArabic(input)).toBe(expected)
    })

    it("should handle empty string", () => {
      expect(normalizeArabic("")).toBe("")
    })

    it("should handle non-Arabic text", () => {
      expect(normalizeArabic("Hello World")).toBe("Hello World")
    })

    it("should handle mixed Arabic and English text", () => {
      expect(normalizeArabic("مرحبا Hello أهلا")).toBe("مرحبا Hello اهلا")
    })
  })

  describe("extendedSanitizeLikeString", () => {
    it("should keep letters and numbers unchanged", () => {
      expect(extendedSanitizeLikeString("abc123")).toBe("abc123")
      expect(extendedSanitizeLikeString("ABC123")).toBe("ABC123")
    })

    it("should replace special characters with underscores", () => {
      expect(extendedSanitizeLikeString("hello@world.com")).toBe("hello_world_com")
      expect(extendedSanitizeLikeString("user-name")).toBe("user_name")
      expect(extendedSanitizeLikeString("test!@#$%")).toBe("test_____")
    })

    it("should handle spaces", () => {
      expect(extendedSanitizeLikeString("hello world")).toBe("hello_world")
      expect(extendedSanitizeLikeString("  multiple   spaces  ")).toBe("__multiple___spaces__")
    })

    it("should handle Unicode letters", () => {
      expect(extendedSanitizeLikeString("مرحبا")).toBe("مرحبا")
      expect(extendedSanitizeLikeString("你好")).toBe("你好")
      expect(extendedSanitizeLikeString("Здравствуйте")).toBe("Здравствуйте")
    })

    it("should handle mixed content", () => {
      expect(extendedSanitizeLikeString("user123@email.com")).toBe("user123_email_com")
      expect(extendedSanitizeLikeString("phone: +1-234-567")).toBe("phone___1_234_567")
    })

    it("should handle empty string", () => {
      expect(extendedSanitizeLikeString("")).toBe("")
    })

    it("should throw error for non-string input", () => {
      expect(() => extendedSanitizeLikeString(null as any)).toThrow(
        "Value passed to Q.sanitizeLikeString() is not a string",
      )
      expect(() => extendedSanitizeLikeString(123 as any)).toThrow(
        "Value passed to Q.sanitizeLikeString() is not a string",
      )
      expect(() => extendedSanitizeLikeString(undefined as any)).toThrow(
        "Value passed to Q.sanitizeLikeString() is not a string",
      )
    })

    it("should handle consecutive special characters", () => {
      expect(extendedSanitizeLikeString("test---test")).toBe("test___test")
      expect(extendedSanitizeLikeString("a...b...c")).toBe("a___b___c")
    })
  })
})
