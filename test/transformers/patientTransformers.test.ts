import fc from "fast-check"
import {
  patientFromServer,
  patientToServer,
  createPatientToServer,
} from "../../app/providers/transformers/patientTransformers"
import type { ServerPatient } from "../../app/providers/transformers/patientTransformers"

/** fast-check arbitrary for a ServerPatient */
const serverPatientArb = fc.record({
  id: fc.uuid(),
  given_name: fc.string({ minLength: 1, maxLength: 50 }),
  surname: fc.string({ minLength: 1, maxLength: 50 }),
  date_of_birth: fc
    .date({ min: new Date("1900-01-01"), max: new Date("2025-01-01") })
    .filter((d) => !isNaN(d.getTime()))
    .map((d) => d.toISOString().slice(0, 10)),
  citizenship: fc.string(),
  hometown: fc.string(),
  phone: fc.string(),
  sex: fc.constantFrom("male", "female"),
  camp: fc.string(),
  photo_url: fc.constant(""),
  government_id: fc.string(),
  external_patient_id: fc.string(),
  additional_data: fc.constant({}),
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
  primary_clinic_id: fc.option(fc.uuid(), { nil: undefined }),
  last_modified_by: fc.option(fc.uuid(), { nil: undefined }),
}) as fc.Arbitrary<ServerPatient>

describe("patientFromServer", () => {
  it("maps snake_case fields to camelCase", () => {
    const server: ServerPatient = {
      id: "p1",
      given_name: "Jane",
      surname: "Doe",
      date_of_birth: "1990-05-15",
      citizenship: "US",
      hometown: "Portland",
      phone: "555",
      sex: "female",
      camp: "",
      photo_url: "",
      government_id: "GOV1",
      external_patient_id: "",
      additional_data: { custom: true },
      metadata: {},
      is_deleted: false,
      deleted_at: null,
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-06-01T00:00:00Z",
    }

    const result = patientFromServer(server)
    expect(result.givenName).toBe("Jane")
    expect(result.surname).toBe("Doe")
    expect(result.dateOfBirth).toBe("1990-05-15")
    expect(result.governmentId).toBe("GOV1")
    expect(result.additionalData).toEqual({ custom: true })
  })
})

describe("patientFromServer / patientToServer round-trip", () => {
  it("preserves string fields through round-trip", () => {
    fc.assert(
      fc.property(serverPatientArb, (server) => {
        const domain = patientFromServer(server)
        const backToServer = patientToServer(domain)

        // String fields preserved exactly
        expect(backToServer.given_name).toBe(server.given_name)
        expect(backToServer.surname).toBe(server.surname)
        expect(backToServer.date_of_birth).toBe(server.date_of_birth)
        expect(backToServer.sex).toBe(server.sex)
        expect(backToServer.government_id).toBe(server.government_id)
        expect(backToServer.id).toBe(server.id)
      }),
      { numRuns: 50 },
    )
  })
})

describe("createPatientToServer", () => {
  it("maps CreatePatientInput to server DTO with snake_case", () => {
    const dto = createPatientToServer({
      patient: {
        id: "p1",
        givenName: "Jane",
        surname: "Doe",
        dateOfBirth: "1990-05-15",
        sex: "female",
      },
      additionalAttributes: [
        {
          id: "a1",
          attributeId: "field-1",
          patientId: "p1",
          attribute: "blood_type",
          value: "A+",
        },
      ],
    })

    expect(dto.patient.given_name).toBe("Jane")
    expect(dto.patient.surname).toBe("Doe")
    expect(dto.additional_attributes).toHaveLength(1)
    expect(dto.additional_attributes[0].patient_id).toBe("p1")
    expect(dto.additional_attributes[0].attribute).toBe("blood_type")
  })
})
