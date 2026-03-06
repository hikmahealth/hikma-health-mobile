import fc from "fast-check"

jest.mock("expo-secure-store", () => ({
  setItemAsync: jest.fn(() => Promise.resolve()),
  getItemAsync: jest.fn(() => Promise.resolve(null)),
  deleteItemAsync: jest.fn(() => Promise.resolve()),
}))

jest.mock("uuid", () => ({
  v4: jest.fn(() => "mock-uuid"),
}))

import Peer from "../../app/models/Peer"
import {
  peerTypeToDisplayType,
  peerDisplayUrl,
  peerToServerDisplay,
  markSyncTarget,
} from "../../app/screens/syncSettingsHelpers"
import type { PeerType, PeerStatus } from "../../app/db/model/Peer"

// ── Arbitraries ──────────────────────────────────────────────────────

const arbPeerType = fc.constantFrom<PeerType>("sync_hub", "cloud_server", "mobile_app")
const arbPeerStatus = fc.constantFrom<PeerStatus>("active", "revoked", "untrusted")

const arbPeerT = (overrides?: Partial<Peer.T>): fc.Arbitrary<Peer.T> =>
  fc.record({
    id: fc.uuid(),
    peerId: fc.string({ minLength: 1 }),
    name: fc.string(),
    ipAddress: fc.option(fc.ipV4(), { nil: null }),
    port: fc.option(fc.nat({ max: 65535 }), { nil: null }),
    publicKey: fc.string(),
    lastSyncedAt: fc.option(fc.nat(), { nil: null }),
    peerType: overrides?.peerType ? fc.constant(overrides.peerType) : arbPeerType,
    isLeader: fc.boolean(),
    status: overrides?.status ? fc.constant(overrides.status) : arbPeerStatus,
    protocolVersion: fc.string(),
    metadata: overrides?.metadata
      ? fc.constant(overrides.metadata)
      : fc.constant({} as Record<string, unknown>),
    createdAt: fc.date(),
    updatedAt: fc.date(),
  })

// ── Tests ────────────────────────────────────────────────────────────

