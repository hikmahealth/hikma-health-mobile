import { createOnlineProvider } from "../../app/providers/onlineProvider"
import type { HttpClient, HttpResponse } from "../../app/providers/httpClient"

/** Create a mock HttpClient where each method returns a configurable response */
function createMockHttpClient(overrides?: Partial<HttpClient>): HttpClient {
  return {
    get: jest.fn().mockResolvedValue({
      ok: false,
      error: { message: "not mocked", statusCode: 500 },
      status: 500,
    }),
    post: jest.fn().mockResolvedValue({
      ok: false,
      error: { message: "not mocked", statusCode: 500 },
      status: 500,
    }),
    put: jest.fn().mockResolvedValue({
      ok: false,
      error: { message: "not mocked", statusCode: 500 },
      status: 500,
    }),
    delete: jest.fn().mockResolvedValue({
      ok: false,
      error: { message: "not mocked", statusCode: 500 },
      status: 500,
    }),
    ...overrides,
  }
}

const MOCK_SERVER_PATIENT = {
  id: "p1",
  given_name: "Jane",
  surname: "Doe",
  date_of_birth: "1990-05-15",
  citizenship: "US",
  hometown: "Portland",
  phone: "555-1234",
  sex: "female",
  camp: "",
  photo_url: "",
  government_id: "GOV123",
  external_patient_id: "",
  additional_data: {},
  metadata: {},
  is_deleted: false,
  deleted_at: null,
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-06-01T00:00:00Z",
}

describe("onlineProvider.patients", () => {
  it("getMany returns transformed patients on success", async () => {
    const httpClient = createMockHttpClient({
      get: jest.fn().mockResolvedValue({
        ok: true,
        data: {
          data: [MOCK_SERVER_PATIENT],
          pagination: { offset: 0, limit: 10, total: 1, hasMore: false },
        },
        status: 200,
      }),
    })
    const provider = createOnlineProvider(httpClient)

    const result = await provider.patients.getMany({ limit: 10 })

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.data).toHaveLength(1)
      expect(result.data.data[0].givenName).toBe("Jane")
      expect(result.data.data[0].governmentId).toBe("GOV123")
      expect(result.data.pagination.total).toBe(1)
    }
  })

  it("getMany returns error on network failure", async () => {
    const httpClient = createMockHttpClient({
      get: jest.fn().mockResolvedValue({
        ok: false,
        error: { message: "Network error", statusCode: 0 },
        status: 0,
      }),
    })
    const provider = createOnlineProvider(httpClient)

    const result = await provider.patients.getMany({})

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error._tag).toBe("NetworkError")
    }
  })

  it("create sends patient + additionalAttributes to server via tRPC", async () => {
    const httpClient = createMockHttpClient({
      post: jest.fn().mockResolvedValue({
        ok: true,
        data: { success: true, id: "p1" },
        status: 200,
      }),
    })
    const provider = createOnlineProvider(httpClient)

    const result = await provider.patients.create({
      patient: {
        id: "p1",
        givenName: "Jane",
        surname: "Doe",
        dateOfBirth: "1990-05-15",
        sex: "female",
      },
      additionalAttributes: [
        {
          id: "attr-1",
          attributeId: "field-blood",
          patientId: "p1",
          attribute: "blood_type",
          value: "A+",
        },
      ],
    })

    expect(result.ok).toBe(true)
    if (result.ok) expect(result.data.id).toBe("p1")

    // Verify the payload sent to server via tRPC endpoint
    expect(httpClient.post).toHaveBeenCalledWith(
      "/api/trpc/patients.create",
      expect.objectContaining({
        patient: expect.objectContaining({ given_name: "Jane", surname: "Doe" }),
        additionalAttributes: expect.arrayContaining([
          expect.objectContaining({
            attribute_id: "field-blood",
            attribute: "blood_type",
            string_value: "A+",
          }),
        ]),
      }),
    )
  })
})

describe("onlineProvider.events", () => {
  it("create sends event data and returns eventId + visitId", async () => {
    const httpClient = createMockHttpClient({
      post: jest.fn().mockResolvedValue({
        ok: true,
        data: { success: true, id: "e1", visit_id: "v1" },
        status: 200,
      }),
    })
    const provider = createOnlineProvider(httpClient)

    const result = await provider.events.create({
      patientId: "p1",
      visitId: "v1",
      eventType: "form",
      formId: "f1",
      formData: [],
    })

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.eventId).toBe("e1")
      expect(result.data.visitId).toBe("v1")
    }
  })

  it("getByFormAndPatient fetches events filtered by form and patient", async () => {
    const httpClient = createMockHttpClient({
      get: jest.fn().mockResolvedValue({
        ok: true,
        data: [
          {
            id: "e1",
            patient_id: "p1",
            visit_id: "v1",
            event_type: "vitals",
            form_id: "f1",
            form_data: [],
            metadata: {},
            is_deleted: false,
            deleted_at: null,
            created_at: "2024-06-01T00:00:00Z",
            updated_at: "2024-06-01T00:00:00Z",
          },
        ],
        status: 200,
      }),
    })
    const provider = createOnlineProvider(httpClient)

    const result = await provider.events.getByFormAndPatient("f1", "p1")

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data).toHaveLength(1)
      expect(result.data[0].formId).toBe("f1")
    }
    expect(httpClient.get).toHaveBeenCalledWith("/api/patients/p1/events", { form_id: "f1" })
  })

  it("delete calls DELETE endpoint", async () => {
    const httpClient = createMockHttpClient({
      delete: jest.fn().mockResolvedValue({
        ok: true,
        data: { success: true },
        status: 200,
      }),
    })
    const provider = createOnlineProvider(httpClient)

    const result = await provider.events.delete("e1")

    expect(result.ok).toBe(true)
    expect(httpClient.delete).toHaveBeenCalledWith("/api/events/e1")
  })
})

