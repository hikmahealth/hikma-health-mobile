import fc from "fast-check"

import { levenshtein } from "../../app/utils/levenshtein"

describe("levenshtein", () => {
  // ── Basic correctness ──────────────────────────────────────────────────
  it("returns 0 for identical strings", () => {
    expect(levenshtein("kitten", "kitten")).toBe(0)
    expect(levenshtein("", "")).toBe(0)
  })

  it("returns the length of the other string when one is empty", () => {
    expect(levenshtein("", "abc")).toBe(3)
    expect(levenshtein("hello", "")).toBe(5)
  })

  it("computes known distances", () => {
    expect(levenshtein("kitten", "sitting")).toBe(3)
    expect(levenshtein("saturday", "sunday")).toBe(3)
    expect(levenshtein("flaw", "lawn")).toBe(2)
    expect(levenshtein("gumbo", "gambol")).toBe(2)
  })

  it("handles single-character edits", () => {
    // substitution
    expect(levenshtein("a", "b")).toBe(1)
    // insertion
    expect(levenshtein("a", "ab")).toBe(1)
    // deletion
    expect(levenshtein("ab", "a")).toBe(1)
  })

  it("handles completely different strings", () => {
    expect(levenshtein("abc", "xyz")).toBe(3)
  })

  it("handles unicode and multibyte characters", () => {
    expect(levenshtein("café", "cafe")).toBe(1)
    expect(levenshtein("مرحبا", "مرحبا")).toBe(0)
    expect(levenshtein("你好", "你好世界")).toBe(2)
  })

  // ── Property-based tests (adversarial) ─────────────────────────────────

  it("identity: distance of a string to itself is always 0", () => {
    fc.assert(
      fc.property(fc.string(), (s) => {
        expect(levenshtein(s, s)).toBe(0)
      }),
    )
  })

  it("symmetry: d(a,b) === d(b,a)", () => {
    fc.assert(
      fc.property(fc.string(), fc.string(), (a, b) => {
        expect(levenshtein(a, b)).toBe(levenshtein(b, a))
      }),
    )
  })

  it("non-negativity: distance is always >= 0", () => {
    fc.assert(
      fc.property(fc.string(), fc.string(), (a, b) => {
        expect(levenshtein(a, b)).toBeGreaterThanOrEqual(0)
      }),
    )
  })

  it("triangle inequality: d(a,c) <= d(a,b) + d(b,c)", () => {
    fc.assert(
      fc.property(
        fc.string({ maxLength: 30 }),
        fc.string({ maxLength: 30 }),
        fc.string({ maxLength: 30 }),
        (a, b, c) => {
          expect(levenshtein(a, c)).toBeLessThanOrEqual(levenshtein(a, b) + levenshtein(b, c))
        },
      ),
    )
  })

  it("upper bound: distance never exceeds the length of the longer string", () => {
    fc.assert(
      fc.property(fc.string(), fc.string(), (a, b) => {
        expect(levenshtein(a, b)).toBeLessThanOrEqual(Math.max(a.length, b.length))
      }),
    )
  })

  it("lower bound: distance is at least abs(len(a) - len(b))", () => {
    fc.assert(
      fc.property(fc.string(), fc.string(), (a, b) => {
        expect(levenshtein(a, b)).toBeGreaterThanOrEqual(Math.abs(a.length - b.length))
      }),
    )
  })

  it("prepending the same prefix does not change distance", () => {
    fc.assert(
      fc.property(
        fc.string({ maxLength: 20 }),
        fc.string({ maxLength: 20 }),
        fc.string({ maxLength: 10 }),
        (a, b, prefix) => {
          expect(levenshtein(prefix + a, prefix + b)).toBeLessThanOrEqual(levenshtein(a, b))
        },
      ),
    )
  })

  it("appending the same suffix does not increase distance", () => {
    fc.assert(
      fc.property(
        fc.string({ maxLength: 20 }),
        fc.string({ maxLength: 20 }),
        fc.string({ maxLength: 10 }),
        (a, b, suffix) => {
          expect(levenshtein(a + suffix, b + suffix)).toBeLessThanOrEqual(levenshtein(a, b))
        },
      ),
    )
  })

  it("single character difference means distance of exactly 1", () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 50 }),
        fc.nat().map((n) => n), // position index
        fc.string({ minLength: 1, maxLength: 1 }), // replacement char
        (s, rawIdx, newChar) => {
          const idx = rawIdx % s.length
          if (s[idx] === newChar) return // skip no-ops
          const modified = s.slice(0, idx) + newChar + s.slice(idx + 1)
          expect(levenshtein(s, modified)).toBe(1)
        },
      ),
    )
  })
})
