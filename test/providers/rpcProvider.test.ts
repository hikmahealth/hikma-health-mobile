import { createRpcProvider } from "../../app/providers/rpcProvider"
import type { RpcTransport } from "../../app/rpc/transport"
import type { RpcResult } from "../../app/rpc/types"

// Mock all transformer modules
jest.mock("../../app/providers/transformers/patientTransformers", () => ({
  patientFromServer: jest.fn((s: any) => ({ ...s, _transformed: true })),
  patientFromGetPatient: jest.fn((id: string, _f: any, _v: any) => ({ id, _fromForm: true })),
  createPatientToRegister: jest.fn((d: any) => ({ ...d, _register: true })),
  updatePatientToRegister: jest.fn((id: string, d: any) => ({ id, ...d, _register: true })),
}))
jest.mock("../../app/providers/transformers/visitTransformers", () => ({
  visitFromServer: jest.fn((s: any) => ({ ...s, _transformed: true })),
  createVisitToServer: jest.fn((d: any) => ({ ...d, _server: true })),
}))
jest.mock("../../app/providers/transformers/eventTransformers", () => ({
  eventFromServer: jest.fn((s: any) => ({ ...s, _transformed: true })),
  createEventToServer: jest.fn((d: any) => ({ ...d, _server: true })),
  updateEventToServer: jest.fn((d: any) => ({ ...d, _server: true })),
}))
jest.mock("../../app/providers/transformers/vitalsTransformers", () => ({
  vitalsFromServer: jest.fn((s: any) => ({ ...s, _transformed: true })),
  createVitalsToServer: jest.fn((d: any) => ({ ...d, _server: true })),
}))
jest.mock("../../app/providers/transformers/problemTransformers", () => ({
  problemFromServer: jest.fn((s: any) => ({ ...s, _transformed: true })),
  createProblemToServer: jest.fn((d: any) => ({ ...d, _server: true })),
  updateProblemToServer: jest.fn((d: any) => ({ ...d, _server: true })),
}))

function createMockTransport(): RpcTransport {
  return {
    sendCommand: jest.fn(),
    sendQuery: jest.fn(),
    login: jest.fn(),
    heartbeat: jest.fn(),
  }
}

