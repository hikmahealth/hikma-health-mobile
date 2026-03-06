import fc from "fast-check"
import { randomBytes } from "@noble/ciphers/utils"

const mockStore = new Map<string, string>()

jest.mock("expo-secure-store", () => ({
  setItemAsync: jest.fn((key: string, value: string) => {
    mockStore.set(key, value)
    return Promise.resolve()
  }),
  getItemAsync: jest.fn((key: string) => Promise.resolve(mockStore.get(key) ?? null)),
  deleteItemAsync: jest.fn((key: string) => {
    mockStore.delete(key)
    return Promise.resolve()
  }),
}))

jest.mock("uuid", () => ({
  v4: jest.fn(() => "mock-uuid-1234"),
}))

import Peer from "../../app/models/Peer"

describe("Peer.Session.getTokenByPeerId", () => {
  beforeEach(() => mockStore.clear())

  const saveSession = (hubId: string, token: string | null) =>
    Peer.Session.save({
      hubUrl: "http://test:8080",
      hubId,
      clientId: "client-1",
      sharedKey: randomBytes(32),
      token,
    })

  it("matching peerId always returns the stored token", () => {
    return fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1 }),
        fc.string({ minLength: 1 }),
        async (hubId, token) => {
          mockStore.clear()
          await saveSession(hubId, token)
          const result = await Peer.Session.getTokenByPeerId(hubId)
          expect(result.ok).toBe(true)
          if (result.ok) {
            expect(result.data).toBe(token)
          }
        },
      ),
    )
  })

  it("mismatched peerId always returns ValidationError", () => {
    return fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1 }),
        fc.string({ minLength: 1 }).filter((s) => s !== "stored-hub-id"),
        async (queryId, storedId) => {
          fc.pre(queryId !== storedId)
          mockStore.clear()
          await saveSession(storedId, "some-token")
          const result = await Peer.Session.getTokenByPeerId(queryId)
          expect(result.ok).toBe(false)
          if (!result.ok) {
            expect(result.error._tag).toBe("ValidationError")
          }
        },
      ),
    )
  })

  it("no session always returns NotFound", () => {
    return fc.assert(
      fc.asyncProperty(fc.string({ minLength: 1 }), async (peerId) => {
        mockStore.clear()
        const result = await Peer.Session.getTokenByPeerId(peerId)
        expect(result.ok).toBe(false)
        if (!result.ok) {
          expect(result.error._tag).toBe("NotFound")
          expect(result.error).toHaveProperty("entity", "HubSession")
        }
      }),
    )
  })

  it("null token returns NotFound for SessionToken", async () => {
    return fc.assert(
      fc.asyncProperty(fc.string({ minLength: 1 }), async (hubId) => {
        mockStore.clear()
        await saveSession(hubId, null)
        const result = await Peer.Session.getTokenByPeerId(hubId)
        expect(result.ok).toBe(false)
        if (!result.ok) {
          expect(result.error._tag).toBe("NotFound")
          expect(result.error).toHaveProperty("entity", "SessionToken")
        }
      }),
    )
  })
})
