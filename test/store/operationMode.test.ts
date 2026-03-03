/**
 * Property-based tests for the operationModeStore.
 *
 * Verifies that the XState store correctly manages mode transitions,
 * server config, and reset behavior across arbitrary event sequences.
 */

import fc from "fast-check"
import { operationModeStore, type OperationMode, type ModeConfig } from "../../app/store/operationMode"

// ── Arbitraries ──────────────────────────────────────────────────────

const arbMode = fc.constantFrom<OperationMode>("offline", "online")
const arbModeConfig = fc.constantFrom<ModeConfig>("offline", "online", "user_choice")

type StoreEvent =
  | { type: "set_mode"; mode: OperationMode }
  | { type: "set_server_config"; config: ModeConfig }
  | { type: "start_transition" }
  | { type: "end_transition"; mode: OperationMode }
  | { type: "reset" }

const arbEvent: fc.Arbitrary<StoreEvent> = fc.oneof(
  fc.record({ type: fc.constant("set_mode" as const), mode: arbMode }),
  fc.record({ type: fc.constant("set_server_config" as const), config: arbModeConfig }),
  fc.constant({ type: "start_transition" as const }),
  fc.record({ type: fc.constant("end_transition" as const), mode: arbMode }),
  fc.constant({ type: "reset" as const }),
)

// ── Tests ────────────────────────────────────────────────────────────

describe("operationModeStore", () => {
  beforeEach(() => {
    operationModeStore.send({ type: "reset" })
  })

  it("defaults to offline mode", () => {
    const ctx = operationModeStore.getSnapshot().context
    expect(ctx.mode).toBe("offline")
    expect(ctx.isTransitioning).toBe(false)
    expect(ctx.configSource).toBe("local")
    expect(ctx.serverConfig).toBe("user_choice")
  })

  it("set_mode sets any valid OperationMode", () => {
    fc.assert(
      fc.property(arbMode, (mode) => {
        operationModeStore.send({ type: "reset" })
        operationModeStore.send({ type: "set_mode", mode })
        expect(operationModeStore.getSnapshot().context.mode).toBe(mode)
        expect(operationModeStore.getSnapshot().context.isTransitioning).toBe(false)
      }),
    )
  })

  it("transition start/end cycle preserves the target mode", () => {
    fc.assert(
      fc.property(arbMode, (targetMode) => {
        operationModeStore.send({ type: "reset" })
        operationModeStore.send({ type: "start_transition" })
        expect(operationModeStore.getSnapshot().context.isTransitioning).toBe(true)

        operationModeStore.send({ type: "end_transition", mode: targetMode })
        const ctx = operationModeStore.getSnapshot().context
        expect(ctx.isTransitioning).toBe(false)
        expect(ctx.mode).toBe(targetMode)
      }),
    )
  })

  it("set_server_config forces mode when config is not user_choice", () => {
    fc.assert(
      fc.property(
        fc.constantFrom<ModeConfig>("offline", "online"),
        (config) => {
          operationModeStore.send({ type: "reset" })
          operationModeStore.send({ type: "set_server_config", config })
          const ctx = operationModeStore.getSnapshot().context
          expect(ctx.serverConfig).toBe(config)
          expect(ctx.configSource).toBe("server")
          expect(ctx.mode).toBe(config)
        },
      ),
    )
  })

  it("set_server_config with user_choice does not override current mode", () => {
    fc.assert(
      fc.property(arbMode, (initialMode) => {
        operationModeStore.send({ type: "reset" })
        operationModeStore.send({ type: "set_mode", mode: initialMode })
        operationModeStore.send({ type: "set_server_config", config: "user_choice" })

        const ctx = operationModeStore.getSnapshot().context
        expect(ctx.serverConfig).toBe("user_choice")
        expect(ctx.mode).toBe(initialMode)
      }),
    )
  })

  it("reset always returns to initial state regardless of prior state", () => {
    fc.assert(
      fc.property(
        fc.array(arbEvent, { minLength: 0, maxLength: 20 }),
        (events) => {
          for (const event of events) {
            operationModeStore.send(event)
          }
          operationModeStore.send({ type: "reset" })

          const ctx = operationModeStore.getSnapshot().context
          expect(ctx.mode).toBe("offline")
          expect(ctx.isTransitioning).toBe(false)
          expect(ctx.configSource).toBe("local")
          expect(ctx.serverConfig).toBe("user_choice")
        },
      ),
    )
  })

  it("mode is always a valid OperationMode after any event sequence", () => {
    const validModes: readonly OperationMode[] = ["offline", "online"]
    fc.assert(
      fc.property(
        fc.array(arbEvent, { minLength: 1, maxLength: 50 }),
        (events) => {
          operationModeStore.send({ type: "reset" })
          for (const event of events) {
            operationModeStore.send(event)
          }
          expect(validModes).toContain(operationModeStore.getSnapshot().context.mode)
        },
      ),
    )
  })

  it("isTransitioning is boolean after any event sequence", () => {
    fc.assert(
      fc.property(
        fc.array(arbEvent, { minLength: 1, maxLength: 50 }),
        (events) => {
          operationModeStore.send({ type: "reset" })
          for (const event of events) {
            operationModeStore.send(event)
          }
          expect(typeof operationModeStore.getSnapshot().context.isTransitioning).toBe("boolean")
        },
      ),
    )
  })
})
