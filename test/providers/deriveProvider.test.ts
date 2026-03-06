/**
 * Property-based and exhaustive tests for deriveProviderKind.
 *
 * This pure function is the core of the mode/peer separation:
 * it maps (OperationMode, ActivePeerInfo) → ProviderKind with no side effects.
 */

import fc from "fast-check"
import {
  deriveProviderKind,
  type ProviderKind,
  type ActivePeerInfo,
} from "../../app/providers/deriveProvider"
import type { OperationMode } from "../../app/store/operationMode"
import type { PeerType } from "../../app/db/model/Peer"

// ── Arbitraries ──────────────────────────────────────────────────────

const arbMode = fc.constantFrom<OperationMode>("offline", "online")
const arbPeerType = fc.constantFrom<PeerType>("sync_hub", "cloud_server", "mobile_app")
const arbActivePeer: fc.Arbitrary<ActivePeerInfo> = fc.oneof(
  fc.constant(null),
  fc.record({ peerType: arbPeerType }),
)
const validKinds: readonly ProviderKind[] = ["offline", "rpc_cloud", "rpc_hub", "unknown"] as const

// ── Exhaustive unit tests (all 8 combinations) ──────────────────────

describe("deriveProviderKind — exhaustive", () => {
  it.each([
    ["offline", null, "offline"],
    ["offline", { peerType: "cloud_server" as PeerType }, "offline"],
    ["offline", { peerType: "sync_hub" as PeerType }, "offline"],
    ["offline", { peerType: "mobile_app" as PeerType }, "offline"],
    ["online", null, "offline"],
    ["online", { peerType: "cloud_server" as PeerType }, "rpc_cloud"],
    ["online", { peerType: "sync_hub" as PeerType }, "rpc_hub"],
    ["online", { peerType: "mobile_app" as PeerType }, "unknown"],
  ] as const)(
    "(%s, %j) → %s",
    (mode, peer, expected) => {
      expect(deriveProviderKind(mode as OperationMode, peer)).toBe(expected)
    },
  )
})

// ── Property-based invariants ────────────────────────────────────────

describe("deriveProviderKind — properties", () => {
  it("always returns a valid ProviderKind (exhaustiveness)", () => {
    fc.assert(
      fc.property(arbMode, arbActivePeer, (mode, peer) => {
        expect(validKinds).toContain(deriveProviderKind(mode, peer))
      }),
    )
  })

  it("offline mode is absorbing — always returns 'offline' regardless of peer", () => {
    fc.assert(
      fc.property(arbActivePeer, (peer) => {
        expect(deriveProviderKind("offline", peer)).toBe("offline")
      }),
    )
  })

  it("online + known peer type never falls back to offline", () => {
    const arbKnownPeer = fc.constantFrom<PeerType>("cloud_server", "sync_hub")
    fc.assert(
      fc.property(arbKnownPeer, (peerType) => {
        expect(deriveProviderKind("online", { peerType })).not.toBe("offline")
      }),
    )
  })

  it("rpc_hub implies online mode AND sync_hub peer (biconditional)", () => {
    fc.assert(
      fc.property(arbMode, arbActivePeer, (mode, peer) => {
        const result = deriveProviderKind(mode, peer)
        if (result === "rpc_hub") {
          expect(mode).toBe("online")
          expect(peer).not.toBeNull()
          expect(peer!.peerType).toBe("sync_hub")
        }
      }),
    )
  })

  it("rpc_cloud implies online mode AND cloud_server peer (biconditional)", () => {
    fc.assert(
      fc.property(arbMode, arbActivePeer, (mode, peer) => {
        const result = deriveProviderKind(mode, peer)
        if (result === "rpc_cloud") {
          expect(mode).toBe("online")
          expect(peer).not.toBeNull()
          expect(peer!.peerType).toBe("cloud_server")
        }
      }),
    )
  })

  it("is deterministic — same inputs always produce same output", () => {
    fc.assert(
      fc.property(arbMode, arbActivePeer, (mode, peer) => {
        const a = deriveProviderKind(mode, peer)
        const b = deriveProviderKind(mode, peer)
        expect(a).toBe(b)
      }),
    )
  })

  it("is referentially transparent — structurally equal inputs yield same output", () => {
    fc.assert(
      fc.property(arbMode, arbPeerType, (mode, peerType) => {
        const peer1 = { peerType }
        const peer2 = { peerType }
        expect(deriveProviderKind(mode, peer1)).toBe(deriveProviderKind(mode, peer2))
      }),
    )
  })

  it("null peer with any mode never returns rpc_hub or rpc_cloud", () => {
    fc.assert(
      fc.property(arbMode, (mode) => {
        const result = deriveProviderKind(mode, null)
        expect(result).toBe("offline")
      }),
    )
  })
})

// ── Adversarial: rapid transitions ───────────────────────────────────

describe("deriveProviderKind — adversarial", () => {
  it("handles rapid mode/peer transitions without state leaking", () => {
    fc.assert(
      fc.property(
        fc.array(fc.tuple(arbMode, arbActivePeer), { minLength: 1, maxLength: 100 }),
        (transitions) => {
          for (const [mode, peer] of transitions) {
            const result = deriveProviderKind(mode, peer)
            expect(validKinds).toContain(result)

            // Each call is independent — verify against the specific inputs
            if (mode === "offline") {
              expect(result).toBe("offline")
            }
            if (result === "rpc_hub") {
              expect(mode).toBe("online")
              expect(peer?.peerType).toBe("sync_hub")
            }
            if (result === "rpc_cloud") {
              expect(mode).toBe("online")
              expect(peer?.peerType).toBe("cloud_server")
            }
          }
        },
      ),
    )
  })

  it("survives adversarial peer shapes with unexpected peerType values", () => {
    // Cast garbage strings to PeerType to simulate corrupted data
    const arbGarbagePeer: fc.Arbitrary<ActivePeerInfo> = fc.oneof(
      fc.constant(null),
      fc.record({
        peerType: fc.constantFrom(
          "sync_hub" as PeerType,
          "cloud_server" as PeerType,
          "mobile_app" as PeerType,
          "garbage_value" as PeerType,
          "" as PeerType,
        ),
      }),
    )

    fc.assert(
      fc.property(arbMode, arbGarbagePeer, (mode, peer) => {
        // Should never throw, always return a valid ProviderKind
        const result = deriveProviderKind(mode, peer)
        expect(validKinds).toContain(result)
      }),
    )
  })
})
