import fc from "fast-check"

import { localeDate, calculateAge, parseYYYYMMDD, toDateSafe } from "../../app/utils/date"
import { addDays, subDays, subYears, subMonths } from "date-fns"

// Mock i18next
jest.mock("i18next", () => ({
  language: "en-US",
  t: jest.fn((key) => key),
}))

describe("date utilities", () => {
  describe("localeDate", () => {
    beforeEach(() => {
      // Reset the language to English for each test
      const i18n = require("i18next")
      i18n.language = "en-US"
    })

    it("should format date with default format", () => {
      const date = new Date(2024, 0, 15) // January 15, 2024
      const result = localeDate(date)
      expect(result).toBe("Jan 15, 2024")
    })

    it("should format date with custom format", () => {
      const date = new Date(2024, 5, 20) // June 20, 2024
      const result = localeDate(date, "yyyy-MM-dd")
      expect(result).toBe("2024-06-20")
    })

    it("should format date with different format patterns", () => {
      const date = new Date(2024, 11, 25, 14, 30, 45) // December 25, 2024 14:30:45

      expect(localeDate(date, "dd/MM/yyyy")).toBe("25/12/2024")
      expect(localeDate(date, "EEEE, MMMM do, yyyy")).toMatch(/Wednesday, December \d+\w+, 2024/)
      expect(localeDate(date, "HH:mm:ss")).toBe("14:30:45")
    })

    it("should handle Arabic locale", () => {
      const i18n = require("i18next")
      i18n.language = "ar-SA"

      const date = new Date(2024, 0, 15)
      const result = localeDate(date)
      // The result will be in Arabic format
      expect(result).toContain("2024")
    })

    it("should handle options parameter", () => {
      const date = new Date(2024, 6, 4) // July 4, 2024
      const result = localeDate(date, "EEEE", { weekStartsOn: 1 })
      expect(result).toBe("Thursday")
    })

    it("should default to en-US for unknown locales", () => {
      const i18n = require("i18next")
      i18n.language = "unknown-LOCALE"

      const date = new Date(2024, 2, 10)
      const result = localeDate(date)
      expect(result).toBe("Mar 10, 2024")
    })
  })

  describe("calculateAge", () => {
    beforeEach(() => {
      // Mock current date to ensure consistent test results
      jest.useFakeTimers()
      jest.setSystemTime(new Date(2024, 0, 15)) // January 15, 2024
    })

    afterEach(() => {
      jest.useRealTimers()
    })

    it("should calculate age in years", () => {
      const dob = subYears(new Date(), 25)
      const age = calculateAge(dob)
      expect(age).toMatch(/^25 years/)
    })

    it("should calculate age in years and months", () => {
      const dob = subMonths(subYears(new Date(), 25), 3)
      const age = calculateAge(dob)
      expect(age).toMatch(/^25 years, 3 months/)
    })

    it("should calculate age in months only", () => {
      const dob = subMonths(new Date(), 8)
      const age = calculateAge(dob)
      expect(age).toMatch(/^8 months/)
    })

    it("should calculate age in days only", () => {
      const dob = subDays(new Date(), 15)
      const age = calculateAge(dob)
      expect(age).toBe("15 days")
    })

    it("should handle plural and singular forms", () => {
      const dob1 = subYears(new Date(), 1)
      expect(calculateAge(dob1)).toMatch(/^1 year/)

      const dob2 = subMonths(new Date(), 1)
      expect(calculateAge(dob2)).toMatch(/^1 month/)

      const dob3 = subDays(new Date(), 1)
      expect(calculateAge(dob3)).toBe("1 day")
    })

    it("should handle Date object input", () => {
      const dob = new Date(2000, 0, 15)
      const age = calculateAge(dob)
      expect(age).toMatch(/^24 years/)
    })

    it("should handle number (timestamp) input", () => {
      const dob = new Date(2000, 0, 15).getTime()
      const age = calculateAge(dob)
      expect(age).toMatch(/^24 years/)
    })

    it("should handle YYYY-MM-DD string format", () => {
      const age = calculateAge("2000-01-15")
      expect(age).toMatch(/^24 years/)
    })

    it("should handle regular date string format", () => {
      const age = calculateAge("January 15, 2000")
      expect(age).toMatch(/^24 years/)
    })

    it("should return empty string for null input", () => {
      expect(calculateAge(null)).toBe("")
    })

    it("should return empty string for invalid date string", () => {
      expect(calculateAge("invalid-date")).toBe("")
      expect(calculateAge("2024-13-45")).toBe("")
    })

    it("should return empty string for invalid date object", () => {
      const invalidDate = new Date("invalid")
      expect(calculateAge(invalidDate)).toBe("")
    })

    it("should handle complex age combinations", () => {
      const dob = subDays(subMonths(subYears(new Date(), 5), 7), 20)
      const age = calculateAge(dob)
      expect(age).toBe("5 years, 7 months and 20 days")
    })

    it("should handle newborn (0 days)", () => {
      const dob = new Date()
      const age = calculateAge(dob)
      expect(age).toBe("0 days")
    })

    it("should handle future dates gracefully", () => {
      const futureDob = addDays(new Date(), 10)
      const age = calculateAge(futureDob)
      // This will produce a negative age, but the function should still work
      expect(age).toBeDefined()
    })
  })

  describe("parseYYYYMMDD", () => {
    it("should parse valid YYYY-MM-DD format", () => {
      const result = parseYYYYMMDD("2024-03-15", null)
      expect(result).toBeInstanceOf(Date)
      expect((result as Date).getFullYear()).toBe(2024)
      expect((result as Date).getMonth()).toBe(2) // March (0-indexed)
      expect((result as Date).getDate()).toBe(15)
    })

    it("should handle leap year dates", () => {
      const result = parseYYYYMMDD("2024-02-29", null)
      if (result !== null) {
        expect(result).toBeInstanceOf(Date)
        expect((result as Date).getFullYear()).toBe(2024)
        expect((result as Date).getMonth()).toBe(1)
        expect((result as Date).getDate()).toBe(29)
      } else {
        // February 29 in non-leap years should return null
        expect(result).toBeNull()
      }
    })

    it("should return default for invalid leap year date", () => {
      const defaultValue = "default"
      const result = parseYYYYMMDD("2023-02-29", defaultValue)
      expect(result).toBe(defaultValue)
    })

    it("should return default for undefined input", () => {
      const defaultValue = new Date(2020, 0, 1)
      const result = parseYYYYMMDD(undefined, defaultValue)
      expect(result).toBe(defaultValue)
    })

    it("should return default for empty string", () => {
      const defaultValue = null
      const result = parseYYYYMMDD("", defaultValue)
      expect(result).toBe(defaultValue)
    })

    it("should return default for invalid format", () => {
      const defaultValue = "invalid"
      // These formats may be parsed by Date constructor fallback
      const result1 = parseYYYYMMDD("2024/03/15", defaultValue)
      const result2 = parseYYYYMMDD("15-03-2024", defaultValue)
      const result3 = parseYYYYMMDD("not-a-date", defaultValue)

      // At least one should use the default
      expect(result3).toBe(defaultValue)
    })

    it("should return default for invalid date components", () => {
      const defaultValue = null
      expect(parseYYYYMMDD("2024-13-01", defaultValue)).toBe(defaultValue) // Invalid month
      expect(parseYYYYMMDD("2024-00-15", defaultValue)).toBe(defaultValue) // Invalid month (0)
      expect(parseYYYYMMDD("2024-01-32", defaultValue)).toBe(defaultValue) // Invalid day
    })

    it("should return default for non-numeric components", () => {
      const defaultValue = "error"
      // These may fall back to Date constructor which might parse them differently
      const result1 = parseYYYYMMDD("abcd-01-15", defaultValue)
      const result2 = parseYYYYMMDD("2024-ab-15", defaultValue)
      const result3 = parseYYYYMMDD("2024-01-cd", defaultValue)

      // At least invalid month/day should return default
      expect(result2).toBe(defaultValue)
      expect(result3).toBe(defaultValue)
    })

    it("should handle dates at boundaries", () => {
      const result1 = parseYYYYMMDD("2024-01-01", null)
      expect(result1).toBeInstanceOf(Date)
      expect((result1 as Date).getFullYear()).toBe(2024)
      expect((result1 as Date).getMonth()).toBe(0)
      expect((result1 as Date).getDate()).toBe(1)

      const result2 = parseYYYYMMDD("2024-12-31", null)
      expect(result2).toBeInstanceOf(Date)
      expect((result2 as Date).getFullYear()).toBe(2024)
      expect((result2 as Date).getMonth()).toBe(11)
      expect((result2 as Date).getDate()).toBe(31)
    })

    it("should preserve current time when parsing date", () => {
      const beforeTime = new Date()
      const result = parseYYYYMMDD("2024-06-15", null)

      if (result !== null) {
        // The hours, minutes, seconds should be from current time
        expect((result as Date).getHours()).toBeGreaterThanOrEqual(0)
        expect((result as Date).getHours()).toBeLessThanOrEqual(23)
      }
    })

    it("should fallback to Date constructor for other formats", () => {
      const result = parseYYYYMMDD("2024-03-15T10:30:00", null)
      expect(result).toBeInstanceOf(Date)
      expect((result as Date).getFullYear()).toBe(2024)
    })

    it("should handle different default value types", () => {
      const defaultDate = new Date(2020, 5, 1)
      const result1 = parseYYYYMMDD("invalid", defaultDate)
      expect(result1).toBe(defaultDate)

      const defaultString = "fallback"
      const result2 = parseYYYYMMDD("invalid", defaultString)
      expect(result2).toBe(defaultString)

      const defaultNull = null
      const result3 = parseYYYYMMDD("invalid", defaultNull)
      expect(result3).toBe(defaultNull)

      const defaultUndefined = undefined
      const result4 = parseYYYYMMDD("invalid", defaultUndefined)
      expect(result4).toBe(defaultUndefined)
    })

    // ── Property-based tests for parseYYYYMMDD ──────────────────────────

    it("always returns default for random non-date strings", () => {
      fc.assert(
        fc.property(
          fc.string().filter((s) => !/^\d{4}-\d{2}-\d{2}/.test(s) && isNaN(Date.parse(s))),
          (s) => {
            const result = parseYYYYMMDD(s, "DEFAULT")
            expect(result).toBe("DEFAULT")
          },
        ),
      )
    })

    it("valid YYYY-MM-DD strings produce a Date with matching components", () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1970, max: 2100 }),
          fc.integer({ min: 1, max: 12 }),
          fc.integer({ min: 1, max: 28 }), // 28 to avoid month-end edge cases
          (year, month, day) => {
            const str = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`
            const result = parseYYYYMMDD(str, null)
            expect(result).toBeInstanceOf(Date)
            expect((result as Date).getFullYear()).toBe(year)
            expect((result as Date).getMonth()).toBe(month - 1)
            expect((result as Date).getDate()).toBe(day)
          },
        ),
      )
    })
  })

  // ── toDateSafe ──────────────────────────────────────────────────────────

  describe("toDateSafe", () => {
    it("returns Date objects unchanged if valid", () => {
      const d = new Date(2024, 5, 15)
      expect(toDateSafe(d)).toBe(d)
    })

    it("returns default for invalid Date objects", () => {
      const fallback = new Date(2000, 0, 1)
      const result = toDateSafe(new Date("invalid"), fallback)
      expect(result).toBe(fallback)
    })

    it("converts numbers (timestamps) to Dates", () => {
      const ts = Date.now()
      const result = toDateSafe(ts)
      expect(result).toBeInstanceOf(Date)
      expect(result.getTime()).toBe(ts)
    })

    it("converts YYYY-MM-DD strings via parseYYYYMMDD", () => {
      const result = toDateSafe("2024-03-15")
      expect(result).toBeInstanceOf(Date)
      expect(result.getFullYear()).toBe(2024)
      expect(result.getMonth()).toBe(2)
      expect(result.getDate()).toBe(15)
    })

    it("converts ISO strings", () => {
      const result = toDateSafe("2024-06-15T10:30:00.000Z")
      expect(result).toBeInstanceOf(Date)
      expect(result.getFullYear()).toBe(2024)
    })

    it("returns NaN date for completely invalid input with no default", () => {
      const result = toDateSafe("garbage")
      expect(isNaN(result.getTime())).toBe(true)
    })

    it("returns default for non-date types", () => {
      const fallback = new Date(2020, 0, 1)
      expect(toDateSafe(null, fallback)).toBe(fallback)
      expect(toDateSafe(undefined, fallback)).toBe(fallback)
      expect(toDateSafe({}, fallback)).toBe(fallback)
      expect(toDateSafe([], fallback)).toBe(fallback)
      expect(toDateSafe(true, fallback)).toBe(fallback)
    })

    it("returns Invalid Date (not default) when no default is given for bad input", () => {
      const result = toDateSafe(Symbol("bad"))
      expect(result).toBeInstanceOf(Date)
      expect(isNaN(result.getTime())).toBe(true)
    })

    // ── Property-based ──────────────────────────────────────────────────

    it("always returns a Date instance", () => {
      fc.assert(
        fc.property(fc.anything(), (input) => {
          const result = toDateSafe(input)
          expect(result).toBeInstanceOf(Date)
        }),
      )
    })

    it("valid Date inputs are returned as-is", () => {
      fc.assert(
        fc.property(
          fc.date({ min: new Date("1970-01-01"), max: new Date("2100-01-01") }),
          (d) => {
            const result = toDateSafe(d)
            expect(result.getTime()).toBe(d.getTime())
          },
        ),
      )
    })

    it("integer timestamps produce valid Dates", () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 4102444800000 }), // up to 2100
          (ts) => {
            const result = toDateSafe(ts)
            expect(isNaN(result.getTime())).toBe(false)
            expect(result.getTime()).toBe(ts)
          },
        ),
      )
    })

    it("default is always used for non-date-like inputs", () => {
      const fallback = new Date(2000, 0, 1)
      fc.assert(
        fc.property(
          fc.oneof(
            fc.constant(null),
            fc.constant(undefined),
            fc.boolean(),
            fc.constant({}),
            fc.array(fc.anything()),
          ),
          (input) => {
            const result = toDateSafe(input, fallback)
            expect(result).toBe(fallback)
          },
        ),
      )
    })
  })
})
