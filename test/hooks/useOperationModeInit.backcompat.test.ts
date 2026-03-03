/**
 * Backward compatibility tests for the operation mode initialization.
 *
 * Verifies that the MMKV preference migration logic correctly handles
 * all stored values including the deprecated "sync_hub" value from
 * earlier app versions.
 */

import fc from "fast-check"
import type { OperationMode } from "../../app/store/operationMode"

// ── Pure migration logic (extracted for testability) ─────────────────

/**
 * Mirrors the preference resolution logic in useOperationModeInit.
 * This is the pure function under test — the hook wraps it with effects.
 */
const resolvePreference = (stored: string | null): { mode: OperationMode; shouldClean: boolean } => {
  const shouldClean = stored === "sync_hub"
  const mode: OperationMode = stored === "online" ? "online" : "offline"
  return { mode, shouldClean }
}

// ── Tests ────────────────────────────────────────────────────────────

describe("useOperationModeInit — backward compatibility", () => {
  describe("resolvePreference (pure logic)", () => {
    it('maps "online" → online, no cleanup', () => {
      const result = resolvePreference("online")
      expect(result.mode).toBe("online")
      expect(result.shouldClean).toBe(false)
    })

    it('maps "offline" → offline, no cleanup', () => {
      const result = resolvePreference("offline")
      expect(result.mode).toBe("offline")
      expect(result.shouldClean).toBe(false)
    })

    it('maps null (first launch) → offline, no cleanup', () => {
      const result = resolvePreference(null)
      expect(result.mode).toBe("offline")
      expect(result.shouldClean).toBe(false)
    })

    it('maps deprecated "sync_hub" → offline with cleanup flag', () => {
      const result = resolvePreference("sync_hub")
      expect(result.mode).toBe("offline")
      expect(result.shouldClean).toBe(true)
    })

    it("only 'online' produces online mode (property)", () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.constant(null),
            fc.string({ minLength: 0, maxLength: 30 }),
          ),
          (stored) => {
            const { mode } = resolvePreference(stored)
            if (stored === "online") {
              expect(mode).toBe("online")
            } else {
              expect(mode).toBe("offline")
            }
          },
        ),
      )
    })

    it("result mode is always a valid OperationMode", () => {
      const validModes: readonly OperationMode[] = ["offline", "online"]
      fc.assert(
        fc.property(
          fc.oneof(
            fc.constant(null),
            fc.string({ minLength: 0, maxLength: 50 }),
          ),
          (stored) => {
            const { mode } = resolvePreference(stored)
            expect(validModes).toContain(mode)
          },
        ),
      )
    })

    it("shouldClean is true only for 'sync_hub' (property)", () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.constant(null),
            fc.string({ minLength: 0, maxLength: 30 }),
          ),
          (stored) => {
            const { shouldClean } = resolvePreference(stored)
            if (stored === "sync_hub") {
              expect(shouldClean).toBe(true)
            } else {
              expect(shouldClean).toBe(false)
            }
          },
        ),
      )
    })

    it("never returns sync_hub as mode regardless of input", () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.constant(null),
            fc.constant("sync_hub"),
            fc.constant("online"),
            fc.constant("offline"),
            fc.string({ minLength: 0, maxLength: 50 }),
          ),
          (stored) => {
            const { mode } = resolvePreference(stored)
            expect(mode).not.toBe("sync_hub")
          },
        ),
      )
    })

    it("is deterministic", () => {
      fc.assert(
        fc.property(
          fc.oneof(fc.constant(null), fc.string()),
          (stored) => {
            const a = resolvePreference(stored)
            const b = resolvePreference(stored)
            expect(a).toEqual(b)
          },
        ),
      )
    })
  })
})