describe("onlineProvider.vitals", () => {
  it("getByPatient returns transformed vitals", async () => {
    const httpClient = createMockHttpClient({
      get: jest.fn().mockResolvedValue({
        ok: true,
        data: [
          {
            id: "v1",
            patient_id: "p1",
            visit_id: null,
            timestamp: "2024-06-15T10:00:00Z",
            systolic_bp: 120,
            diastolic_bp: 80,
            bp_position: "sitting",
            height_cm: 170,
            weight_kg: 70,
            bmi: 24.2,
            waist_circumference_cm: null,
            heart_rate: null,
            pulse_rate: 72,
            oxygen_saturation: 98,
            respiratory_rate: null,
            temperature_celsius: 36.8,
            pain_level: null,
            recorded_by_user_id: "user1",
            metadata: {},
            is_deleted: false,
            created_at: "2024-06-15T10:00:00Z",
            updated_at: "2024-06-15T10:00:00Z",
            deleted_at: null,
          },
        ],
        status: 200,
      }),
    })
    const provider = createOnlineProvider(httpClient)

    const result = await provider.vitals.getByPatient("p1")

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data).toHaveLength(1)
      expect(result.data[0].patientId).toBe("p1")
    }
    expect(httpClient.get).toHaveBeenCalledWith("/api/patients/p1/vitals")
  })

  it("create sends vitals data to server", async () => {
    const httpClient = createMockHttpClient({
      post: jest.fn().mockResolvedValue({
        ok: true,
        data: { success: true, id: "v1" },
        status: 200,
      }),
    })
    const provider = createOnlineProvider(httpClient)

    const { Option } = require("effect")
    const result = await provider.vitals.create({
      patientId: "p1",
      visitId: Option.none(),
      timestamp: new Date("2024-06-15T10:00:00Z"),
      systolicBp: Option.some(120),
      diastolicBp: Option.some(80),
      bpPosition: Option.some("sitting"),
      heightCm: Option.none(),
      weightKg: Option.none(),
      bmi: Option.none(),
      waistCircumferenceCm: Option.none(),
      heartRate: Option.none(),
      pulseRate: Option.none(),
      oxygenSaturation: Option.none(),
      respiratoryRate: Option.none(),
      temperatureCelsius: Option.none(),
      painLevel: Option.none(),
      recordedByUserId: Option.some("user1"),
      metadata: {},
      isDeleted: false,
    })

    expect(result.ok).toBe(true)
    if (result.ok) expect(result.data.id).toBe("v1")
  })
})

describe("onlineProvider.problems", () => {
  it("getByPatient returns transformed problems", async () => {
    const httpClient = createMockHttpClient({
      get: jest.fn().mockResolvedValue({
        ok: true,
        data: [
          {
            id: "prob1",
            patient_id: "p1",
            visit_id: null,
            problem_code_system: "icd11",
            problem_code: "BA00",
            problem_label: "Essential hypertension",
            clinical_status: "active",
            verification_status: "confirmed",
            severity_score: 5,
            onset_date: "2024-01-15T00:00:00Z",
            end_date: null,
            recorded_by_user_id: "user1",
            metadata: {},
            is_deleted: false,
            created_at: "2024-01-15T10:00:00Z",
            updated_at: "2024-06-01T10:00:00Z",
            deleted_at: null,
          },
        ],
        status: 200,
      }),
    })
    const provider = createOnlineProvider(httpClient)

    const result = await provider.problems.getByPatient("p1")

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data).toHaveLength(1)
      expect(result.data[0].problemLabel).toBe("Essential hypertension")
      expect(result.data[0].clinicalStatus).toBe("active")
    }
    expect(httpClient.get).toHaveBeenCalledWith("/api/patients/p1/problems")
  })

  it("create sends problem data to server", async () => {
    const httpClient = createMockHttpClient({
      post: jest.fn().mockResolvedValue({
        ok: true,
        data: { success: true, id: "prob1" },
        status: 200,
      }),
    })
    const provider = createOnlineProvider(httpClient)

    const { Option } = require("effect")
    const result = await provider.problems.create({
      patientId: "p1",
      visitId: Option.none(),
      problemCodeSystem: "icd11",
      problemCode: "BA00",
      problemLabel: "Essential hypertension",
      clinicalStatus: "active",
      verificationStatus: "provisional",
      severityScore: Option.some(5),
      onsetDate: Option.some(new Date("2024-01-15")),
      endDate: Option.none(),
      recordedByUserId: Option.some("user1"),
      metadata: {},
      isDeleted: false,
    })

    expect(result.ok).toBe(true)
    if (result.ok) expect(result.data.id).toBe("prob1")
  })
})
