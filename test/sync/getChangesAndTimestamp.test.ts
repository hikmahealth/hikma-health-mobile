import { Option } from "effect"
import Sync from "../../app/models/Sync"

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
jest.mock("../../app/models/Peer", () => ({
  default: { getActiveUrl: jest.fn(() => Promise.resolve(null)) },
}))

jest.mock("../../app/utils/storage", () => ({
  storage: {
    getString: jest.fn(),
    getNumber: jest.fn(),
    set: jest.fn(),
    delete: jest.fn(),
  },
}))

describe("Sync.getChangesAndTimestamp", () => {
  it("returns Some when result has both changes and timestamp", () => {
    const changes = { patients: { created: [], updated: [], deleted: [] } }
    const timestamp = 1700000000
    const result = Sync.getChangesAndTimestamp({ changes, timestamp } as any)
    expect(Option.isSome(result)).toBe(true)
    if (Option.isSome(result)) {
      expect(result.value.changes).toBe(changes)
      expect(result.value.timestamp).toBe(timestamp)
    }
  })

  it("returns Some when changes is empty and timestamp is 0", () => {
    const result = Sync.getChangesAndTimestamp({ changes: {}, timestamp: 0 } as any)
    expect(Option.isSome(result)).toBe(true)
    if (Option.isSome(result)) {
      expect(result.value.timestamp).toBe(0)
    }
  })

  it("returns None when result has only timestamp but no changes", () => {
    const result = Sync.getChangesAndTimestamp({ timestamp: 123 } as any)
    expect(Option.isNone(result)).toBe(true)
  })

  it("returns None when result has only changes but no timestamp", () => {
    const result = Sync.getChangesAndTimestamp({ changes: {} } as any)
    expect(Option.isNone(result)).toBe(true)
  })

  it("returns None for an empty object", () => {
    const result = Sync.getChangesAndTimestamp({} as any)
    expect(Option.isNone(result)).toBe(true)
  })

  it("returns None for a turbo mode result with syncJson", () => {
    const result = Sync.getChangesAndTimestamp({ syncJson: '{"changes":{}}' } as any)
    expect(Option.isNone(result)).toBe(true)
  })

  it("returns Some when result has changes, timestamp, and extra keys", () => {
    const result = Sync.getChangesAndTimestamp({
      changes: { patients: { created: [], updated: [], deleted: [] } },
      timestamp: 999,
      experimentalRejectedIds: [],
    } as any)
    expect(Option.isSome(result)).toBe(true)
    if (Option.isSome(result)) {
      expect(result.value.timestamp).toBe(999)
    }
  })

  it("returns Some with large timestamp values", () => {
    const result = Sync.getChangesAndTimestamp({
      changes: {},
      timestamp: Number.MAX_SAFE_INTEGER,
    } as any)
    expect(Option.isSome(result)).toBe(true)
    if (Option.isSome(result)) {
      expect(result.value.timestamp).toBe(Number.MAX_SAFE_INTEGER)
    }
  })

  it("returns Some with negative timestamp (unusual but valid)", () => {
    const result = Sync.getChangesAndTimestamp({ changes: {}, timestamp: -1 } as any)
    expect(Option.isSome(result)).toBe(true)
    if (Option.isSome(result)) {
      expect(result.value.timestamp).toBe(-1)
    }
  })
})
