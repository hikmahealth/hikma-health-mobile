import fc from "fast-check"
import {
  visitFromServer,
  visitToServer,
  createVisitToServer,
} from "../../app/providers/transformers/visitTransformers"
import type { ServerVisit } from "../../app/providers/transformers/visitTransformers"

const serverVisitArb: fc.Arbitrary<ServerVisit> = fc.record({
  id: fc.uuid(),
  patient_id: fc.uuid(),
  clinic_id: fc.uuid(),
  provider_id: fc.uuid(),
  provider_name: fc.string({ minLength: 1, maxLength: 30 }),
  check_in_timestamp: fc
    .date({ min: new Date("2000-01-01"), max: new Date("2030-01-01") })
    .filter((d) => !isNaN(d.getTime()))
    .map((d) => d.toISOString()),
  is_deleted: fc.constant(false),
  deleted_at: fc.constant(null),
  metadata: fc.constant(null),
  created_at: fc
    .date({ min: new Date("2000-01-01"), max: new Date("2030-01-01") })
    .filter((d) => !isNaN(d.getTime()))
    .map((d) => d.toISOString()),
  updated_at: fc
    .date({ min: new Date("2000-01-01"), max: new Date("2030-01-01") })
    .filter((d) => !isNaN(d.getTime()))
    .map((d) => d.toISOString()),
})

describe("visitFromServer / visitToServer round-trip", () => {
  it("preserves id and string fields", () => {
    fc.assert(
      fc.property(serverVisitArb, (server) => {
        const domain = visitFromServer(server)
        const back = visitToServer(domain)

        expect(back.id).toBe(server.id)
        expect(back.patient_id).toBe(server.patient_id)
        expect(back.clinic_id).toBe(server.clinic_id)
        expect(back.provider_name).toBe(server.provider_name)
      }),
      { numRuns: 50 },
    )
  })
})

describe("createVisitToServer", () => {
  it("maps input to snake_case server payload", () => {
    const result = createVisitToServer({
      patientId: "p1",
      clinicId: "c1",
      providerId: "prov1",
      providerName: "Dr. Smith",
      checkInTimestamp: new Date("2024-06-01T10:00:00Z"),
      metadata: { note: "first visit" },
    })

    expect(result.patient_id).toBe("p1")
    expect(result.provider_name).toBe("Dr. Smith")
    expect(result.check_in_timestamp).toBe("2024-06-01T10:00:00.000Z")
    expect(result.metadata).toEqual({ note: "first visit" })
  })
})
