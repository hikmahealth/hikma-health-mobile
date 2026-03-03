/**
 * Tests for the mode switch service.
 * Verifies switching logic, peer-aware unsynced changes guard, and MMKV persistence.
 */

import fc from "fast-check"
import { operationModeStore } from "../../app/store/operationMode"
import type Peer from "../../app/models/Peer"
import type { PeerType } from "../../app/db/model/Peer"

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

let mockHasUnsynced = false
let mockActivePeer: Peer.T | null = null
let mockLocalChangesCount = 0

jest.mock("@nozbe/watermelondb/sync", () => ({
  hasUnsyncedChanges: jest.fn(() => Promise.resolve(mockHasUnsynced)),
}))

jest.mock("../../app/db", () => ({}))

jest.mock("../../app/db/localSync", () => ({
  getLocalChangesSince: jest.fn(() => Promise.resolve({})),
}))

jest.mock("../../app/db/peerSync", () => ({
  countRecordsInChanges: jest.fn(() => mockLocalChangesCount),
}))

jest.mock("../../app/models/Peer", () => ({
  __esModule: true,
  default: {
    DB: {
      resolveActive: jest.fn(() => Promise.resolve(mockActivePeer)),
    },
  },
}))

const savedValues: Record<string, string> = {}
jest.mock("../../app/utils/storage", () => ({
  saveString: jest.fn((key: string, value: string) => {
    savedValues[key] = value
    return true
  }),
  loadString: jest.fn((key: string) => savedValues[key] ?? null),
}))

// Import after mocks are in place
import {
  switchToOnlineMode,
  switchToOfflineMode,
  checkUnsyncedChanges,
} from "../../app/services/modeSwitchService"
import { MODE_PREFERENCE_KEY } from "../../app/hooks/useOperationModeInit"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const makeCloudPeer = (overrides?: Partial<Peer.T>): Peer.T => ({
  id: "cloud-1",
  peerId: "cloud:https://api.example.com",
  name: "Cloud Server",
  ipAddress: null,
  port: null,
  publicKey: "",
  lastSyncedAt: null,
  peerType: "cloud_server",
  isLeader: false,
  status: "active",
  protocolVersion: "1",
  metadata: {},
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
})

const makeHubPeer = (overrides?: Partial<Peer.T>): Peer.T => ({
  id: "hub-1",
  peerId: "hub-abc",
  name: "Local Hub",
  ipAddress: "192.168.1.10",
  port: 8080,
  publicKey: "pk-abc",
  lastSyncedAt: 1000,
  peerType: "sync_hub",
  isLeader: false,
  status: "active",
  protocolVersion: "1",
  metadata: {},
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
})

beforeEach(() => {
  operationModeStore.send({ type: "reset" })
  mockHasUnsynced = false
  mockActivePeer = null
  mockLocalChangesCount = 0
  for (const key of Object.keys(savedValues)) delete savedValues[key]
})

// ---------------------------------------------------------------------------
// checkUnsyncedChanges — pure peer-dispatch logic
// ---------------------------------------------------------------------------

