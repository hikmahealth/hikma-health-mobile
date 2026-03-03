/**
 * Property-based tests for resolveConflict.
 *
 * This pure function merges a local record with a remote record,
 * preserving local values for columns listed in local._changed.
 */

import fc from "fast-check"
import { resolveConflict } from "../../app/db/localSync"
import type { DirtyRaw } from "@nozbe/watermelondb/RawRecord"

// ── Arbitraries ──────────────────────────────────────────────────────

const arbId = fc.uuid()
const arbStatus = fc.constantFrom("synced", "created", "updated", "deleted")
const arbColumnName = fc.constantFrom("name", "phone", "email", "address", "metadata")
const arbChanged = fc.array(arbColumnName, { maxLength: 4 }).map((cols) => [...new Set(cols)].join(","))
const arbFieldValue = fc.oneof(fc.string({ maxLength: 20 }), fc.integer(), fc.boolean(), fc.constant(null))

const arbDirtyRaw = (overrides?: Partial<DirtyRaw>): fc.Arbitrary<DirtyRaw> =>
  fc
    .record({
      id: arbId,
      _status: arbStatus,
      _changed: arbChanged,
      name: fc.string({ maxLength: 20 }),
      phone: fc.string({ maxLength: 15 }),
      email: fc.string({ maxLength: 30 }),
      address: fc.string({ maxLength: 50 }),
      metadata: fc.string({ maxLength: 20 }),
      updated_at: fc.integer({ min: 0 }),
      created_at: fc.integer({ min: 0 }),
    })
    .map((raw) => ({ ...raw, ...overrides }) as DirtyRaw)

// ── Unit tests ───────────────────────────────────────────────────────

describe("resolveConflict — unit", () => {
  const local = (overrides: Record<string, unknown> = {}): DirtyRaw =>
    ({
      id: "rec-1",
      _status: "updated",
      _changed: "",
      name: "Local Name",
      phone: "111",
      email: "local@test.com",
      updated_at: 1000,
      created_at: 500,
      ...overrides,
    }) as DirtyRaw

  const remote = (overrides: Record<string, unknown> = {}): DirtyRaw =>
    ({
      id: "rec-1",
      _status: "synced",
      _changed: "",
      name: "Remote Name",
      phone: "222",
      email: "remote@test.com",
      updated_at: 2000,
      created_at: 500,
      ...overrides,
    }) as DirtyRaw

  it("remote wins entirely when _changed is empty", () => {
    const result = resolveConflict(local({ _changed: "" }), remote())
    expect(result.name).toBe("Remote Name")
    expect(result.phone).toBe("222")
    expect(result.email).toBe("remote@test.com")
  })

  it("preserves local value for changed column", () => {
    const result = resolveConflict(local({ _changed: "phone" }), remote())
    expect(result.name).toBe("Remote Name") // remote wins
    expect(result.phone).toBe("111") // local wins
    expect(result.email).toBe("remote@test.com") // remote wins
  })

  it("preserves multiple locally changed columns", () => {
    const result = resolveConflict(local({ _changed: "name,email" }), remote())
    expect(result.name).toBe("Local Name") // local wins
    expect(result.phone).toBe("222") // remote wins
    expect(result.email).toBe("local@test.com") // local wins
  })

  it("returns local unchanged when _status is deleted", () => {
    const deletedLocal = local({ _status: "deleted", _changed: "name" })
    const result = resolveConflict(deletedLocal, remote())
    expect(result).toBe(deletedLocal)
  })

  it("preserves local id, _status, and _changed", () => {
    const result = resolveConflict(
      local({ _status: "updated", _changed: "phone" }),
      remote({ _status: "synced", _changed: "" }),
    )
    expect(result.id).toBe("rec-1")
    expect(result._status).toBe("updated")
    expect(result._changed).toBe("phone")
  })
})

// ── Property-based tests ─────────────────────────────────────────────

