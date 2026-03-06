import { performHandshake } from "../../app/rpc/handshake"
import { generateKeyPair } from "../../app/crypto/keys"
import { encode } from "../../app/crypto/encoding"

const mockFetch = jest.fn()
global.fetch = mockFetch

describe("rpc/handshake", () => {
  beforeEach(() => mockFetch.mockReset())

  it("success: returns valid HubSession with 32-byte sharedKey", async () => {
    // Generate a fake hub keypair to simulate the hub response
    const hubKeys = generateKeyPair()

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        hub_public_key: encode(hubKeys.publicKey),
        hub_id: "hub-abc",
        success: true,
      }),
    })

    const result = await performHandshake("http://192.168.1.100:8080", "client-123")

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.hubUrl).toBe("http://192.168.1.100:8080")
      expect(result.data.hubId).toBe("hub-abc")
      expect(result.data.clientId).toBe("client-123")
      expect(result.data.sharedKey.length).toBe(32)
      expect(result.data.token).toBeNull()
    }

    // Verify the handshake POST
    expect(mockFetch).toHaveBeenCalledWith(
      "http://192.168.1.100:8080/rpc/handshake",
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining("client_public_key"),
      }),
    )
  })

  it("network failure returns HUB_UNREACHABLE", async () => {
    mockFetch.mockRejectedValueOnce(new Error("Connection refused"))

    const result = await performHandshake("http://192.168.1.100:8080", "client-123")

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe("HUB_UNREACHABLE")
    }
  })

  it("HTTP error returns HUB_UNREACHABLE", async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500 })

    const result = await performHandshake("http://192.168.1.100:8080", "client-123")

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe("HUB_UNREACHABLE")
    }
  })

  it("invalid hub response returns HANDSHAKE_FAILED", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: false,
        hub_public_key: null,
        hub_id: null,
      }),
    })

    const result = await performHandshake("http://192.168.1.100:8080", "client-123")

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe("HANDSHAKE_FAILED")
    }
  })
})
