import fc from "fast-check"
import { makeChangeset, makeRecord } from "../helpers/syncTestHelpers"
import { mockSafeStringify } from "../helpers/syncMocks"

// ---------------------------------------------------------------------------
// Mocks
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
  safeStringify: jest.fn((v: unknown, d: string) => mockSafeStringify(v, d)),
}))
jest.mock("../../app/utils/storage", () => ({}))
jest.mock("../../app/utils/date", () => ({
  toDateSafe: jest.fn((v: unknown, fallback: Date) => {
    const d = new Date(v as string | number)
    return isNaN(d.getTime()) ? fallback : d
  }),
}))

import { updateDates } from "../../app/db/peerSync"

describe("updateDates", () => {
  // =========================================================================
  // Empty / no-op scenarios
  // =========================================================================
  describe("empty changesets", () => {
    it("handles an empty changeset without crashing", () => {
      const changes = {}
      expect(() => updateDates(changes as any)).not.toThrow()
    })

    it("handles tables with empty arrays", () => {
      const changes = makeChangeset({
        patients: { created: [], updated: [], deleted: [] },
      })
      expect(() => updateDates(changes)).not.toThrow()
    })
  })

  // =========================================================================
  // Timestamp conversion (created_at, updated_at, etc.)
  // =========================================================================
  describe("timestamp fields", () => {
    it("converts ISO string created_at / updated_at to numeric timestamps", () => {
      const record = makeRecord({
        created_at: "2024-06-15T10:00:00Z",
        updated_at: "2024-06-15T12:00:00Z",
      })
      const changes = makeChangeset({ patients: { created: [record] } })
      updateDates(changes)
      expect(typeof record.created_at).toBe("number")
      expect(typeof record.updated_at).toBe("number")
      expect(record.created_at).toBe(new Date("2024-06-15T10:00:00Z").getTime())
      expect(record.updated_at).toBe(new Date("2024-06-15T12:00:00Z").getTime())
    })

    it("uses fallback for null created_at", () => {
      const record = makeRecord({ created_at: null })
      const changes = makeChangeset({ patients: { created: [record] } })
      updateDates(changes)
      expect(typeof record.created_at).toBe("number")
      expect(isNaN(record.created_at as number)).toBe(false)
    })

    it("uses fallback for undefined created_at", () => {
      const record = makeRecord({ created_at: undefined })
      const changes = makeChangeset({ patients: { created: [record] } })
      updateDates(changes)
      expect(typeof record.created_at).toBe("number")
      expect(isNaN(record.created_at as number)).toBe(false)
    })

    it("does not double-convert numeric timestamps", () => {
      const ts = 1718445600000 // already a ms timestamp
      const record = makeRecord({ created_at: ts, updated_at: ts })
      const changes = makeChangeset({ patients: { created: [record] } })
      updateDates(changes)
      expect(record.created_at).toBe(ts)
      expect(record.updated_at).toBe(ts)
    })

    it("handles NaN created_at by using fallback", () => {
      const record = makeRecord({ created_at: NaN })
      const changes = makeChangeset({ patients: { created: [record] } })
      updateDates(changes)
      expect(typeof record.created_at).toBe("number")
      expect(isNaN(record.created_at as number)).toBe(false)
    })

    it("converts deleted_at only when present", () => {
      const record = makeRecord({ deleted_at: "2024-01-20T00:00:00Z" })
      const changes = makeChangeset({ patients: { created: [record] } })
      updateDates(changes)
      expect(record.deleted_at).toBe(new Date("2024-01-20T00:00:00Z").getTime())
    })

    it("converts prescription/appointment timestamps when present", () => {
      const record = makeRecord({
        prescribed_at: "2024-03-01T10:00:00Z",
        filled_at: "2024-03-02T10:00:00Z",
        expiration_date: "2025-03-01T00:00:00Z",
        check_in_timestamp: "2024-03-01T08:00:00Z",
      })
      const changes = makeChangeset({ prescriptions: { created: [record] } })
      updateDates(changes)
      expect(record.prescribed_at).toBe(new Date("2024-03-01T10:00:00Z").getTime())
      expect(record.filled_at).toBe(new Date("2024-03-02T10:00:00Z").getTime())
      expect(record.expiration_date).toBe(new Date("2025-03-01T00:00:00Z").getTime())
      expect(record.check_in_timestamp).toBe(new Date("2024-03-01T08:00:00Z").getTime())
    })

    it("sets image_timestamp to 0 always", () => {
      const record = makeRecord({ image_timestamp: 999 })
      const changes = makeChangeset({ patients: { created: [record] } })
      updateDates(changes)
      expect(record.image_timestamp).toBe(0)
    })

    it("handles records with no id field gracefully", () => {
      const record = { created_at: "bad-date", updated_at: "2024-01-01T00:00:00Z" }
      const changes = makeChangeset({ patients: { created: [record] } })
      expect(() => updateDates(changes)).not.toThrow()
    })

    it("processes records across created, updated, and deleted arrays", () => {
      const r1 = makeRecord({ id: "1", created_at: "2024-01-01T00:00:00Z" })
      const r2 = makeRecord({ id: "2", created_at: "2024-02-01T00:00:00Z" })
      const changes = makeChangeset({
        patients: { created: [r1], updated: [r2], deleted: [] },
      })
      updateDates(changes)
      expect(typeof r1.created_at).toBe("number")
      expect(typeof r2.created_at).toBe("number")
    })

    it("processes multiple tables", () => {
      const patient = makeRecord({ id: "p1" })
      const visit = makeRecord({ id: "v1" })
      const changes = makeChangeset({
        patients: { created: [patient] },
        visits: { updated: [visit] },
      })
      updateDates(changes)
      expect(typeof patient.created_at).toBe("number")
      expect(typeof visit.created_at).toBe("number")
    })
  })

  // =========================================================================
  // JSON field stringification
  // =========================================================================
  describe("JSON fields", () => {
    it("stringifies metadata object to JSON string", () => {
      const record = makeRecord({ metadata: { key: "value" } })
      const changes = makeChangeset({ events: { created: [record] } })
      updateDates(changes)
      expect(record.metadata).toBe('{"key":"value"}')
    })

    it("normalizes already-stringified metadata", () => {
      const record = makeRecord({ metadata: '{"key":"value"}' })
      const changes = makeChangeset({ events: { created: [record] } })
      updateDates(changes)
      expect(record.metadata).toBe('{"key":"value"}')
    })

    it("skips null metadata (falsy guard)", () => {
      const record = makeRecord({ metadata: null })
      const changes = makeChangeset({ events: { created: [record] } })
      updateDates(changes)
      expect(record.metadata).toBeNull()
    })

    it("skips undefined metadata", () => {
      const record = makeRecord({ metadata: undefined })
      const changes = makeChangeset({ events: { created: [record] } })
      updateDates(changes)
      expect(record.metadata).toBeUndefined()
    })

    it("skips empty string metadata (falsy guard)", () => {
      const record = makeRecord({ metadata: "" })
      const changes = makeChangeset({ events: { created: [record] } })
      updateDates(changes)
      expect(record.metadata).toBe("")
    })

    it("stringifies form_data array", () => {
      const record = makeRecord({ form_data: [{ field: "test", value: "abc" }] })
      const changes = makeChangeset({ events: { created: [record] } })
      updateDates(changes)
      expect(record.form_data).toBe('[{"field":"test","value":"abc"}]')
    })

    it("stringifies departments array", () => {
      const record = makeRecord({ departments: ["dept-1", "dept-2"] })
      const changes = makeChangeset({ clinics: { created: [record] } })
      updateDates(changes)
      expect(record.departments).toBe('["dept-1","dept-2"]')
    })

    it("stringifies all JSON fields on a single record", () => {
      const record = makeRecord({
        metadata: { a: 1 },
        form_fields: [{ name: "f1" }],
        translations: [{ en: "hi" }],
        clinic_ids: ["c1"],
        form_data: [{ x: 1 }],
        fields: [{ y: 2 }],
      })
      const changes = makeChangeset({ events: { created: [record] } })
      updateDates(changes)
      expect(typeof record.metadata).toBe("string")
      expect(typeof record.form_fields).toBe("string")
      expect(typeof record.translations).toBe("string")
      expect(typeof record.clinic_ids).toBe("string")
      expect(typeof record.form_data).toBe("string")
      expect(typeof record.fields).toBe("string")
    })

    it("handles numeric value in a JSON field via safeStringify", () => {
      const record = makeRecord({ departments: 42 })
      const changes = makeChangeset({ clinics: { created: [record] } })
      updateDates(changes)
      expect(record.departments).toBe("42")
    })
  })

  // =========================================================================
  // date_of_birth special handling
  // =========================================================================
  describe("date_of_birth", () => {
    it("keeps YYYY-MM-DD string as-is", () => {
      const record = makeRecord({ date_of_birth: "1990-05-15" })
      const changes = makeChangeset({ patients: { created: [record] } })
      updateDates(changes)
      expect(record.date_of_birth).toBe("1990-05-15")
    })

    it("converts ISO string with time to YYYY-MM-DD using UTC", () => {
      const record = makeRecord({ date_of_birth: "1990-05-15T00:00:00Z" })
      const changes = makeChangeset({ patients: { created: [record] } })
      updateDates(changes)
      expect(record.date_of_birth).toBe("1990-05-15")
    })

    it("handles midnight boundary timezone edge case correctly", () => {
      // 23:59 UTC-5 is 2024-01-16 04:59 UTC — should produce "2024-01-16" not "2024-01-15"
      const record = makeRecord({ date_of_birth: "2024-01-15T23:59:59-05:00" })
      const changes = makeChangeset({ patients: { created: [record] } })
      updateDates(changes)
      // UTC interpretation: 2024-01-16T04:59:59Z
      expect(record.date_of_birth).toBe("2024-01-16")
    })

    it("sets null date_of_birth for 0000-00-00", () => {
      const record = makeRecord({ date_of_birth: "0000-00-00" })
      const changes = makeChangeset({ patients: { created: [record] } })
      updateDates(changes)
      expect(record.date_of_birth).toBeNull()
    })

    it("keeps future dates (valid format)", () => {
      const record = makeRecord({ date_of_birth: "2099-12-31" })
      const changes = makeChangeset({ patients: { created: [record] } })
      updateDates(changes)
      expect(record.date_of_birth).toBe("2099-12-31")
    })

    it("converts epoch 0 (number) to 1970-01-01", () => {
      const record = makeRecord({ date_of_birth: 0 })
      const changes = makeChangeset({ patients: { created: [record] } })
      updateDates(changes)
      expect(record.date_of_birth).toBe("1970-01-01")
    })

    it("does not modify null date_of_birth", () => {
      const record = makeRecord({ date_of_birth: null })
      const changes = makeChangeset({ patients: { created: [record] } })
      updateDates(changes)
      expect(record.date_of_birth).toBeNull()
    })

    it("does not modify undefined date_of_birth", () => {
      const record = makeRecord({ date_of_birth: undefined })
      const changes = makeChangeset({ patients: { created: [record] } })
      updateDates(changes)
      expect(record.date_of_birth).toBeUndefined()
    })

    it("sets empty string date_of_birth to null", () => {
      const record = makeRecord({ date_of_birth: "" })
      const changes = makeChangeset({ patients: { created: [record] } })
      updateDates(changes)
      // Empty string: the code enters the conversion branch since "" !== undefined && "" !== null
      // new Date("") is Invalid Date → should be set to null
      expect(record.date_of_birth).toBeNull()
    })

    it("converts numeric timestamp to YYYY-MM-DD", () => {
      const ts = new Date("2000-06-15T00:00:00Z").getTime()
      const record = makeRecord({ date_of_birth: ts })
      const changes = makeChangeset({ patients: { created: [record] } })
      updateDates(changes)
      expect(record.date_of_birth).toBe("2000-06-15")
    })

    it("output is always null or YYYY-MM-DD for any valid date", () => {
      fc.assert(
        fc.property(
          fc.date({ min: new Date("1900-01-01"), max: new Date("2100-01-01") }),
          (date) => {
            const record = makeRecord({ date_of_birth: date.toISOString() })
            const changes = makeChangeset({ patients: { created: [record] } })
            updateDates(changes)
            const dob = record.date_of_birth as string | null
            if (dob !== null) {
              expect(dob).toMatch(/^\d{4}-\d{2}-\d{2}$/)
            }
          },
        ),
      )
    })
  })

  // =========================================================================
  // Deleted arrays — WatermelonDB deleted arrays contain string IDs, not objects
  // =========================================================================
  describe("deleted array handling", () => {
    it("does not crash when deleted array contains string IDs", () => {
      const changes = makeChangeset({
        patients: { created: [], updated: [], deleted: ["id-1", "id-2"] as any },
      })
      expect(() => updateDates(changes)).not.toThrow()
    })
  })
})
