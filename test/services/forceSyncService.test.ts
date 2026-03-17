/**
 * Tests for the force sync service.
 *
 * Verifies forceUpload and forceDownload:
 * - Correct transport resolution per peer type
 * - Proper delegation to getLocalChangesSince / applyRemoteChanges
 * - Peer lastSyncedAt updated on success
 * - Error handling returns { ok: false }
 */

import fc from "fast-check"
import type Peer from "../../app/models/Peer"
import type { PeerType } from "../../app/db/model/Peer"

// ── Mocks ─────────────────────────────────────────────────────────────

const mockGetLocalChangesSince = jest.fn()
const mockApplyRemoteChanges = jest.fn()
const mockCountRecordsInChanges = jest.fn(() => 0)
const mockUpdateDates = jest.fn()

jest.mock("../../app/db/localSync", () => ({
  getLocalChangesSince: (...args: any[]) => mockGetLocalChangesSince(...args),
  applyRemoteChanges: (...args: any[]) => mockApplyRemoteChanges(...args),
}))

jest.mock("../../app/db/peerSync", () => ({
  countRecordsInChanges: (...args: any[]) => mockCountRecordsInChanges(...args),
  updateDates: (...args: any[]) => mockUpdateDates(...args),
}))

const mockSendCommand = jest.fn()
const mockSendQuery = jest.fn()
const mockTransport = {
  sendCommand: mockSendCommand,
  sendQuery: mockSendQuery,
  login: jest.fn(),
  heartbeat: jest.fn(),
}

const mockGetById = jest.fn()
const mockUpdateLastSyncedAt = jest.fn()
const mockGetTransport = jest.fn()

jest.mock("../../app/models/Peer", () => ({
  __esModule: true,
  default: {
    DB: {
      getById: (...args: any[]) => mockGetById(...args),
      updateLastSyncedAt: (...args: any[]) => mockUpdateLastSyncedAt(...args),
    },
    Hub: {
      getTransport: (...args: any[]) => mockGetTransport(...args),
    },
    getUrl: (peer: any) => peer?.metadata?.url ?? null,
  },
}))

jest.mock("../../app/rpc/transport", () => ({
  createCloudTransport: jest.fn(() => mockTransport),
}))

jest.mock("expo-secure-store", () => ({
  getItemAsync: jest.fn(() => Promise.resolve("mock-token")),
}))

jest.mock("@sentry/react-native", () => ({
  captureException: jest.fn(),
}))

jest.mock("../../app/db", () => ({}))

// Import after mocks
import { forceUpload, forceDownload } from "../../app/services/forceSyncService"

// ── Helpers ───────────────────────────────────────────────────────────

const makePeer = (overrides?: Partial<Peer.T>): Peer.T =>
  ({
    id: "peer-1",
    peerId: "cloud:https://api.example.com",
    name: "Cloud Server",
    peerType: "cloud_server" as PeerType,
    lastSyncedAt: 1000,
    status: "active",
    ipAddress: null,
    port: null,
    publicKey: "",
    isLeader: false,
    protocolVersion: "1",
    metadata: { url: "https://api.example.com" },
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }) as Peer.T

beforeEach(() => {
  jest.clearAllMocks()
  mockGetById.mockResolvedValue(makePeer())
  mockGetTransport.mockResolvedValue(mockTransport)
  mockGetLocalChangesSince.mockResolvedValue({})
  mockApplyRemoteChanges.mockResolvedValue(undefined)
  mockSendCommand.mockResolvedValue({ ok: true, data: {} })
  mockSendQuery.mockResolvedValue({
    ok: true,
    data: { changes: {}, timestamp: 2000 },
  })
})

// ── forceUpload ──────────────────────────────────────────────────────

