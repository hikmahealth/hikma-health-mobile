import fc from "fast-check"

import { sanitizeMetadata } from "../../app/utils/db"

// Mock Sentry to avoid real error reporting
jest.mock("@sentry/react-native", () => ({
  captureException: jest.fn(),
}))

describe("sanitizeMetadata", () => {
  // ── Objects ──────────────────────────────────────────────────────────────

  it("stringifies a plain object", () => {
    expect(sanitizeMetadata({ a: 1, b: "two" })).toBe('{"a":1,"b":"two"}')
  })

  it("stringifies an empty object", () => {
    expect(sanitizeMetadata({})).toBe("{}")
  })

  it("stringifies arrays (they are objects)", () => {
    expect(sanitizeMetadata([1, 2, 3])).toBe("[1,2,3]")
  })

  it("stringifies nested objects", () => {
    const nested = { a: { b: { c: 1 } } }
    expect(sanitizeMetadata(nested)).toBe(JSON.stringify(nested))
  })

  // ── Valid JSON strings ──────────────────────────────────────────────────

  it("passes through valid JSON strings", () => {
    expect(sanitizeMetadata('{"key":"value"}')).toBe('{"key":"value"}')
    expect(sanitizeMetadata("[]")).toBe("[]")
    expect(sanitizeMetadata('"hello"')).toBe('"hello"')
    expect(sanitizeMetadata("42")).toBe("42")
    expect(sanitizeMetadata("true")).toBe("true")
    expect(sanitizeMetadata("null")).toBe("null")
  })

  // ── Invalid JSON strings ────────────────────────────────────────────────

  it("returns {} for invalid JSON strings", () => {
    expect(sanitizeMetadata("not json")).toBe("{}")
    expect(sanitizeMetadata("{broken")).toBe("{}")
    expect(sanitizeMetadata("undefined")).toBe("{}")
    expect(sanitizeMetadata("{key: value}")).toBe("{}")
  })

  // ── Non-object, non-string types ────────────────────────────────────────

  it("returns {} for null", () => {
    expect(sanitizeMetadata(null)).toBe("{}")
  })

  it("returns {} for undefined", () => {
    expect(sanitizeMetadata(undefined)).toBe("{}")
  })

  it("returns {} for numbers", () => {
    expect(sanitizeMetadata(42)).toBe("{}")
    expect(sanitizeMetadata(0)).toBe("{}")
    expect(sanitizeMetadata(NaN)).toBe("{}")
  })

  it("returns {} for booleans", () => {
    expect(sanitizeMetadata(true)).toBe("{}")
    expect(sanitizeMetadata(false)).toBe("{}")
  })

  // ── Property-based tests ──────────────────────────────────────────────

  it("output is always a valid JSON string", () => {
    fc.assert(
      fc.property(fc.anything(), (input) => {
        const result = sanitizeMetadata(input)
        expect(() => JSON.parse(result)).not.toThrow()
      }),
    )
  })

  it("always returns a string", () => {
    fc.assert(
      fc.property(fc.anything(), (input) => {
        expect(typeof sanitizeMetadata(input)).toBe("string")
      }),
    )
  })

  it("round-trips any JSON-serializable object", () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.dictionary(fc.string(), fc.jsonValue()),
          fc.array(fc.jsonValue()),
        ),
        (obj) => {
          const result = sanitizeMetadata(obj)
          expect(JSON.parse(result)).toEqual(obj)
        },
      ),
    )
  })

  it("valid JSON strings pass through unchanged", () => {
    fc.assert(
      fc.property(fc.jsonValue(), (value) => {
        const jsonStr = JSON.stringify(value)
        expect(sanitizeMetadata(jsonStr)).toBe(jsonStr)
      }),
    )
  })

  it("never throws regardless of input", () => {
    fc.assert(
      fc.property(fc.anything(), (input) => {
        expect(() => sanitizeMetadata(input)).not.toThrow()
      }),
    )
  })

  it("idempotent when applied to its own output", () => {
    fc.assert(
      fc.property(fc.anything(), (input) => {
        const once = sanitizeMetadata(input)
        const twice = sanitizeMetadata(once)
        // once is always valid JSON, so applying sanitize again should pass it through
        expect(twice).toBe(once)
      }),
    )
  })
})
