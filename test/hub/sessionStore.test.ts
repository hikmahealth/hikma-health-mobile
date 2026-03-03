import fc from "fast-check"
import { randomBytes } from "@noble/ciphers/utils"

// Must use "mock" prefix for Jest scoping rules
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

describe("Peer.Session", () => {
  beforeEach(() => mockStore.clear())

  it("save/load roundtrip preserves session data", async () => {
    const session = {
      hubUrl: "http://192.168.1.100:8080",
      hubId: "hub-abc",
      clientId: "client-xyz",
      sharedKey: randomBytes(32),
      token: "jwt-token",
    }

    await Peer.Session.save(session)
    const loaded = await Peer.Session.load()

    expect(loaded).not.toBeNull()
    expect(loaded!.hubUrl).toBe(session.hubUrl)
    expect(loaded!.hubId).toBe(session.hubId)
    expect(loaded!.clientId).toBe(session.clientId)
    expect(loaded!.sharedKey).toEqual(session.sharedKey)
    expect(loaded!.token).toBe(session.token)
  })

  it("roundtrips with arbitrary 32-byte keys", () => {
    return fc.assert(
      fc.asyncProperty(fc.uint8Array({ minLength: 32, maxLength: 32 }), async (key) => {
        mockStore.clear()
        const session = {
          hubUrl: "http://test:8080",
          hubId: "hub-1",
          clientId: "client-1",
          sharedKey: key,
          token: null,
        }
        await Peer.Session.save(session)
        const loaded = await Peer.Session.load()
        expect(loaded!.sharedKey).toEqual(key)
      }),
    )
  })

  it("load returns null when no session stored", async () => {
    expect(await Peer.Session.load()).toBeNull()
  })

  it("clear removes the stored session", async () => {
    await Peer.Session.save({
      hubUrl: "http://test:8080",
      hubId: "hub-1",
      clientId: "client-1",
      sharedKey: randomBytes(32),
      token: null,
    })
    expect(await Peer.Session.load()).not.toBeNull()

    await Peer.Session.clear()
    expect(await Peer.Session.load()).toBeNull()
  })

  it("getOrCreateClientId is idempotent", async () => {
    const id1 = await Peer.Session.getOrCreateClientId()
    const id2 = await Peer.Session.getOrCreateClientId()
    expect(id1).toBe(id2)
    expect(id1).toBe("mock-uuid-1234")
  })
})
