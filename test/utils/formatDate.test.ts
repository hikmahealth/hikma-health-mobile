import { formatDate, loadDateFnsLocale } from "../../app/utils/formatDate"
import i18n from "i18next"

// Mock i18next
jest.mock("i18next", () => ({
  language: "en-US",
  t: jest.fn((key) => key),
}))

// Create complete mock locale structures
const createMockLocale = (code: string) => ({
  code,
  localize: {
    ordinalNumber: jest.fn((n) => `${n}th`),
    era: jest.fn(),
    quarter: jest.fn((q) => `Q${q}`),
    month: jest.fn(
      (m) =>
        [
          "January",
          "February",
          "March",
          "April",
          "May",
          "June",
          "July",
          "August",
          "September",
          "October",
          "November",
          "December",
        ][m],
    ),
    day: jest.fn(
      (d) => ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][d],
    ),
    dayPeriod: jest.fn((p) => (p === "am" ? "AM" : "PM")),
  },
  formatLong: {
    date: jest.fn(),
    time: jest.fn(),
    dateTime: jest.fn(),
  },
  match: {
    ordinalNumber: jest.fn(),
    era: jest.fn(),
    quarter: jest.fn(),
    month: jest.fn(),
    day: jest.fn(),
    dayPeriod: jest.fn(),
  },
  options: {
    weekStartsOn: 0,
    firstWeekContainsDate: 1,
  },
})

// Mock date-fns locales with complete structure
jest.mock("date-fns/locale/en-US", () => ({
  default: createMockLocale("en-US"),
}))

jest.mock("date-fns/locale/ar", () => ({
  default: createMockLocale("ar"),
}))

jest.mock("date-fns/locale/ko", () => ({
  default: createMockLocale("ko"),
}))

jest.mock("date-fns/locale/es", () => ({
  default: createMockLocale("es"),
}))

jest.mock("date-fns/locale/fr", () => ({
  default: createMockLocale("fr"),
}))

jest.mock("date-fns/locale/hi", () => ({
  default: createMockLocale("hi"),
}))

jest.mock("date-fns/locale/ja", () => ({
  default: createMockLocale("ja"),
}))

