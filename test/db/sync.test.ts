import { updateDates } from "../../app/db/sync"
import { SyncDatabaseChangeSet, SyncTableChangeSet, Timestamp } from "@nozbe/watermelondb/sync"

describe("updateDates", () => {
  const fixedDate = new Date("2025-01-28T09:55:54-07:00")
  const fixedTimestamp = fixedDate.getTime()

  it("should convert all date fields to timestamps", () => {
    const changes: SyncDatabaseChangeSet = {
      patients: {
        created: [
          {
            created_at: "2024-01-01T00:00:00Z",
            updated_at: "2024-01-02T00:00:00Z",
            deleted_at: "2024-01-03T00:00:00Z",
            timestamp: "2024-01-04T00:00:00Z",
            date_of_birth: "1990-05-15",
            metadata: { key: "value" },
            id: "1",
          },
        ],
        updated: [],
        deleted: [],
      },
    } as SyncDatabaseChangeSet

    updateDates(changes)

    const patient = changes.patients.created[0]
    expect(patient.created_at).toBe(new Date("2024-01-01T00:00:00Z").getTime())
    expect(patient.updated_at).toBe(new Date("2024-01-02T00:00:00Z").getTime())
    expect(patient.deleted_at).toBe(new Date("2024-01-03T00:00:00Z").getTime())
    expect(patient.timestamp).toBe(new Date("2024-01-04T00:00:00Z").getTime())
    expect(patient.date_of_birth).toBe("1990-05-15")
    expect(patient.metadata).toBe(JSON.stringify({ key: "value" }))
  })

  it("should handle null/undefined dates by using default date", () => {
    const changes: SyncDatabaseChangeSet = {
      patients: {
        created: [
          {
            created_at: null,
            updated_at: undefined,
            deleted_at: null,
            timestamp: undefined,
            id: "1",
          },
        ],
        updated: [],
        deleted: [],
      },
    }

    const now = new Date().getTime()
    updateDates(changes)

    const patient = changes.patients.created[0]
    expect(patient.created_at).toBe(now)
    expect(patient.updated_at).toBe(now)
    expect(patient.deleted_at).toBe(null)
    expect(patient.timestamp).toBe(undefined)
  })

  it("should handle prescription and appointment specific fields", () => {
    const changes: SyncDatabaseChangeSet = {
      prescriptions: {
        created: [
          {
            prescribed_at: "2024-01-01T00:00:00Z",
            filled_at: "2024-01-02T00:00:00Z",
            expiration_date: "2024-12-31T00:00:00Z",
            id: "1",
          },
        ],
        updated: [],
        deleted: [],
      },
    }

    updateDates(changes)

    const prescription = changes.prescriptions.created[0]
    expect(prescription.prescribed_at).toBe(new Date("2024-01-01T00:00:00Z").getTime())
    expect(prescription.filled_at).toBe(new Date("2024-01-02T00:00:00Z").getTime())
    expect(prescription.expiration_date).toBe(new Date("2024-12-31T00:00:00Z").getTime())
  })

  it("should handle form fields and metadata JSON stringification", () => {
    const changes: SyncDatabaseChangeSet = {
      forms: {
        created: [
          {
            form_fields: { field1: "value1" },
            form_data: { data1: "value1" },
            fields: { custom: "field" },
            metadata: { meta: "data" },
            id: "1",
          },
        ],
        updated: [],
        deleted: [],
      },
    }

    updateDates(changes)

    const form = changes.forms.created[0]
    expect(form.form_fields).toBe(JSON.stringify({ field1: "value1" }))
    expect(form.form_data).toBe(JSON.stringify({ data1: "value1" }))
    expect(form.fields).toBe(JSON.stringify({ custom: "field" }))
    expect(form.metadata).toBe(JSON.stringify({ meta: "data" }))
  })

  it("should handle visit check-in timestamps", () => {
    const changes: SyncDatabaseChangeSet = {
      visits: {
        created: [
          {
            check_in_timestamp: "2024-01-01T00:00:00Z",
            image_timestamp: null,
            id: "1",
          },
        ],
        updated: [],
        deleted: [],
      },
    }

    updateDates(changes)

    const visit = changes.visits.created[0]
    expect(visit.check_in_timestamp).toBe(new Date("2024-01-01T00:00:00Z").getTime())
    expect(visit.image_timestamp).toBe(0)
  })

  it("should process records in all change types (created, updated, deleted)", () => {
    const record = {
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
      id: "1",
    }

    const changes: SyncDatabaseChangeSet = {
      patients: {
        created: [{ ...record }],
        updated: [{ ...record }],
        deleted: [{ ...record }],
      },
    }

    updateDates(changes)

    const expectedTimestamp = new Date("2024-01-01T00:00:00Z").getTime()

    expect(changes.patients.created[0].created_at).toBe(expectedTimestamp)
    expect(changes.patients.updated[0].created_at).toBe(expectedTimestamp)
    expect(changes.patients.deleted[0].created_at).toBe(expectedTimestamp)
  })
})
