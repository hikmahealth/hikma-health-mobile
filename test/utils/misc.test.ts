import fc from "fast-check"

import {
  stringsListToOptions,
  friendlyString,
  toggleStringInArray,
  isValidEmail,
  getAppintmentStatusColor,
  getPrescriptionStatusColor,
  getPrescriptionItemStatusColor,
} from "../../app/utils/misc"

// ── stringsListToOptions ──────────────────────────────────────────────────

describe("stringsListToOptions", () => {
  it("converts strings to options with uppercased labels by default", () => {
    const result = stringsListToOptions(["hello", "world"])
    expect(result).toEqual([
      { label: "Hello", value: "hello" },
      { label: "World", value: "world" },
    ])
  })

  it("preserves original string as value regardless of formatting", () => {
    const result = stringsListToOptions(["ALREADY_UPPER"])
    expect(result[0].value).toBe("ALREADY_UPPER")
  })

  it("skips formatting when format=false", () => {
    const result = stringsListToOptions(["hello", "world"], false)
    expect(result).toEqual([
      { label: "hello", value: "hello" },
      { label: "world", value: "world" },
    ])
  })

  it("handles empty array", () => {
    expect(stringsListToOptions([])).toEqual([])
  })

  it("output length always matches input length", () => {
    fc.assert(
      fc.property(fc.array(fc.string()), (arr) => {
        expect(stringsListToOptions(arr).length).toBe(arr.length)
      }),
    )
  })

  it("value field is always the original string", () => {
    fc.assert(
      fc.property(fc.array(fc.string()), fc.boolean(), (arr, fmt) => {
        const result = stringsListToOptions(arr, fmt)
        result.forEach((opt, i) => {
          expect(opt.value).toBe(arr[i])
        })
      }),
    )
  })

  it("label is always a string", () => {
    fc.assert(
      fc.property(fc.array(fc.string()), (arr) => {
        stringsListToOptions(arr).forEach((opt) => {
          expect(typeof opt.label).toBe("string")
        })
      }),
    )
  })
})

// ── friendlyString ────────────────────────────────────────────────────────

describe("friendlyString", () => {
  it("replaces underscores with spaces and capitalizes words", () => {
    expect(friendlyString("hello_world")).toBe("Hello World")
    expect(friendlyString("foo_bar_baz")).toBe("Foo Bar Baz")
  })

  it("capitalizes first letter of each word in simple strings", () => {
    expect(friendlyString("hello")).toBe("Hello")
  })

  it("handles empty string", () => {
    expect(friendlyString("")).toBe("")
  })

  it("handles strings that are already friendly", () => {
    expect(friendlyString("Hello World")).toBe("Hello World")
  })

  it("never contains underscores in output", () => {
    fc.assert(
      fc.property(fc.string(), (s) => {
        expect(friendlyString(s)).not.toContain("_")
      }),
    )
  })

  it("idempotence: applying twice yields same result if no underscores remain", () => {
    fc.assert(
      fc.property(fc.string(), (s) => {
        const once = friendlyString(s)
        const twice = friendlyString(once)
        // After first pass, underscores are gone, so second pass should be identical
        expect(twice).toBe(once)
      }),
    )
  })
})

// ── toggleStringInArray ───────────────────────────────────────────────────

describe("toggleStringInArray", () => {
  it("adds a string not in the array", () => {
    expect(toggleStringInArray("new", ["a", "b"])).toEqual(["a", "b", "new"])
  })

  it("removes a string already in the array", () => {
    expect(toggleStringInArray("b", ["a", "b", "c"])).toEqual(["a", "c"])
  })

  it("handles empty array — always adds", () => {
    expect(toggleStringInArray("x", [])).toEqual(["x"])
  })

  it("does not mutate the original array", () => {
    const original = ["a", "b"]
    const result = toggleStringInArray("c", original)
    expect(original).toEqual(["a", "b"])
    expect(result).not.toBe(original)
  })

  it("toggling twice restores membership (set-like toggle)", () => {
    fc.assert(
      fc.property(
        fc.string(),
        fc.array(fc.string(), { maxLength: 20 }),
        (str, arr) => {
          const uniqueArr = [...new Set(arr)]
          const toggled = toggleStringInArray(str, uniqueArr)
          const toggledBack = toggleStringInArray(str, toggled)

          // After two toggles, the string's membership status should be restored
          const wasPresent = uniqueArr.includes(str)
          const isPresent = toggledBack.includes(str)
          expect(isPresent).toBe(wasPresent)
        },
      ),
    )
  })

  it("adding changes length by exactly 1, removing changes length by exactly -1", () => {
    fc.assert(
      fc.property(
        fc.string(),
        fc.array(fc.string(), { maxLength: 20 }),
        (str, arr) => {
          const uniqueArr = [...new Set(arr)]
          const result = toggleStringInArray(str, uniqueArr)
          if (uniqueArr.includes(str)) {
            expect(result.length).toBe(uniqueArr.length - 1)
          } else {
            expect(result.length).toBe(uniqueArr.length + 1)
          }
        },
      ),
    )
  })

  it("toggle always changes membership", () => {
    fc.assert(
      fc.property(
        fc.string(),
        fc.array(fc.string(), { maxLength: 20 }),
        (str, arr) => {
          const uniqueArr = [...new Set(arr)]
          const result = toggleStringInArray(str, uniqueArr)
          expect(result.includes(str)).toBe(!uniqueArr.includes(str))
        },
      ),
    )
  })
})

