import { randomBytes } from "@noble/ciphers/utils"
import type { HubSession } from "../../app/rpc/handshake"

// --- Mocks ---

const mockSave = jest.fn()
const mockLoad = jest.fn()
const mockClear = jest.fn()
const mockGetOrCreateClientId = jest.fn(() => Promise.resolve("client-id"))

jest.mock("expo-secure-store", () => ({
  setItemAsync: jest.fn(),
  getItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}))

jest.mock("uuid", () => ({ v4: jest.fn(() => "mock-uuid") }))

// Mock the crypto/encoding used by Peer.Session and Peer.Hub
jest.mock("../../app/crypto/encoding", () => ({
  encode: jest.fn((buf: Uint8Array) => Buffer.from(buf).toString("base64")),
  decode: jest.fn((str: string) => new Uint8Array(Buffer.from(str, "base64"))),
}))

const mockPerformHandshake = jest.fn()
jest.mock("../../app/rpc/handshake", () => ({
  performHandshake: (...args: any[]) => mockPerformHandshake(...args),
}))

const mockFetch = jest.fn()
global.fetch = mockFetch

// We need to mock the DB layer since we don't have WatermelonDB in test
const mockUpsertHub = jest.fn()
const mockRevoke = jest.fn()
jest.mock("../../app/db", () => ({
  __esModule: true,
  default: {
    get: jest.fn(() => ({
      query: jest.fn(() => ({ fetch: jest.fn(() => Promise.resolve([])) })),
      create: jest.fn(),
    })),
    write: jest.fn((fn: any) => fn()),
  },
}))

// Import after mocks
import Peer from "../../app/models/Peer"

// Patch DB methods that touch WatermelonDB directly
beforeAll(() => {
  ;(Peer.DB as any).upsertHub = mockUpsertHub
  ;(Peer.DB as any).revoke = mockRevoke
  // Patch Session methods for controlled testing of Hub
  ;(Peer.Session as any).save = mockSave
  ;(Peer.Session as any).load = mockLoad
  ;(Peer.Session as any).clear = mockClear
  ;(Peer.Session as any).getOrCreateClientId = mockGetOrCreateClientId
})

const createMockSession = (overrides?: Partial<HubSession>): HubSession => ({
  hubUrl: "http://192.168.1.100:8080",
  hubId: "hub-123",
  hubName: "Test Hub",
  clientId: "client-456",
  sharedKey: randomBytes(32),
  token: null,
  ...overrides,
})

describe("Peer.Hub", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockSave.mockResolvedValue(undefined)
    mockClear.mockResolvedValue(undefined)
    mockUpsertHub.mockResolvedValue(undefined)
    mockRevoke.mockResolvedValue(undefined)
  })

  describe("pair", () => {
    it("calls handshake, persists session, and creates peer", async () => {
      const session = createMockSession()
      mockPerformHandshake.mockResolvedValueOnce({ ok: true, data: session })

      const result = await Peer.Hub.pair("http://192.168.1.100:8080")

      expect(result.ok).toBe(true)
      expect(mockPerformHandshake).toHaveBeenCalledWith("http://192.168.1.100:8080", "client-id")
      expect(mockSave).toHaveBeenCalledWith(session)
      expect(mockUpsertHub).toHaveBeenCalledWith(
        expect.objectContaining({ hubId: session.hubId }),
      )
    })

    it("returns error if handshake fails", async () => {
      mockPerformHandshake.mockResolvedValueOnce({
        ok: false,
        error: { code: "HUB_UNREACHABLE", message: "Connection refused" },
      })

      const result = await Peer.Hub.pair("http://bad-host:8080")

      expect(result.ok).toBe(false)
      if (!result.ok) expect(result.error.code).toBe("HUB_UNREACHABLE")
      expect(mockSave).not.toHaveBeenCalled()
    })
  })

  describe("getTransport", () => {
    it("returns encrypted transport from stored session", async () => {
      const session = createMockSession()
      mockLoad.mockResolvedValueOnce(session)
      mockPerformHandshake.mockResolvedValueOnce({ ok: true, data: session })

      const transport = await Peer.Hub.getTransport()

      expect(transport).not.toBeNull()
      expect(transport!.sendCommand).toBeDefined()
      expect(transport!.sendQuery).toBeDefined()
    })

    it("returns null when no session exists", async () => {
      mockLoad.mockResolvedValueOnce(null)

      const transport = await Peer.Hub.getTransport()

      expect(transport).toBeNull()
    })

    it("re-handshakes when heartbeat fails", async () => {
      const oldSession = createMockSession()
      const newSession = createMockSession({ hubId: "hub-new" })

      mockLoad.mockResolvedValueOnce(oldSession)
      mockFetch.mockResolvedValueOnce({ ok: false, status: 503 })
      mockPerformHandshake.mockResolvedValueOnce({ ok: true, data: newSession })

      const transport = await Peer.Hub.getTransport()

      expect(transport).not.toBeNull()
      expect(mockPerformHandshake).toHaveBeenCalled()
      expect(mockSave).toHaveBeenCalled()
    })
  })

  describe("unpair", () => {
    it("clears storage and revokes peer", async () => {
      const session = createMockSession()
      mockLoad.mockResolvedValueOnce(session)

      await Peer.Hub.unpair()

      expect(mockRevoke).toHaveBeenCalledWith(session.hubId)
      expect(mockClear).toHaveBeenCalled()
    })

    it("still clears session even if no session exists", async () => {
      mockLoad.mockResolvedValueOnce(null)

      await Peer.Hub.unpair()

      expect(mockRevoke).not.toHaveBeenCalled()
      expect(mockClear).toHaveBeenCalled()
    })
  })
})
