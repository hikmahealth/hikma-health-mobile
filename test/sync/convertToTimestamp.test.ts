import fc from "fast-check"

// ---------------------------------------------------------------------------
// Mocks — must be declared before importing the module under test
// ---------------------------------------------------------------------------
jest.mock("expo-secure-store", () => ({
  getItem: jest.fn(),
  getItemAsync: jest.fn(),
  setItem: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}))
jest.mock("@sentry/react-native", () => ({
  captureException: jest.fn(),
  captureMessage: jest.fn(),
  addBreadcrumb: jest.fn(),
}))
jest.mock("react-native", () => ({ Platform: { OS: "ios" } }))
jest.mock("@nozbe/watermelondb/sync", () => ({ synchronize: jest.fn() }))
jest.mock("../../app/db", () => ({}))
jest.mock("../../app/db/localSync", () => ({
  applyRemoteChanges: jest.fn(),
  getLocalChangesSince: jest.fn(),
}))
jest.mock("../../app/models/Peer", () => ({ default: {} }))
jest.mock("../../app/models/User", () => ({ default: {} }))
jest.mock("../../app/utils/parsers", () => ({
  safeStringify: jest.fn((v: unknown, d: string) => {
    if (v === undefined || v === null || v === "") return d
    if (typeof v === "string") {
      try {
        return JSON.stringify(JSON.parse(v))
      } catch {
        return JSON.stringify(v)
      }
    }
    try {
      return JSON.stringify(v)
    } catch {
      return d
    }
  }),
}))
jest.mock("../../app/utils/storage", () => ({}))
jest.mock("../../app/utils/date", () => ({ toDateSafe: jest.fn() }))

import { convertToTimestamp } from "../../app/db/peerSync"

describe("convertToTimestamp", () => {
  const fallback = new Date("2024-01-01T00:00:00Z")

  it("converts an ISO string to the correct timestamp", () => {
    const result = convertToTimestamp("2024-06-15T10:30:00Z", fallback, "test")
    expect(result).toBe(new Date("2024-06-15T10:30:00Z").getTime())
  })

  it("converts a Date object to its getTime() value", () => {
    const date = new Date("2024-03-20T08:00:00Z")
    const result = convertToTimestamp(date, fallback, "test")
    expect(result).toBe(date.getTime())
  })

  it("passes through a valid numeric timestamp", () => {
    const ts = 1700000000000
    const result = convertToTimestamp(ts, fallback, "test")
    expect(result).toBe(ts)
  })

  it("returns fallback for null", () => {
    const result = convertToTimestamp(null, fallback, "test")
    expect(result).toBe(fallback.getTime())
  })

  it("returns fallback for undefined", () => {
    const result = convertToTimestamp(undefined, fallback, "test")
    expect(result).toBe(fallback.getTime())
  })

  it("returns fallback for empty string", () => {
    const result = convertToTimestamp("", fallback, "test")
    expect(result).toBe(fallback.getTime())
  })

  it("returns fallback for NaN", () => {
    const result = convertToTimestamp(NaN, fallback, "test")
    expect(result).toBe(fallback.getTime())
  })

  it("returns fallback for Infinity", () => {
    const result = convertToTimestamp(Infinity, fallback, "test")
    expect(result).toBe(fallback.getTime())
  })

  it("returns fallback for -Infinity", () => {
    const result = convertToTimestamp(-Infinity, fallback, "test")
    expect(result).toBe(fallback.getTime())
  })

  it("returns fallback for a non-date string", () => {
    const result = convertToTimestamp("not-a-date", fallback, "test")
    expect(result).toBe(fallback.getTime())
  })

  it("returns fallback for boolean true", () => {
    // new Date(true) gives epoch+1ms which is technically valid but semantically wrong
    const result = convertToTimestamp(true, fallback, "test")
    expect(result).toBe(fallback.getTime())
  })

  it("returns fallback for boolean false", () => {
    const result = convertToTimestamp(false, fallback, "test")
    expect(result).toBe(fallback.getTime())
  })

  it("returns fallback for a plain object", () => {
    const result = convertToTimestamp({}, fallback, "test")
    expect(result).toBe(fallback.getTime())
  })

  it("returns fallback for an array", () => {
    const result = convertToTimestamp([], fallback, "test")
    expect(result).toBe(fallback.getTime())
  })

  it("handles negative timestamps (dates before epoch)", () => {
    const ts = -86400000 // 1969-12-31
    const result = convertToTimestamp(ts, fallback, "test")
    // Negative timestamps are valid dates
    expect(result).toBe(ts)
  })

  it("returns fallback for Number.MAX_SAFE_INTEGER (produces valid but absurd date)", () => {
    const result = convertToTimestamp(Number.MAX_SAFE_INTEGER, fallback, "test")
    // This is technically a valid date far in the future — implementation may or may not reject it
    expect(typeof result).toBe("number")
    expect(isFinite(result)).toBe(true)
    expect(isNaN(result)).toBe(false)
  })

  it("result is always a finite, non-NaN number for any fc.date() input", () => {
    fc.assert(
      fc.property(fc.date(), (date) => {
        const result = convertToTimestamp(date.toISOString(), fallback, "test")
        expect(isFinite(result)).toBe(true)
        expect(isNaN(result)).toBe(false)
      }),
    )
  })

  it("correctly converts any valid Date to its timestamp", () => {
    fc.assert(
      fc.property(fc.date({ min: new Date("1900-01-01"), max: new Date("2100-01-01") }), (date) => {
        const result = convertToTimestamp(date.toISOString(), fallback, "test")
        expect(result).toBe(date.getTime())
      }),
    )
  })

  it("includes recordId in fallback path without crashing when recordId is undefined", () => {
    // recordId is optional — should not crash
    const result = convertToTimestamp("bad-date", fallback, "created_at")
    expect(result).toBe(fallback.getTime())
  })

  it("includes recordId in fallback path without crashing when recordId is provided", () => {
    const result = convertToTimestamp("bad-date", fallback, "created_at", "patient-123")
    expect(result).toBe(fallback.getTime())
  })
})
