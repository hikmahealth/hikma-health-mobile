import { Option } from "effect"

// ---------------------------------------------------------------------------
// Mocks — in-memory MMKV replacement
// ---------------------------------------------------------------------------
const mockStorage: Record<string, string | number | boolean | undefined> = {}

jest.mock("../../app/models/Peer", () => ({
  default: { getActiveUrl: jest.fn(() => Promise.resolve(null)) },
}))

jest.mock("../../app/utils/storage", () => ({
  storage: {
    getString: jest.fn((key: string) => {
      const val = mockStorage[key]
      return typeof val === "string" ? val : undefined
    }),
    getNumber: jest.fn((key: string) => {
      const val = mockStorage[key]
      return typeof val === "number" ? val : undefined
    }),
    set: jest.fn((key: string, value: string | number | boolean) => {
      mockStorage[key] = value
    }),
    delete: jest.fn((key: string) => {
      delete mockStorage[key]
    }),
  },
}))

import Sync from "../../app/models/Sync"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
beforeEach(() => {
  for (const key of Object.keys(mockStorage)) delete mockStorage[key]
})

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("Sync.Server", () => {
  describe("getLastPullTimestamp / setLastPullTimestamp", () => {
    it("returns 0 when no timestamp is stored", () => {
      expect(Sync.Server.getLastPullTimestamp("cloud")).toBe(0)
    })

    it("returns the stored timestamp", () => {
      mockStorage["cloudLastPullTimestamp"] = 1700000000
      expect(Sync.Server.getLastPullTimestamp("cloud")).toBe(1700000000)
    })

    it("returns 0 for local type when no timestamp stored", () => {
      expect(Sync.Server.getLastPullTimestamp("local")).toBe(0)
    })

    it("round-trips a timestamp via set and get", async () => {
      await Sync.Server.setLastPullTimestamp("cloud", 42)
      expect(Sync.Server.getLastPullTimestamp("cloud")).toBe(42)
    })

    it("stores and retrieves 0 as a valid timestamp", async () => {
      await Sync.Server.setLastPullTimestamp("cloud", 0)
      expect(Sync.Server.getLastPullTimestamp("cloud")).toBe(0)
    })

    it("stores negative numbers (no validation currently)", async () => {
      await Sync.Server.setLastPullTimestamp("cloud", -100)
      expect(Sync.Server.getLastPullTimestamp("cloud")).toBe(-100)
    })

    it("keeps cloud and local timestamps separate", async () => {
      await Sync.Server.setLastPullTimestamp("cloud", 111)
      await Sync.Server.setLastPullTimestamp("local", 222)
      expect(Sync.Server.getLastPullTimestamp("cloud")).toBe(111)
      expect(Sync.Server.getLastPullTimestamp("local")).toBe(222)
    })
  })

  describe("getAll", () => {
    it("returns empty record when no servers stored", async () => {
      const result = await Sync.Server.getAll()
      expect(Object.keys(result)).toHaveLength(0)
    })

    it("returns parsed servers when stored", async () => {
      const cloudServer: Sync.Server.T = {
        id: "cloud-1",
        name: "cloud",
        type: "cloud",
        url: "https://api.example.com",
        isActive: true,
      }
      mockStorage["cloud-sync-server"] = JSON.stringify(cloudServer)
      const result = await Sync.Server.getAll()
      expect(result["cloud-sync-server"]).toEqual(cloudServer)
    })

    it("handles corrupted JSON gracefully", async () => {
      mockStorage["cloud-sync-server"] = "not valid json {"
      const result = await Sync.Server.getAll()
      // Should skip the corrupted entry (caught in try/catch)
      expect(result["cloud-sync-server"]).toBeUndefined()
    })

    it("returns the valid server when one is valid and one is corrupted", async () => {
      const localServer: Sync.Server.T = {
        id: "local-1",
        name: "local",
        type: "local",
        url: "http://192.168.1.100:3000",
        isActive: false,
      }
      mockStorage["local-sync-server"] = JSON.stringify(localServer)
      mockStorage["cloud-sync-server"] = "corrupted"
      const result = await Sync.Server.getAll()
      expect(result["local-sync-server"]).toEqual(localServer)
      expect(result["cloud-sync-server"]).toBeUndefined()
    })
  })

  describe("getById / getByType", () => {
    it("returns None for non-existent server by type", async () => {
      const result = await Sync.Server.getByType("cloud")
      expect(Option.isNone(result)).toBe(true)
    })

    it("returns Some for existing server by type", async () => {
      const server: Sync.Server.T = {
        id: "c-1",
        name: "cloud",
        type: "cloud",
        url: "https://api.example.com",
        isActive: true,
      }
      mockStorage["cloud-sync-server"] = JSON.stringify(server)
      const result = await Sync.Server.getByType("cloud")
      expect(Option.isSome(result)).toBe(true)
      if (Option.isSome(result)) {
        expect(result.value.id).toBe("c-1")
      }
    })

    it("returns None for non-existent server by id", async () => {
      const result = await Sync.Server.getById("cloud-sync-server")
      expect(Option.isNone(result)).toBe(true)
    })
  })

  describe("set / remove", () => {
    it("round-trips a server via set and getByType", async () => {
      const server: Sync.Server.T = {
        id: "test-1",
        name: "cloud",
        type: "cloud",
        url: "https://test.com",
        isActive: false,
      }
      await Sync.Server.set("cloud", server)
      const result = await Sync.Server.getByType("cloud")
      expect(Option.isSome(result)).toBe(true)
      if (Option.isSome(result)) {
        expect(result.value).toEqual(server)
      }
    })

    it("remove deletes the server entry", async () => {
      const server: Sync.Server.T = {
        id: "rm-1",
        name: "local",
        type: "local",
        url: "http://localhost",
        isActive: false,
      }
      await Sync.Server.set("local", server)
      await Sync.Server.remove("local")
      const result = await Sync.Server.getByType("local")
      expect(Option.isNone(result)).toBe(true)
    })

    it("remove on non-existent server does not crash", async () => {
      await expect(Sync.Server.remove("local")).resolves.toBeUndefined()
    })
  })

  describe("getActive / setActive", () => {
    it("returns None when no servers exist", async () => {
      const result = await Sync.Server.getActive()
      expect(Option.isNone(result)).toBe(true)
    })

    it("returns the active server", async () => {
      const cloud: Sync.Server.T = {
        id: "c-1",
        name: "cloud",
        type: "cloud",
        url: "https://api.com",
        isActive: true,
      }
      const local: Sync.Server.T = {
        id: "l-1",
        name: "local",
        type: "local",
        url: "http://local",
        isActive: false,
      }
      await Sync.Server.set("cloud", cloud)
      await Sync.Server.set("local", local)
      const result = await Sync.Server.getActive()
      expect(Option.isSome(result)).toBe(true)
      if (Option.isSome(result)) {
        expect(result.value.type).toBe("cloud")
      }
    })

    it("setActive changes the active flag and deactivates others", async () => {
      const cloud: Sync.Server.T = {
        id: "c-1",
        name: "cloud",
        type: "cloud",
        url: "https://api.com",
        isActive: true,
      }
      const local: Sync.Server.T = {
        id: "l-1",
        name: "local",
        type: "local",
        url: "http://local",
        isActive: false,
      }
      await Sync.Server.set("cloud", cloud)
      await Sync.Server.set("local", local)

      // Switch active to local
      await Sync.Server.setActive("local")

      const active = await Sync.Server.getActive()
      expect(Option.isSome(active)).toBe(true)
      if (Option.isSome(active)) {
        expect(active.value.type).toBe("local")
      }

      // Verify cloud is now inactive
      const cloudResult = await Sync.Server.getByType("cloud")
      if (Option.isSome(cloudResult)) {
        expect(cloudResult.value.isActive).toBe(false)
      }
    })

    it("setActive with no servers stored does not crash", async () => {
      await expect(Sync.Server.setActive("cloud")).resolves.toBeUndefined()
    })
  })
})