describe("resolveConflict — properties", () => {
  it("resolved record always has local's id", () => {
    fc.assert(
      fc.property(arbDirtyRaw(), arbDirtyRaw(), (local, remote) => {
        const result = resolveConflict(local, remote)
        expect(result.id).toBe(local.id)
      }),
    )
  })

  it("resolved record always has local's _status and _changed", () => {
    fc.assert(
      fc.property(arbDirtyRaw(), arbDirtyRaw(), (local, remote) => {
        const result = resolveConflict(local, remote)
        expect(result._status).toBe(local._status)
        expect(result._changed).toBe(local._changed)
      }),
    )
  })

  it("for every column in _changed, resolved value equals local value", () => {
    fc.assert(
      fc.property(
        arbDirtyRaw({ _status: "updated" }),
        arbDirtyRaw(),
        (local, remote) => {
          const result = resolveConflict(local, remote)
          const changedCols =
            typeof local._changed === "string"
              ? local._changed.split(",").filter(Boolean)
              : []
          for (const col of changedCols) {
            if (col in local) {
              expect(result[col]).toBe(local[col])
            }
          }
        },
      ),
    )
  })

  it("deleted local records are returned unchanged (identity)", () => {
    fc.assert(
      fc.property(
        arbDirtyRaw({ _status: "deleted" }),
        arbDirtyRaw(),
        (local, remote) => {
          const result = resolveConflict(local, remote)
          expect(result).toBe(local) // strict reference equality
        },
      ),
    )
  })

  it("when _changed is empty and status is not deleted, remote values win for non-meta fields", () => {
    fc.assert(
      fc.property(
        arbDirtyRaw({ _changed: "", _status: "updated" }),
        arbDirtyRaw(),
        (local, remote) => {
          const result = resolveConflict(local, remote)
          // Remote values should win for all fields except id, _status, _changed
          for (const key of Object.keys(remote)) {
            if (key === "id" || key === "_status" || key === "_changed") continue
            expect(result[key]).toBe(remote[key])
          }
        },
      ),
    )
  })

  it("is idempotent: resolving twice with same remote yields same result", () => {
    fc.assert(
      fc.property(
        arbDirtyRaw({ _status: "updated" }),
        arbDirtyRaw(),
        (local, remote) => {
          const first = resolveConflict(local, remote)
          const second = resolveConflict(first, remote)
          // After first resolve, _changed columns already have local values.
          // Second resolve should produce same data for those columns.
          const changedCols =
            typeof local._changed === "string"
              ? local._changed.split(",").filter(Boolean)
              : []
          for (const col of changedCols) {
            if (col in local) {
              expect(second[col]).toBe(first[col])
            }
          }
        },
      ),
    )
  })
})

// ── Adversarial ──────────────────────────────────────────────────────

describe("resolveConflict — adversarial", () => {
  it("handles garbage _changed strings without crashing", () => {
    const arbGarbageChanged = fc.oneof(
      fc.constant(""),
      fc.constant(",,,"),
      fc.constant("nonexistent_column"),
      fc.constant("name,,,,phone,"),
      fc.string({ maxLength: 100 }),
    )

    fc.assert(
      fc.property(
        arbDirtyRaw().chain((raw) =>
          arbGarbageChanged.map((changed) => ({ ...raw, _changed: changed }) as DirtyRaw),
        ),
        arbDirtyRaw(),
        (local, remote) => {
          // Should never throw
          const result = resolveConflict(local, remote)
          expect(result.id).toBe(local.id)
          expect(result._status).toBe(local._status)
        },
      ),
    )
  })

  it("handles _changed with duplicate column names", () => {
    const local: DirtyRaw = {
      id: "rec-1",
      _status: "updated",
      _changed: "name,name,name",
      name: "Local",
    } as DirtyRaw

    const remote: DirtyRaw = {
      id: "rec-1",
      _status: "synced",
      _changed: "",
      name: "Remote",
    } as DirtyRaw

    const result = resolveConflict(local, remote)
    expect(result.name).toBe("Local")
  })
})
