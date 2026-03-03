import fc from "fast-check"

import { hasValidStringProp } from "../../app/utils/hasValidStringProp"

describe("hasValidStringProp", () => {
  // ── Basic correctness ──────────────────────────────────────────────────

  it("returns true when prop exists and is a string", () => {
    expect(hasValidStringProp({ name: "Alice" }, "name")).toBe(true)
    expect(hasValidStringProp({ title: "" }, "title")).toBe(true) // empty string is still a string
  })

  it("returns false when prop exists but is not a string", () => {
    expect(hasValidStringProp({ count: 42 }, "count")).toBe(false)
    expect(hasValidStringProp({ active: true }, "active")).toBe(false)
    expect(hasValidStringProp({ items: [] }, "items")).toBe(false)
    expect(hasValidStringProp({ nested: {} }, "nested")).toBe(false)
    expect(hasValidStringProp({ val: null }, "val")).toBe(false)
    expect(hasValidStringProp({ val: undefined }, "val")).toBe(false)
  })

  it("returns false when prop does not exist", () => {
    expect(hasValidStringProp({ name: "Alice" }, "age")).toBe(false)
    expect(hasValidStringProp({}, "anything")).toBe(false)
  })

  it("returns false for null props", () => {
    expect(hasValidStringProp(null, "key")).toBe(false)
  })

  it("returns false for undefined props", () => {
    expect(hasValidStringProp(undefined, "key")).toBe(false)
  })

  it("returns false for non-object primitives", () => {
    expect(hasValidStringProp(42, "key")).toBe(false)
    expect(hasValidStringProp("string", "key")).toBe(false)
    expect(hasValidStringProp(true, "key")).toBe(false)
    expect(hasValidStringProp(Symbol("sym"), "key")).toBe(false)
  })

  it("works with arrays (they are objects, but props like '0' can be checked)", () => {
    // Arrays are objects, so checking named props should work
    const arr = ["hello"]
    expect(hasValidStringProp(arr, "0")).toBe(true)
    expect(hasValidStringProp(arr, "length")).toBe(false) // length is number
  })

  // ── Property-based tests ──────────────────────────────────────────────

  it("always returns true for objects with a known string property", () => {
    fc.assert(
      fc.property(fc.string(), fc.string(), (key, value) => {
        const obj = { [key]: value }
        expect(hasValidStringProp(obj, key)).toBe(true)
      }),
    )
  })

  it("always returns false when prop name is absent from the object", () => {
    fc.assert(
      fc.property(
        fc.dictionary(fc.string({ minLength: 1, maxLength: 5 }), fc.string(), { maxKeys: 5 }),
        fc.string({ minLength: 6, maxLength: 10 }), // guaranteed not in dict keys (different length range)
        (obj, missingKey) => {
          // Ensure missingKey is truly absent
          if (!(missingKey in obj)) {
            expect(hasValidStringProp(obj, missingKey)).toBe(false)
          }
        },
      ),
    )
  })

  it("always returns false for non-object first arguments", () => {
    fc.assert(
      fc.property(
        fc.oneof(fc.integer(), fc.boolean(), fc.constant(null), fc.constant(undefined)),
        fc.string(),
        (props, key) => {
          expect(hasValidStringProp(props, key)).toBe(false)
        },
      ),
    )
  })

  it("returns false when the value under the key is a non-string type", () => {
    fc.assert(
      fc.property(
        fc.string(),
        fc.oneof(fc.integer(), fc.boolean(), fc.constant(null), fc.constant(undefined), fc.array(fc.anything())),
        (key, value) => {
          const obj = { [key]: value }
          expect(hasValidStringProp(obj, key)).toBe(false)
        },
      ),
    )
  })

  it("always returns a boolean", () => {
    fc.assert(
      fc.property(fc.anything(), fc.string(), (props, key) => {
        expect(typeof hasValidStringProp(props, key)).toBe("boolean")
      }),
    )
  })
})
