import { createEncryptedTransport, createCloudTransport } from "../../app/rpc/transport"
import { encryptForWire, decryptFromWire } from "../../app/rpc/wire"
import { seal } from "../../app/crypto/cipher"
import { encode, utf8Encode } from "../../app/crypto/encoding"
import { randomBytes } from "@noble/ciphers/utils"
import type { HubSession } from "../../app/rpc/handshake"
import type { LoginResponse } from "../../app/rpc/types"

// Mock global fetch
const mockFetch = jest.fn()
global.fetch = mockFetch

function createMockSession(): HubSession {
  return {
    hubUrl: "http://192.168.1.100:8080",
    hubId: "hub-123",
    clientId: "client-456",
    sharedKey: randomBytes(32),
    token: "test-token",
  }
}

/** Helper: encrypt a response payload that the hub would send back */
function encryptResponse(
  key: Uint8Array,
  data: object,
  aad: "command_response" | "query_response",
) {
  const plaintext = utf8Encode(JSON.stringify(data))
  const sealed = seal(key, plaintext, aad)
  return { payload: encode(sealed) }
}

describe("createEncryptedTransport", () => {
  beforeEach(() => mockFetch.mockReset())

  it("sendCommand encrypts request and decrypts response", async () => {
    const session = createMockSession()
    const transport = createEncryptedTransport(session)
    const responseData = { id: "123", success: true }

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => encryptResponse(session.sharedKey, responseData, "command_response"),
    })

    const result = await transport.sendCommand("patients.create", { name: "Test" }, "token")
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.data).toEqual(responseData)

    // Verify fetch was called with the right URL
    expect(mockFetch).toHaveBeenCalledWith(
      `${session.hubUrl}/rpc/command`,
      expect.objectContaining({ method: "POST" }),
    )

    // Verify the request body is encrypted (contains client_id and payload)
    const callBody = JSON.parse(mockFetch.mock.calls[0][1].body)
    expect(callBody.client_id).toBe(session.clientId)
    expect(typeof callBody.payload).toBe("string")

    // Verify we can decrypt what was sent
    const decrypted = decryptFromWire(session.sharedKey, callBody.payload, "command")
    expect(decrypted).toMatchObject({ command: "patients.create", data: { name: "Test" } })
  })

  it("sendQuery encrypts request and decrypts response", async () => {
    const session = createMockSession()
    const transport = createEncryptedTransport(session)
    const responseData = [{ id: "1", name: "Patient 1" }]

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => encryptResponse(session.sharedKey, responseData, "query_response"),
    })

    const result = await transport.sendQuery("get_patients", { limit: 10 })
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.data).toEqual(responseData)

    expect(mockFetch).toHaveBeenCalledWith(
      `${session.hubUrl}/rpc/query`,
      expect.objectContaining({ method: "POST" }),
    )
  })

  it("login sends encrypted login command", async () => {
    const session = createMockSession()
    const transport = createEncryptedTransport(session)
    const loginData: LoginResponse = {
      token: "jwt-token",
      user_id: "user-1",
      clinic_id: "clinic-1",
      role: "provider",
      name: "Test User",
    }

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => encryptResponse(session.sharedKey, loginData, "command_response"),
    })

    const result = await transport.login("test@example.com", "password123")
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.data).toEqual(loginData)
  })

  it("heartbeat returns true on success", async () => {
    const session = createMockSession()
    const transport = createEncryptedTransport(session)

    mockFetch.mockResolvedValueOnce({ ok: true })
    expect(await transport.heartbeat()).toBe(true)

    expect(mockFetch).toHaveBeenCalledWith(
      `${session.hubUrl}/rpc/heartbeat`,
      expect.objectContaining({ method: "GET" }),
    )
  })

  it("network error returns NETWORK_ERROR", async () => {
    const session = createMockSession()
    const transport = createEncryptedTransport(session)

    mockFetch.mockRejectedValueOnce(new Error("Network failure"))
    const result = await transport.sendCommand("test", {})
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.code).toBe("NETWORK_ERROR")
  })
})

describe("createCloudTransport", () => {
  beforeEach(() => mockFetch.mockReset())

  it("sendCommand sends plain JSON with auth header", async () => {
    const transport = createCloudTransport("https://api.example.com", () => "Bearer token123")
    const responseData = { id: "123" }

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => responseData,
    })

    const result = await transport.sendCommand("patients.create", { name: "Test" })
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.data).toEqual(responseData)

    const [url, options] = mockFetch.mock.calls[0]
    expect(url).toBe("https://api.example.com/rpc/command")
    expect(options.headers.Authorization).toBe("Bearer token123")
    expect(JSON.parse(options.body)).toEqual({ command: "patients.create", data: { name: "Test" } })
  })

  it("sendQuery sends plain JSON with auth header", async () => {
    const transport = createCloudTransport("https://api.example.com", () => "Bearer token123")
    const responseData = [{ id: "1" }]

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => responseData,
    })

    const result = await transport.sendQuery("get_patients", { limit: 10 })
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.data).toEqual(responseData)

    const [url, options] = mockFetch.mock.calls[0]
    expect(url).toBe("https://api.example.com/rpc/query")
    expect(options.headers.Authorization).toBe("Bearer token123")
  })

  it("login sends without auth header", async () => {
    const transport = createCloudTransport("https://api.example.com", () => "Bearer token123")
    const loginData: LoginResponse = {
      token: "jwt",
      user_id: "u1",
      clinic_id: "c1",
      role: "provider",
    }

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => loginData,
    })

    const result = await transport.login("test@example.com", "pass")
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.data).toEqual(loginData)

    const [, options] = mockFetch.mock.calls[0]
    expect(options.headers.Authorization).toBeUndefined()
  })

  it("network error returns NETWORK_ERROR", async () => {
    const transport = createCloudTransport("https://api.example.com", () => "Bearer x")
    mockFetch.mockRejectedValueOnce(new Error("Fetch failed"))

    const result = await transport.sendCommand("test", {})
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.code).toBe("NETWORK_ERROR")
  })

  it("401 returns AUTH_FAILED", async () => {
    const transport = createCloudTransport("https://api.example.com", () => "Bearer x")
    mockFetch.mockResolvedValueOnce({ ok: false, status: 401 })

    const result = await transport.sendCommand("test", {})
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.code).toBe("AUTH_FAILED")
  })
})