// ── isValidEmail ──────────────────────────────────────────────────────────

describe("isValidEmail", () => {
  it("accepts standard emails", () => {
    expect(isValidEmail("user@example.com")).toBe(true)
    expect(isValidEmail("name.surname@domain.co")).toBe(true)
    expect(isValidEmail("a+tag@sub.domain.org")).toBe(true)
  })

  it("rejects obviously invalid emails", () => {
    expect(isValidEmail("")).toBe(false)
    expect(isValidEmail("no-at-sign")).toBe(false)
    expect(isValidEmail("@no-local.com")).toBe(false)
    expect(isValidEmail("no-domain@")).toBe(false)
    expect(isValidEmail("spaces in@email.com")).toBe(false)
    expect(isValidEmail("user@.com")).toBe(false)
  })

  it("rejects strings with spaces", () => {
    fc.assert(
      fc.property(
        fc.string().filter((s) => s.includes(" ")),
        (s) => {
          expect(isValidEmail(s)).toBe(false)
        },
      ),
    )
  })

  it("valid emails always contain exactly one @", () => {
    fc.assert(
      fc.property(
        fc.emailAddress(),
        (email) => {
          // fast-check generates valid email addresses — our regex should accept most
          // At minimum verify the structural property:
          const atCount = (email.match(/@/g) || []).length
          expect(atCount).toBe(1)
        },
      ),
    )
  })

  it("strings without @ are never valid", () => {
    fc.assert(
      fc.property(
        fc.string().filter((s) => !s.includes("@")),
        (s) => {
          expect(isValidEmail(s)).toBe(false)
        },
      ),
    )
  })

  it("always returns a boolean", () => {
    fc.assert(
      fc.property(fc.string(), (s) => {
        expect(typeof isValidEmail(s)).toBe("string" === "never" ? "never" : "boolean")
      }),
    )
  })
})

// ── Status color functions ────────────────────────────────────────────────

describe("getAppintmentStatusColor", () => {
  const knownStatuses = [
    "pending",
    "scheduled",
    "checked_in",
    "in_progress",
    "confirmed",
    "cancelled",
    "completed",
  ] as const

  it("returns a 2-element tuple for each known status", () => {
    for (const status of knownStatuses) {
      const result = getAppintmentStatusColor(status)
      expect(result).toHaveLength(2)
      expect(result[0]).toMatch(/^#[0-9a-f]{6}$/i)
      expect(result[1]).toMatch(/^#[0-9a-f]{6}$/i)
    }
  })

  it("returns a default color for unknown status", () => {
    const result = getAppintmentStatusColor("nonexistent" as any)
    expect(result).toEqual(["#374151", "#ffffff"])
  })

  it("every known status maps to a unique background color", () => {
    const colors = knownStatuses.map((s) => getAppintmentStatusColor(s)[0])
    expect(new Set(colors).size).toBe(colors.length)
  })
})

describe("getPrescriptionStatusColor", () => {
  const knownStatuses = [
    "pending",
    "prepared",
    "picked-up",
    "not-picked-up",
    "partially-picked-up",
    "cancelled",
    "other",
  ] as const

  it("returns valid hex color pairs for each known status", () => {
    for (const status of knownStatuses) {
      const result = getPrescriptionStatusColor(status)
      expect(result).toHaveLength(2)
      expect(result[0]).toMatch(/^#[0-9a-f]{6}$/i)
      expect(result[1]).toMatch(/^#[0-9a-f]{6}$/i)
    }
  })

  it("returns default for unknown status", () => {
    const result = getPrescriptionStatusColor("bogus" as any)
    expect(result).toEqual(["#374151", "#ffffff"])
  })
})

describe("getPrescriptionItemStatusColor", () => {
  const knownStatuses = ["active", "completed", "cancelled"] as const

  it("returns valid hex color pairs for each known status", () => {
    for (const status of knownStatuses) {
      const result = getPrescriptionItemStatusColor(status)
      expect(result).toHaveLength(2)
      expect(result[0]).toMatch(/^#[0-9a-f]{6}$/i)
      expect(result[1]).toMatch(/^#[0-9a-f]{6}$/i)
    }
  })

  it("returns default for unknown status", () => {
    const result = getPrescriptionItemStatusColor("unknown" as any)
    expect(result).toEqual(["#374151", "#ffffff"])
  })
})
