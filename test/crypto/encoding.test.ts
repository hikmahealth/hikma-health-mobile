import fc from "fast-check"
import { encode, decode, utf8Encode, utf8Decode } from "../../app/crypto/encoding"

describe("crypto/encoding", () => {
  it("roundtrips arbitrary Uint8Array through encode/decode", () => {
    fc.assert(
      fc.property(fc.uint8Array({ minLength: 0, maxLength: 256 }), (bytes) => {
        const roundtripped = decode(encode(bytes))
        expect(roundtripped).toEqual(bytes)
      }),
    )
  })

  it("output never contains =, +, or /", () => {
    fc.assert(
      fc.property(fc.uint8Array({ minLength: 1, maxLength: 256 }), (bytes) => {
        const encoded = encode(bytes)
        expect(encoded).not.toMatch(/[=+/]/)
      }),
    )
  })

  it("roundtrips arbitrary strings through utf8Encode/utf8Decode", () => {
    fc.assert(
      fc.property(fc.string(), (text) => {
        expect(utf8Decode(utf8Encode(text))).toBe(text)
      }),
    )
  })

  it("encodes empty array to empty string", () => {
    expect(encode(new Uint8Array(0))).toBe("")
  })

  it("decodes empty string to empty array", () => {
    expect(decode("")).toEqual(new Uint8Array(0))
  })
})