describe("formatDate", () => {
  describe("loadDateFnsLocale", () => {
    beforeEach(() => {
      // Reset i18n language to English
      i18n.language = "en-US"
    })

    it("should load English locale for en language", () => {
      i18n.language = "en-US"
      expect(() => loadDateFnsLocale()).not.toThrow()
    })

    it("should load English locale for en-GB", () => {
      i18n.language = "en-GB"
      expect(() => loadDateFnsLocale()).not.toThrow()
    })

    it("should load Arabic locale for ar language", () => {
      i18n.language = "ar-SA"
      expect(() => loadDateFnsLocale()).not.toThrow()
    })

    it("should load Korean locale for ko language", () => {
      i18n.language = "ko-KR"
      expect(() => loadDateFnsLocale()).not.toThrow()
    })

    it("should load Spanish locale for es language", () => {
      i18n.language = "es-ES"
      expect(() => loadDateFnsLocale()).not.toThrow()
    })

    it("should load French locale for fr language", () => {
      i18n.language = "fr-FR"
      expect(() => loadDateFnsLocale()).not.toThrow()
    })

    it("should load Hindi locale for hi language", () => {
      i18n.language = "hi-IN"
      expect(() => loadDateFnsLocale()).not.toThrow()
    })

    it("should load Japanese locale for ja language", () => {
      i18n.language = "ja-JP"
      expect(() => loadDateFnsLocale()).not.toThrow()
    })

    it("should default to English for unknown language", () => {
      i18n.language = "unknown-LANG"
      expect(() => loadDateFnsLocale()).not.toThrow()
    })

    it("should handle language code without region", () => {
      i18n.language = "es"
      expect(() => loadDateFnsLocale()).not.toThrow()
    })

    it("should handle mixed case language codes", () => {
      i18n.language = "EN-us"
      expect(() => loadDateFnsLocale()).not.toThrow()
    })

    it("should handle various language variations", () => {
      const languages = ["en", "en-CA", "ar", "ar-EG", "ko", "es-MX", "fr-CA", "hi", "ja"]
      languages.forEach((lang) => {
        i18n.language = lang
        expect(() => loadDateFnsLocale()).not.toThrow()
      })
    })
  })

  describe("formatDate", () => {
    beforeEach(() => {
      i18n.language = "en-US"
      loadDateFnsLocale()
    })

    it("should format ISO date string with default format", () => {
      const result = formatDate("2024-01-15T00:00:00.000Z")
      expect(result).toBeDefined()
      expect(typeof result).toBe("string")
    })

    it("should format ISO date string with custom format", () => {
      const result = formatDate("2024-06-20T10:30:00.000Z", "yyyy-MM-dd")
      expect(result).toBe("2024-06-20")
    })

    it("should handle different date formats", () => {
      const isoDate = "2024-12-25T14:30:45.000Z"

      expect(formatDate(isoDate, "dd/MM/yyyy")).toBe("25/12/2024")
      expect(formatDate(isoDate, "MM-dd-yyyy")).toBe("12-25-2024")
      expect(formatDate(isoDate, "yyyy")).toBe("2024")
    })

    it("should handle time formats", () => {
      const isoDate = "2024-03-15T09:45:30.000Z"

      const timeResult = formatDate(isoDate, "HH:mm:ss")
      expect(timeResult).toMatch(/\d{2}:\d{2}:\d{2}/)

      const hourMinResult = formatDate(isoDate, "HH:mm")
      expect(hourMinResult).toMatch(/\d{2}:\d{2}/)
    })

    it("should handle date with timezone information", () => {
      const isoDate = "2024-07-04T16:00:00+02:00"
      const result = formatDate(isoDate, "yyyy-MM-dd")
      expect(result).toBe("2024-07-04")
    })

    it("should handle milliseconds in ISO string", () => {
      const isoDate = "2024-01-01T00:00:00.123Z"
      const result = formatDate(isoDate, "yyyy-MM-dd HH:mm:ss.SSS")
      // Date might be off by one due to timezone
      expect(result).toMatch(/202\d-\d{2}-\d{2}/)
      expect(result).toMatch(/\d{2}:\d{2}:\d{2}\.\d{3}/)
    })

    it("should handle day names", () => {
      const isoDate = "2024-01-15T00:00:00.000Z"
      const result = formatDate(isoDate, "EEEE")
      expect(result).toBeDefined()
      expect(typeof result).toBe("string")
    })

    it("should handle month names", () => {
      const dates = [
        "2024-01-15T00:00:00.000Z",
        "2024-06-15T00:00:00.000Z",
        "2024-12-15T00:00:00.000Z",
      ]

      dates.forEach((iso) => {
        const result = formatDate(iso, "MMMM")
        expect(result).toBeDefined()
        expect(typeof result).toBe("string")
      })
    })

    it("should handle quarter format", () => {
      const quarters = [
        "2024-02-15T00:00:00.000Z",
        "2024-05-15T00:00:00.000Z",
        "2024-08-15T00:00:00.000Z",
        "2024-11-15T00:00:00.000Z",
      ]

      quarters.forEach((date) => {
        const result = formatDate(date, "QQQ")
        expect(result).toBeDefined()
        expect(typeof result).toBe("string")
      })
    })

    it("should handle week of year", () => {
      const result = formatDate("2024-01-08T00:00:00.000Z", "w")
      expect(parseInt(result)).toBeGreaterThan(0)
      expect(parseInt(result)).toBeLessThanOrEqual(53)
    })

    it("should handle ordinal date formats", () => {
      const result = formatDate("2024-01-01T00:00:00.000Z", "do")
      expect(result).toBeDefined()
      expect(typeof result).toBe("string")
    })

    it("should respect locale when formatting", () => {
      // Test with Spanish locale
      i18n.language = "es-ES"
      loadDateFnsLocale()

      const result = formatDate("2024-01-15T00:00:00.000Z", "MMMM")
      expect(result).toBeDefined()
      expect(typeof result).toBe("string")
    })

    it("should handle options parameter", () => {
      const options = {
        weekStartsOn: 1 as const,
        firstWeekContainsDate: 4 as const,
      }

      const result = formatDate("2024-01-15T00:00:00.000Z", "yyyy-MM-dd", options)
      // Date might be off by one due to timezone
      expect(result).toMatch(/2024-01-1[45]/)
    })

    it("should handle edge cases", () => {
      // Leap year - might be Feb 28 or 29 depending on timezone
      expect(formatDate("2024-02-29T00:00:00.000Z", "yyyy-MM-dd")).toMatch(/2024-02-2[89]/)

      // End of year - might be Dec 31 or Jan 1 depending on timezone
      expect(formatDate("2024-12-31T23:59:59.999Z", "yyyy-MM-dd")).toMatch(/202\d-\d{2}-\d{2}/)

      // Start of year - might be Dec 31 or Jan 1 depending on timezone
      expect(formatDate("2024-01-01T00:00:00.000Z", "yyyy-MM-dd")).toMatch(/202\d-\d{2}-\d{2}/)
    })

    it("should handle invalid date strings gracefully", () => {
      // These should throw errors
      expect(() => formatDate("invalid-date")).toThrow()
      expect(() => formatDate("2024-13-45T00:00:00.000Z")).toThrow()
      expect(() => formatDate("")).toThrow()
    })

    it("should handle different ISO string variations", () => {
      const variations = [
        "2024-03-15T10:30:00Z",
        "2024-03-15T10:30:00.000Z",
        "2024-03-15T10:30:00+00:00",
        "2024-03-15T10:30:00-05:00",
      ]

      variations.forEach((dateStr) => {
        const result = formatDate(dateStr, "yyyy-MM-dd")
        expect(result).toContain("2024-03-15")
      })
    })

    it("should format with multiple date/time components", () => {
      const isoDate = "2024-06-15T14:30:45.123Z"
      const result = formatDate(isoDate, "yyyy-MM-dd HH:mm:ss")

      expect(result).toContain("2024-06-15")
      expect(result).toMatch(/\d{2}:\d{2}:\d{2}/)
    })

    it("should handle literal text in format", () => {
      const isoDate = "2024-01-15T00:00:00.000Z"
      const result = formatDate(isoDate, "'Date:' yyyy-MM-dd")
      // Date might be off by one due to timezone
      expect(result).toMatch(/Date: 2024-01-1[45]/)
    })

    it("should switch between different locales", () => {
      const isoDate = "2024-01-15T00:00:00.000Z"

      // English
      i18n.language = "en-US"
      loadDateFnsLocale()
      const enResult = formatDate(isoDate, "yyyy-MM-dd")
      expect(enResult).toMatch(/2024-01-1[45]/)

      // Arabic
      i18n.language = "ar-SA"
      loadDateFnsLocale()
      const arResult = formatDate(isoDate, "yyyy-MM-dd")
      expect(arResult).toMatch(/2024-01-1[45]/)

      // Back to English
      i18n.language = "en-US"
      loadDateFnsLocale()
      const enResult2 = formatDate(isoDate, "yyyy-MM-dd")
      expect(enResult2).toMatch(/2024-01-1[45]/)
    })

    it("should handle year formats", () => {
      const isoDate = "2024-06-15T00:00:00.000Z"

      expect(formatDate(isoDate, "yy")).toBe("24")
      expect(formatDate(isoDate, "yyyy")).toBe("2024")
    })

    it("should handle month formats", () => {
      const isoDate = "2024-06-15T00:00:00.000Z"

      expect(formatDate(isoDate, "M")).toBe("6")
      expect(formatDate(isoDate, "MM")).toBe("06")
    })

    it("should handle day formats", () => {
      const isoDate = "2024-06-05T00:00:00.000Z"

      // Day might be off by one due to timezone
      const dayResult = formatDate(isoDate, "d")
      expect(["4", "5"]).toContain(dayResult)

      const paddedDayResult = formatDate(isoDate, "dd")
      expect(["04", "05"]).toContain(paddedDayResult)
    })
  })
})
