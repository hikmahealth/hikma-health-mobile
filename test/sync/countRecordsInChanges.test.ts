import fc from "fast-check"
import { makeChangeset, makeRecord } from "../helpers/syncTestHelpers"

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
  safeStringify: jest.fn((_v: unknown, d: string) => d),
}))
jest.mock("../../app/utils/storage", () => ({}))
jest.mock("../../app/utils/date", () => ({ toDateSafe: jest.fn() }))

import { countRecordsInChanges } from "../../app/db/peerSync"

describe("countRecordsInChanges", () => {
  it("returns 0 for an empty changeset", () => {
    expect(countRecordsInChanges({})).toBe(0)
  })

  it("returns 0 when all tables have empty arrays", () => {
    const changes = makeChangeset({
      patients: { created: [], updated: [], deleted: [] },
      visits: { created: [], updated: [], deleted: [] },
    })
    expect(countRecordsInChanges(changes)).toBe(0)
  })

  it("counts records in a single table", () => {
    const changes = makeChangeset({
      patients: {
        created: [makeRecord({ id: "1" }), makeRecord({ id: "2" })],
        updated: [makeRecord({ id: "3" })],
        deleted: ["id-4"],
      },
    })
    expect(countRecordsInChanges(changes)).toBe(4)
  })

  it("counts records across multiple tables", () => {
    const changes = makeChangeset({
      patients: { created: [makeRecord()], updated: [], deleted: [] },
      visits: { created: [], updated: [makeRecord()], deleted: [] },
      events: { created: [], updated: [], deleted: ["id-1", "id-2"] },
    })
    expect(countRecordsInChanges(changes)).toBe(4)
  })

  it("handles tables with missing created/updated/deleted keys gracefully", () => {
    // This is an adversarial test — real changesets always have all 3 keys,
    // but malformed data from the server could be missing them.
    const changes = { patients: { created: [makeRecord()] } } as any
    // Should not crash — should either return a count or handle the missing keys
    expect(() => countRecordsInChanges(changes)).not.toThrow()
  })

  it("handles table value being null without crashing", () => {
    const changes = { patients: null } as any
    expect(() => countRecordsInChanges(changes)).not.toThrow()
  })

  it("handles table value being undefined without crashing", () => {
    const changes = { patients: undefined } as any
    expect(() => countRecordsInChanges(changes)).not.toThrow()
  })

  it("handles very large arrays", () => {
    const largeArray = Array.from({ length: 10000 }, (_, i) => makeRecord({ id: `rec-${i}` }))
    const changes = makeChangeset({
      patients: { created: largeArray, updated: [], deleted: [] },
    })
    expect(countRecordsInChanges(changes)).toBe(10000)
  })

  it("always returns a non-negative number for well-formed changesets", () => {
    const tableNameArb = fc.constantFrom("patients", "visits", "events", "clinics", "users")
    const recordArb = fc.record({ id: fc.uuid() })
    const tableArb = fc.record({
      created: fc.array(recordArb, { maxLength: 5 }),
      updated: fc.array(recordArb, { maxLength: 5 }),
      deleted: fc.array(fc.uuid(), { maxLength: 5 }),
    })
    const changesetArb = fc.dictionary(tableNameArb, tableArb, { maxKeys: 4 })

    fc.assert(
      fc.property(changesetArb, (changeset) => {
        const count = countRecordsInChanges(changeset as any)
        expect(count).toBeGreaterThanOrEqual(0)

        // Verify count equals sum of all array lengths
        let expected = 0
        for (const table of Object.values(changeset)) {
          expected += table.created.length + table.updated.length + table.deleted.length
        }
        expect(count).toBe(expected)
      }),
    )
  })
})