describe("SyncSettingsScreen display helpers", () => {
  describe("peerTypeToDisplayType", () => {
    it("maps sync_hub to local", () => {
      expect(peerTypeToDisplayType("sync_hub")).toBe("local")
    })

    it("maps cloud_server to cloud", () => {
      expect(peerTypeToDisplayType("cloud_server")).toBe("cloud")
    })

    it("always returns 'local' or 'cloud'", () => {
      fc.assert(
        fc.property(arbPeerType, (peerType) => {
          const result = peerTypeToDisplayType(peerType)
          expect(["local", "cloud"]).toContain(result)
        }),
      )
    })
  })

  describe("peerDisplayUrl", () => {
    it("returns metadata.url for cloud_server peers", () => {
      fc.assert(
        fc.property(
          fc.webUrl({ withFragments: false, withQueryParameters: false }),
          (url) => {
            const peer: Peer.T = {
              ...Peer.empty,
              peerType: "cloud_server",
              metadata: { url },
            }
            expect(peerDisplayUrl(peer)).toBe(url)
          },
        ),
      )
    })

    it("returns metadata.url for hub peers when set", () => {
      fc.assert(
        fc.property(
          fc.webUrl({ withFragments: false, withQueryParameters: false }),
          (url) => {
            const peer: Peer.T = {
              ...Peer.empty,
              peerType: "sync_hub",
              metadata: { url },
            }
            expect(peerDisplayUrl(peer)).toBe(url)
          },
        ),
      )
    })

    it("returns ipAddress:port for hub peers without metadata.url", () => {
      fc.assert(
        fc.property(fc.ipV4(), fc.nat({ max: 65535 }), (ip, port) => {
          const peer: Peer.T = {
            ...Peer.empty,
            peerType: "sync_hub",
            ipAddress: ip,
            port,
          }
          expect(peerDisplayUrl(peer)).toBe(`${ip}:${port}`)
        }),
      )
    })

    it("returns ipAddress alone when port is null", () => {
      fc.assert(
        fc.property(fc.ipV4(), (ip) => {
          const peer: Peer.T = {
            ...Peer.empty,
            peerType: "sync_hub",
            ipAddress: ip,
            port: null,
          }
          expect(peerDisplayUrl(peer)).toBe(ip)
        }),
      )
    })

    it("returns empty string when no URL info available", () => {
      const peer: Peer.T = {
        ...Peer.empty,
        peerType: "sync_hub",
        ipAddress: null,
        port: null,
        metadata: {},
      }
      expect(peerDisplayUrl(peer)).toBe("")
    })
  })

  describe("peerToServerDisplay", () => {
    it("active peers map to isActive=true", () => {
      fc.assert(
        fc.property(arbPeerT({ status: "active" }), (peer) => {
          const display = peerToServerDisplay(peer)
          expect(display.isActive).toBe(true)
        }),
      )
    })

    it("non-active peers map to isActive=false", () => {
      fc.assert(
        fc.property(
          arbPeerT({ status: "revoked" }),
          (peer) => {
            const display = peerToServerDisplay(peer)
            expect(display.isActive).toBe(false)
          },
        ),
      )
    })

    it("preserves the peer id", () => {
      fc.assert(
        fc.property(arbPeerT(), (peer) => {
          const display = peerToServerDisplay(peer)
          expect(display.id).toBe(peer.id)
        }),
      )
    })

    it("type is always 'local' or 'cloud'", () => {
      fc.assert(
        fc.property(arbPeerT(), (peer) => {
          const display = peerToServerDisplay(peer)
          expect(["local", "cloud"]).toContain(display.type)
        }),
      )
    })
  })

  describe("markSyncTarget", () => {
    it("marks only the hub as active when both hub and cloud are active", () => {
      const servers = [
        { id: "cloud-1", type: "cloud" as const, url: "https://api.example.com", isActive: true },
        { id: "hub-1", type: "local" as const, url: "http://192.168.1.1:8080", isActive: true },
      ]
      const result = markSyncTarget(servers)
      expect(result.find((s) => s.id === "hub-1")!.isActive).toBe(true)
      expect(result.find((s) => s.id === "cloud-1")!.isActive).toBe(false)
    })

    it("marks the cloud as active when no hub is active", () => {
      const servers = [
        { id: "cloud-1", type: "cloud" as const, url: "https://api.example.com", isActive: true },
        { id: "hub-1", type: "local" as const, url: "http://192.168.1.1:8080", isActive: false },
      ]
      const result = markSyncTarget(servers)
      expect(result.find((s) => s.id === "cloud-1")!.isActive).toBe(true)
      expect(result.find((s) => s.id === "hub-1")!.isActive).toBe(false)
    })

    it("marks nothing as active when all peers are inactive", () => {
      const servers = [
        { id: "cloud-1", type: "cloud" as const, url: "https://api.example.com", isActive: false },
        { id: "hub-1", type: "local" as const, url: "http://192.168.1.1:8080", isActive: false },
      ]
      const result = markSyncTarget(servers)
      expect(result.every((s) => !s.isActive)).toBe(true)
    })

    it("at most one server is marked active", () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              id: fc.uuid(),
              type: fc.constantFrom<"local" | "cloud">("local", "cloud"),
              url: fc.string(),
              isActive: fc.boolean(),
            }),
            { minLength: 0, maxLength: 5 },
          ),
          (servers) => {
            const result = markSyncTarget(servers)
            const activeCount = result.filter((s) => s.isActive).length
            expect(activeCount).toBeLessThanOrEqual(1)
          },
        ),
      )
    })
  })

  describe("Peer.displayName", () => {
    it("returns name when non-empty", () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1 }),
          fc.string({ minLength: 1 }),
          (name, peerId) => {
            const peer: Peer.T = { ...Peer.empty, name, peerId }
            expect(Peer.displayName(peer)).toBe(name)
          },
        ),
      )
    })

    it("falls back to peerId when name is empty", () => {
      fc.assert(
        fc.property(fc.string({ minLength: 1 }), (peerId) => {
          const peer: Peer.T = { ...Peer.empty, name: "", peerId }
          expect(Peer.displayName(peer)).toBe(peerId)
        }),
      )
    })
  })
})
