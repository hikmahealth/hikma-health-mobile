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
jest.mock("../../app/models/Sync", () => ({ default: {} }))
jest.mock("../../app/models/User", () => ({ default: {} }))
jest.mock("../../app/utils/parsers", () => ({
  safeStringify: jest.fn((_v: unknown, d: string) => d),
}))
jest.mock("../../app/models/Peer", () => ({
  default: { getActiveUrl: jest.fn(() => Promise.resolve(null)) },
}))
jest.mock("../../app/utils/storage", () => ({}))

import { validateTurboResponsePayload } from "../../app/db/sync"

describe("validateTurboResponsePayload", () => {
  it("returns valid for a response with no deleted records", () => {
    const json = JSON.stringify({
      changes: {
        patients: { created: [{ id: "1" }], updated: [], deleted: [] },
        visits: { created: [], updated: [], deleted: [] },
      },
      timestamp: 1700000000,
    })
    const result = validateTurboResponsePayload(json)
    expect(result.valid).toBe(true)
  })

  it("returns invalid when a table has non-empty deleted array", () => {
    const json = JSON.stringify({
      changes: {
        patients: { created: [], updated: [], deleted: ["id-1", "id-2"] },
      },
      timestamp: 1700000000,
    })
    const result = validateTurboResponsePayload(json)
    expect(result.valid).toBe(false)
    expect(result.reason).toContain("patients")
    expect(result.reason).toContain("deleted records")
  })

  it("returns invalid for non-JSON string", () => {
    const result = validateTurboResponsePayload("not valid json at all")
    expect(result.valid).toBe(false)
    expect(result.reason).toContain("Failed to parse")
  })

  it("returns invalid for empty string", () => {
    const result = validateTurboResponsePayload("")
    expect(result.valid).toBe(false)
    expect(result.reason).toContain("Failed to parse")
  })

  it("returns invalid when 'changes' key is missing", () => {
    const json = JSON.stringify({ timestamp: 123 })
    const result = validateTurboResponsePayload(json)
    expect(result.valid).toBe(false)
    expect(result.reason).toContain("missing 'changes' object")
  })

  it("returns invalid when 'changes' is not an object", () => {
    const json = JSON.stringify({ changes: "string", timestamp: 123 })
    const result = validateTurboResponsePayload(json)
    expect(result.valid).toBe(false)
    expect(result.reason).toContain("missing 'changes' object")
  })

  it("returns invalid when 'changes' is null", () => {
    const json = JSON.stringify({ changes: null, timestamp: 123 })
    const result = validateTurboResponsePayload(json)
    expect(result.valid).toBe(false)
    expect(result.reason).toContain("missing 'changes' object")
  })

  it("returns valid when tables have empty deleted arrays", () => {
    const json = JSON.stringify({
      changes: {
        patients: { created: [{ id: "p1" }], deleted: [] },
        events: { deleted: [] },
      },
    })
    const result = validateTurboResponsePayload(json)
    expect(result.valid).toBe(true)
  })

  it("returns valid when a table has no deleted key at all", () => {
    const json = JSON.stringify({
      changes: {
        patients: { created: [{ id: "p1" }] },
      },
    })
    const result = validateTurboResponsePayload(json)
    expect(result.valid).toBe(true)
  })

  it("detects deleted records in any table, not just the first", () => {
    const json = JSON.stringify({
      changes: {
        patients: { created: [], updated: [], deleted: [] },
        visits: { created: [], updated: [], deleted: [] },
        events: { created: [], updated: [], deleted: ["id-1"] },
      },
    })
    const result = validateTurboResponsePayload(json)
    expect(result.valid).toBe(false)
    expect(result.reason).toContain("events")
  })
})