describe("forceUpload", () => {
  it("calls getLocalChangesSince with provided timestamp and empty exclusions", async () => {
    mockCountRecordsInChanges.mockReturnValue(5)
    mockGetLocalChangesSince.mockResolvedValue({ patients: { created: [{}, {}, {}, {}, {}], updated: [], deleted: [] } })

    const result = await forceUpload("peer-1", 500)

    expect(mockGetLocalChangesSince).toHaveBeenCalledWith(500, [])
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.recordCount).toBe(5)
  })

  it("pushes changes via transport.sendCommand", async () => {
    mockCountRecordsInChanges.mockReturnValue(1)
    const changes = { patients: { created: [{ id: "p1" }], updated: [], deleted: [] } }
    mockGetLocalChangesSince.mockResolvedValue(changes)

    await forceUpload("peer-1", 0)

    expect(mockSendCommand).toHaveBeenCalledWith("sync_push", {
      changes,
      lastPulledAt: 0,
    })
  })

  it("updates peer.lastSyncedAt on success", async () => {
    mockCountRecordsInChanges.mockReturnValue(1)
    mockGetLocalChangesSince.mockResolvedValue({ patients: { created: [{}], updated: [], deleted: [] } })

    await forceUpload("peer-1", 0)

    expect(mockUpdateLastSyncedAt).toHaveBeenCalledWith("peer-1", expect.any(Number))
  })

  it("returns { ok: true, recordCount: 0 } when no changes", async () => {
    mockCountRecordsInChanges.mockReturnValue(0)

    const result = await forceUpload("peer-1", 0)

    expect(result).toEqual({ ok: true, recordCount: 0 })
    expect(mockSendCommand).not.toHaveBeenCalled()
  })

  it("returns { ok: false } when push fails", async () => {
    mockCountRecordsInChanges.mockReturnValue(1)
    mockGetLocalChangesSince.mockResolvedValue({ patients: { created: [{}], updated: [], deleted: [] } })
    mockSendCommand.mockResolvedValue({ ok: false, error: { code: "NETWORK_ERROR", message: "timeout" } })

    const result = await forceUpload("peer-1", 0)

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toBe("timeout")
  })

  it("uses hub transport for sync_hub peers", async () => {
    mockGetById.mockResolvedValue(makePeer({ peerType: "sync_hub" }))
    mockCountRecordsInChanges.mockReturnValue(1)
    mockGetLocalChangesSince.mockResolvedValue({ events: { created: [{}], updated: [], deleted: [] } })

    await forceUpload("peer-1", 0)

    expect(mockGetTransport).toHaveBeenCalled()
  })
})

// ── forceDownload ────────────────────────────────────────────────────

describe("forceDownload", () => {
  it("pulls via transport.sendQuery with provided timestamp", async () => {
    mockCountRecordsInChanges.mockReturnValue(3)

    await forceDownload("peer-1", 500)

    expect(mockSendQuery).toHaveBeenCalledWith("sync_pull", { lastPulledAt: 500 })
  })

  it("applies pulled changes via applyRemoteChanges", async () => {
    const changes = { patients: { created: [{ id: "p1" }], updated: [], deleted: [] } }
    mockSendQuery.mockResolvedValue({ ok: true, data: { changes, timestamp: 3000 } })
    mockCountRecordsInChanges.mockReturnValue(1)

    await forceDownload("peer-1", 0)

    expect(mockApplyRemoteChanges).toHaveBeenCalledWith(changes)
  })

  it("updates peer.lastSyncedAt with server timestamp on success", async () => {
    mockSendQuery.mockResolvedValue({ ok: true, data: { changes: {}, timestamp: 5000 } })
    mockCountRecordsInChanges.mockReturnValue(0)

    await forceDownload("peer-1", 0)

    expect(mockUpdateLastSyncedAt).toHaveBeenCalledWith("peer-1", 5000)
  })

  it("returns record count from pulled changes", async () => {
    mockCountRecordsInChanges.mockReturnValue(42)

    const result = await forceDownload("peer-1", 0)

    expect(result.ok).toBe(true)
    if (result.ok) expect(result.recordCount).toBe(42)
  })

  it("returns { ok: false } when pull fails", async () => {
    mockSendQuery.mockResolvedValue({
      ok: false,
      error: { code: "HUB_UNREACHABLE", message: "no connection" },
    })

    const result = await forceDownload("peer-1", 0)

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toBe("no connection")
  })
})

// ── Property-based ───────────────────────────────────────────────────

describe("forceUpload — properties", () => {
  it("always returns a valid ForceSyncResult shape", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 0, max: 2_000_000_000 }),
        async (timestamp) => {
          mockCountRecordsInChanges.mockReturnValue(0)
          const result = await forceUpload("peer-1", timestamp)
          expect(typeof result.ok).toBe("boolean")
          if (result.ok) {
            expect(typeof result.recordCount).toBe("number")
            expect(result.recordCount).toBeGreaterThanOrEqual(0)
          } else {
            expect(typeof result.error).toBe("string")
          }
        },
      ),
    )
  })
})

describe("forceDownload — properties", () => {
  it("always returns a valid ForceSyncResult shape", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 0, max: 2_000_000_000 }),
        async (timestamp) => {
          mockCountRecordsInChanges.mockReturnValue(0)
          const result = await forceDownload("peer-1", timestamp)
          expect(typeof result.ok).toBe("boolean")
          if (result.ok) {
            expect(typeof result.recordCount).toBe("number")
          } else {
            expect(typeof result.error).toBe("string")
          }
        },
      ),
    )
  })
})