describe("checkUnsyncedChanges", () => {
  it("returns false when no peer is provided", async () => {
    expect(await checkUnsyncedChanges(null)).toBe(false)
  })

  it("delegates to hasUnsyncedChanges for cloud_server peer", async () => {
    mockHasUnsynced = true
    expect(await checkUnsyncedChanges(makeCloudPeer())).toBe(true)

    mockHasUnsynced = false
    expect(await checkUnsyncedChanges(makeCloudPeer())).toBe(false)
  })

  it("delegates to getLocalChangesSince for sync_hub peer", async () => {
    mockLocalChangesCount = 5
    expect(await checkUnsyncedChanges(makeHubPeer())).toBe(true)

    mockLocalChangesCount = 0
    expect(await checkUnsyncedChanges(makeHubPeer())).toBe(false)
  })

  it("uses peer.lastSyncedAt for hub timestamp (falls back to 0 when null)", async () => {
    const { getLocalChangesSince } = require("../../app/db/localSync")
    mockLocalChangesCount = 0

    await checkUnsyncedChanges(makeHubPeer({ lastSyncedAt: 5000 }))
    expect(getLocalChangesSince).toHaveBeenCalledWith(5000, [])

    await checkUnsyncedChanges(makeHubPeer({ lastSyncedAt: null }))
    expect(getLocalChangesSince).toHaveBeenCalledWith(0, [])
  })

  it("returns false for mobile_app peer (defensive)", async () => {
    const mobilePeer = makeCloudPeer({ peerType: "mobile_app" as PeerType })
    expect(await checkUnsyncedChanges(mobilePeer)).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// switchToOnlineMode
// ---------------------------------------------------------------------------

describe("switchToOnlineMode", () => {
  it("switches to online when no active peer (no changes to lose)", async () => {
    mockActivePeer = null

    const result = await switchToOnlineMode()

    expect(result.ok).toBe(true)
    expect(operationModeStore.getSnapshot().context.mode).toBe("online")
    expect(savedValues[MODE_PREFERENCE_KEY]).toBe("online")
  })

  it("switches to online with cloud peer and no unsynced changes", async () => {
    mockActivePeer = makeCloudPeer()
    mockHasUnsynced = false

    const result = await switchToOnlineMode()

    expect(result.ok).toBe(true)
    expect(operationModeStore.getSnapshot().context.mode).toBe("online")
  })

  it("rejects with cloud peer when hasUnsyncedChanges is true", async () => {
    mockActivePeer = makeCloudPeer()
    mockHasUnsynced = true

    const result = await switchToOnlineMode()

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toBe("unsynced_changes")
    expect(operationModeStore.getSnapshot().context.mode).toBe("offline")
  })

  it("switches to online with hub peer and no local changes since last sync", async () => {
    mockActivePeer = makeHubPeer()
    mockLocalChangesCount = 0

    const result = await switchToOnlineMode()

    expect(result.ok).toBe(true)
    expect(operationModeStore.getSnapshot().context.mode).toBe("online")
  })

  it("rejects with hub peer when local changes exist since last sync", async () => {
    mockActivePeer = makeHubPeer()
    mockLocalChangesCount = 3

    const result = await switchToOnlineMode()

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toBe("unsynced_changes")
    expect(operationModeStore.getSnapshot().context.mode).toBe("offline")
  })

  it("returns already_in_mode when already online", async () => {
    operationModeStore.send({ type: "set_mode", mode: "online" })

    const result = await switchToOnlineMode()

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toBe("already_in_mode")
  })
})

// ---------------------------------------------------------------------------
// switchToOfflineMode
// ---------------------------------------------------------------------------

describe("switchToOfflineMode", () => {
  it("switches to offline and persists preference", async () => {
    operationModeStore.send({ type: "set_mode", mode: "online" })

    const result = await switchToOfflineMode()

    expect(result.ok).toBe(true)
    expect(operationModeStore.getSnapshot().context.mode).toBe("offline")
    expect(savedValues[MODE_PREFERENCE_KEY]).toBe("offline")
  })

  it("returns already_in_mode when already offline", async () => {
    const result = await switchToOfflineMode()

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toBe("already_in_mode")
  })
})

// ---------------------------------------------------------------------------
// Property-based: checkUnsyncedChanges dispatch invariants
// ---------------------------------------------------------------------------

describe("checkUnsyncedChanges — properties", () => {
  const arbPeerType = fc.constantFrom<PeerType>("sync_hub", "cloud_server", "mobile_app")

  it("never throws regardless of peer shape", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.oneof(
          fc.constant(null),
          fc.record({
            peerType: arbPeerType,
            lastSyncedAt: fc.oneof(fc.constant(null), fc.integer({ min: 0 })),
          }).map(
            (partial) =>
              makeCloudPeer({
                peerType: partial.peerType,
                lastSyncedAt: partial.lastSyncedAt,
              }),
          ),
        ),
        async (peer) => {
          // Should never throw
          const result = await checkUnsyncedChanges(peer)
          expect(typeof result).toBe("boolean")
        },
      ),
    )
  })

  it("null peer always returns false", async () => {
    await fc.assert(
      fc.asyncProperty(fc.constant(null), async (peer) => {
        expect(await checkUnsyncedChanges(peer)).toBe(false)
      }),
    )
  })
})
