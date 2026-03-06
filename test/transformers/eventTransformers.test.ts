import fc from "fast-check"
import {
  eventFromServer,
  eventToServer,
  createEventToServer,
} from "../../app/providers/transformers/eventTransformers"
import type { ServerEvent } from "../../app/providers/transformers/eventTransformers"

const serverEventArb: fc.Arbitrary<ServerEvent> = fc.record({
  id: fc.uuid(),
  patient_id: fc.uuid(),
  visit_id: fc.uuid(),
  event_type: fc.string({ minLength: 1, maxLength: 20 }),
  form_id: fc.uuid(),
  form_data: fc.constant([]),
  metadata: fc.constant({}),
  is_deleted: fc.constant(false),
  deleted_at: fc.constant(null),
  created_at: fc
    .date({ min: new Date("2000-01-01"), max: new Date("2030-01-01") })
    .filter((d) => !isNaN(d.getTime()))
    .map((d) => d.toISOString()),
  updated_at: fc
    .date({ min: new Date("2000-01-01"), max: new Date("2030-01-01") })
    .filter((d) => !isNaN(d.getTime()))
    .map((d) => d.toISOString()),
})

describe("eventFromServer / eventToServer round-trip", () => {
  it("preserves id and string fields", () => {
    fc.assert(
      fc.property(serverEventArb, (server) => {
        const domain = eventFromServer(server)
        const back = eventToServer(domain)

        expect(back.id).toBe(server.id)
        expect(back.patient_id).toBe(server.patient_id)
        expect(back.visit_id).toBe(server.visit_id)
        expect(back.event_type).toBe(server.event_type)
        expect(back.form_id).toBe(server.form_id)
      }),
      { numRuns: 50 },
    )
  })
})

describe("createEventToServer", () => {
  it("maps input to snake_case server payload", () => {
    const result = createEventToServer({
      patientId: "p1",
      visitId: "v1",
      eventType: "form",
      formId: "f1",
      formData: [
        { inputType: "text", fieldType: "text", name: "Notes", value: "ok", fieldId: "n1" },
      ],
      metadata: { providerId: "prov1" },
    })

    expect(result.patient_id).toBe("p1")
    expect(result.visit_id).toBe("v1")
    expect(result.form_data).toHaveLength(1)
    expect(result.metadata).toEqual({ providerId: "prov1" })
  })
})
