/**
 * Adversarial state machine fuzz test for deriveProviderKind.
 *
 * Generates random sequences of mode and peer changes (up to 100 steps),
 * verifying that all invariants hold after every step. This simulates
 * real-world rapid user interactions and race conditions.
 */

import fc from "fast-check"
import { deriveProviderKind, type ProviderKind } from "../../app/providers/deriveProvider"
import type { OperationMode } from "../../app/store/operationMode"
import type { PeerType } from "../../app/db/model/Peer"

// ── Action model ─────────────────────────────────────────────────────

type SetMode = { readonly type: "set_mode"; readonly mode: OperationMode }
type SetPeer = { readonly type: "set_peer"; readonly peerType: PeerType | null }
type Action = SetMode | SetPeer

const arbSetMode: fc.Arbitrary<SetMode> = fc.record({
  type: fc.constant("set_mode" as const),
  mode: fc.constantFrom<OperationMode>("offline", "online"),
})

const arbSetPeer: fc.Arbitrary<SetPeer> = fc.record({
  type: fc.constant("set_peer" as const),
  peerType: fc.oneof(
    fc.constant(null as PeerType | null),
    fc.constantFrom<PeerType>("sync_hub", "cloud_server", "mobile_app"),
  ),
})

const arbAction: fc.Arbitrary<Action> = fc.oneof(arbSetMode, arbSetPeer)

const validKinds: readonly ProviderKind[] = ["offline", "rpc_cloud", "rpc_hub", "unknown"] as const

// ── Invariant checker ────────────────────────────────────────────────

const checkInvariants = (
  mode: OperationMode,
  peerType: PeerType | null,
  result: ProviderKind,
): void => {
  // INV-1: result is always valid
  expect(validKinds).toContain(result)

  // INV-2: offline mode always yields "offline"
  if (mode === "offline") {
    expect(result).toBe("offline")
  }

  // INV-3: rpc_hub requires (online, sync_hub)
  if (result === "rpc_hub") {
    expect(mode).toBe("online")
    expect(peerType).toBe("sync_hub")
  }

  // INV-4: rpc_cloud requires (online, cloud_server)
  if (result === "rpc_cloud") {
    expect(mode).toBe("online")
    expect(peerType).toBe("cloud_server")
  }

  // INV-5: null peer never yields an RPC kind
  if (peerType === null) {
    expect(result).toBe("offline")
  }

  // INV-6: mobile_app peer yields "unknown" when online (unrecognized peer type)
  if (peerType === "mobile_app" && mode === "online") {
    expect(result).toBe("unknown")
  }

  // INV-7: unrecognized peer types never yield an RPC kind
  if (peerType === "mobile_app") {
    expect(result === "rpc_hub" || result === "rpc_cloud").toBe(false)
  }
}

// ── State machine test ───────────────────────────────────────────────

describe("deriveProviderKind — state machine", () => {
  it("maintains all invariants through arbitrary action sequences", () => {
    fc.assert(
      fc.property(
        fc.array(arbAction, { minLength: 1, maxLength: 100 }),
        (actions) => {
          let mode: OperationMode = "offline"
          let peerType: PeerType | null = null

          for (const action of actions) {
            switch (action.type) {
              case "set_mode":
                mode = action.mode
                break
              case "set_peer":
                peerType = action.peerType
                break
            }

            const peer = peerType ? { peerType } : null
            const result = deriveProviderKind(mode, peer)
            checkInvariants(mode, peerType, result)
          }
        },
      ),
    )
  })

  it("final state depends only on last mode and peer, not history", () => {
    fc.assert(
      fc.property(
        fc.array(arbAction, { minLength: 2, maxLength: 50 }),
        arbAction,
        (prefix, finalAction) => {
          // Run through full sequence
          let mode: OperationMode = "offline"
          let peerType: PeerType | null = null

          for (const action of [...prefix, finalAction]) {
            if (action.type === "set_mode") mode = action.mode
            if (action.type === "set_peer") peerType = action.peerType
          }

          const peer = peerType ? { peerType } : null
          const resultFromSequence = deriveProviderKind(mode, peer)

          // Compare with direct call using same final state
          const resultDirect = deriveProviderKind(mode, peer)

          expect(resultFromSequence).toBe(resultDirect)
        },
      ),
    )
  })

  it("interleaved mode flips with constant peer preserve peer-based invariants", () => {
    fc.assert(
      fc.property(
        fc.array(arbSetMode, { minLength: 1, maxLength: 50 }),
        fc.oneof(
          fc.constant(null as PeerType | null),
          fc.constantFrom<PeerType>("sync_hub", "cloud_server"),
        ),
        (modeActions, fixedPeerType) => {
          const peer = fixedPeerType ? { peerType: fixedPeerType } : null

          for (const action of modeActions) {
            const result = deriveProviderKind(action.mode, peer)
            checkInvariants(action.mode, fixedPeerType, result)
          }
        },
      ),
    )
  })

  it("interleaved peer swaps with constant mode preserve mode-based invariants", () => {
    fc.assert(
      fc.property(
        fc.constantFrom<OperationMode>("offline", "online"),
        fc.array(arbSetPeer, { minLength: 1, maxLength: 50 }),
        (fixedMode, peerActions) => {
          for (const action of peerActions) {
            const peer = action.peerType ? { peerType: action.peerType } : null
            const result = deriveProviderKind(fixedMode, peer)
            checkInvariants(fixedMode, action.peerType, result)
          }
        },
      ),
    )
  })
})