describe("rpcProvider", () => {
  let mockTransport: RpcTransport

  beforeEach(() => {
    mockTransport = createMockTransport()
  })

  function makeProvider() {
    return createRpcProvider(async () => mockTransport)
  }

  describe("patients", () => {
    it("getMany uses get_patients when no filters", async () => {
      const data = { data: [{ id: "1" }], total: 1, limit: 10, offset: 0 }
      ;(mockTransport.sendQuery as jest.Mock).mockResolvedValueOnce({ ok: true, data })

      const provider = makeProvider()
      const result = await provider.patients.getMany({ offset: 0, limit: 10, filters: {} })

      expect(result.ok).toBe(true)
      expect(mockTransport.sendQuery).toHaveBeenCalledWith("get_patients", {
        limit: 10,
        offset: 0,
      })
      if (result.ok) {
        expect(result.data.data[0]).toHaveProperty("_transformed", true)
        expect(result.data.pagination).toEqual({
          offset: 0,
          limit: 10,
          total: 1,
          hasMore: false,
        })
      }
    })

    it("getMany uses search_patients when search is provided", async () => {
      const data = { data: [], total: 0, limit: 20, offset: 0 }
      ;(mockTransport.sendQuery as jest.Mock).mockResolvedValueOnce({ ok: true, data })

      const provider = makeProvider()
      await provider.patients.getMany({ offset: 0, limit: 20, filters: {}, search: "Jane" })

      expect(mockTransport.sendQuery).toHaveBeenCalledWith("search_patients", {
        filters: { given_name: "Jane" },
        limit: 20,
        offset: 0,
      })
    })

    it("getById calls get_patient query", async () => {
      ;(mockTransport.sendQuery as jest.Mock).mockResolvedValueOnce({
        ok: true,
        data: {
          fields: [{ id: "given_name", column: "given_name", baseField: true }],
          values: { given_name: "Jane" },
        },
      })

      const provider = makeProvider()
      const result = await provider.patients.getById("p1")

      expect(mockTransport.sendQuery).toHaveBeenCalledWith("get_patient", { patient_id: "p1" })
      expect(result.ok).toBe(true)
      if (result.ok) expect(result.data).toHaveProperty("_fromForm", true)
    })

    it("getById returns null when backend returns error", async () => {
      ;(mockTransport.sendQuery as jest.Mock).mockResolvedValueOnce({
        ok: true,
        data: { error: "Patient not found" },
      })

      const provider = makeProvider()
      const result = await provider.patients.getById("missing")

      expect(result.ok).toBe(true)
      if (result.ok) expect(result.data).toBeNull()
    })

    it("create calls register_patient command", async () => {
      ;(mockTransport.sendCommand as jest.Mock).mockResolvedValueOnce({
        ok: true,
        data: { patient_id: "new-1", attributes_count: 2 },
      })

      const provider = makeProvider()
      const result = await provider.patients.create({} as any)

      expect(mockTransport.sendCommand).toHaveBeenCalledWith(
        "register_patient",
        expect.objectContaining({ _register: true }),
      )
      expect(result.ok).toBe(true)
      if (result.ok) expect(result.data.id).toBe("new-1")
    })
  })

  describe("events", () => {
    it("getByVisit calls sendQuery with get_visit_events", async () => {
      ;(mockTransport.sendQuery as jest.Mock).mockResolvedValueOnce({
        ok: true,
        data: { data: [{ id: "e1" }] },
      })

      const provider = makeProvider()
      const result = await provider.events.getByVisit("v1", "p1")

      expect(mockTransport.sendQuery).toHaveBeenCalledWith("get_visit_events", {
        patient_id: "p1",
        visit_id: "v1",
      })
      expect(result.ok).toBe(true)
    })

    it("getByFormAndPatient calls sendQuery with events.by_form", async () => {
      ;(mockTransport.sendQuery as jest.Mock).mockResolvedValueOnce({
        ok: true,
        data: [{ id: "e1" }],
      })

      const provider = makeProvider()
      await provider.events.getByFormAndPatient("f1", "p1")

      expect(mockTransport.sendQuery).toHaveBeenCalledWith("events.by_form", {
        form_id: "f1",
        patient_id: "p1",
      })
    })

    it("delete calls sendCommand with events.delete", async () => {
      ;(mockTransport.sendCommand as jest.Mock).mockResolvedValueOnce({
        ok: true,
        data: { success: true },
      })

      const provider = makeProvider()
      const result = await provider.events.delete("e1")

      expect(mockTransport.sendCommand).toHaveBeenCalledWith("events.delete", { id: "e1" })
      expect(result.ok).toBe(true)
    })
  })

  describe("error mapping", () => {
    it("AUTH_FAILED maps to Unauthorized", async () => {
      ;(mockTransport.sendQuery as jest.Mock).mockResolvedValueOnce({
        ok: false,
        error: { code: "AUTH_FAILED", message: "Unauthorized" },
      })

      const provider = makeProvider()
      const result = await provider.patients.getMany({ offset: 0, limit: 10 })

      expect(result.ok).toBe(false)
      if (!result.ok) expect(result.error._tag).toBe("Unauthorized")
    })

    it("SESSION_EXPIRED maps to Unauthorized", async () => {
      ;(mockTransport.sendQuery as jest.Mock).mockResolvedValueOnce({
        ok: false,
        error: { code: "SESSION_EXPIRED", message: "Session expired" },
      })

      const provider = makeProvider()
      const result = await provider.patients.getMany({ offset: 0, limit: 10 })

      expect(result.ok).toBe(false)
      if (!result.ok) expect(result.error._tag).toBe("Unauthorized")
    })

    it("NETWORK_ERROR maps to NetworkError", async () => {
      ;(mockTransport.sendQuery as jest.Mock).mockResolvedValueOnce({
        ok: false,
        error: { code: "NETWORK_ERROR", message: "Failed" },
      })

      const provider = makeProvider()
      const result = await provider.patients.getMany({ offset: 0, limit: 10 })

      expect(result.ok).toBe(false)
      if (!result.ok) expect(result.error._tag).toBe("NetworkError")
    })

    it("HUB_UNREACHABLE maps to NetworkError", async () => {
      ;(mockTransport.sendQuery as jest.Mock).mockResolvedValueOnce({
        ok: false,
        error: { code: "HUB_UNREACHABLE", message: "Hub offline" },
      })

      const provider = makeProvider()
      const result = await provider.patients.getMany({ offset: 0, limit: 10 })

      expect(result.ok).toBe(false)
      if (!result.ok) expect(result.error._tag).toBe("NetworkError")
    })

    it("DECRYPTION_FAILED maps to ServerError", async () => {
      ;(mockTransport.sendCommand as jest.Mock).mockResolvedValueOnce({
        ok: false,
        error: { code: "DECRYPTION_FAILED", message: "Bad decrypt" },
      })

      const provider = makeProvider()
      const result = await provider.events.delete("e1")

      expect(result.ok).toBe(false)
      if (!result.ok) expect(result.error._tag).toBe("ServerError")
    })
  })
})
