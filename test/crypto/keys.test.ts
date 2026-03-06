import fc from "fast-check"
import { generateKeyPair, computeSharedPoint, deriveSessionKey } from "../../app/crypto/keys"

describe("crypto/keys", () => {
  it("generates 32-byte keys", () => {
    fc.assert(
      fc.property(fc.constant(null), () => {
        const { privateKey, publicKey } = generateKeyPair()
        expect(privateKey.length).toBe(32)
        expect(publicKey.length).toBe(32)
      }),
      { numRuns: 10 },
    )
  })

  it("ECDH is commutative", () => {
    fc.assert(
      fc.property(fc.constant(null), () => {
        const a = generateKeyPair()
        const b = generateKeyPair()
        const sharedAB = computeSharedPoint(a.privateKey, b.publicKey)
        const sharedBA = computeSharedPoint(b.privateKey, a.publicKey)
        expect(sharedAB).toEqual(sharedBA)
      }),
      { numRuns: 10 },
    )
  })

  it("deriveSessionKey output is always 32 bytes", () => {
    fc.assert(
      fc.property(fc.constant(null), () => {
        const a = generateKeyPair()
        const b = generateKeyPair()
        const shared = computeSharedPoint(a.privateKey, b.publicKey)
        const key = deriveSessionKey(shared, b.publicKey, a.publicKey)
        expect(key.length).toBe(32)
      }),
      { numRuns: 10 },
    )
  })

  it("deriveSessionKey is deterministic", () => {
    const a = generateKeyPair()
    const b = generateKeyPair()
    const shared = computeSharedPoint(a.privateKey, b.publicKey)
    const key1 = deriveSessionKey(shared, b.publicKey, a.publicKey)
    const key2 = deriveSessionKey(shared, b.publicKey, a.publicKey)
    expect(key1).toEqual(key2)
  })

  it("RFC 7748 known test vector", () => {
    // RFC 7748 Section 6.1 test vector
    const alicePrivate = new Uint8Array([
      0x77, 0x07, 0x6d, 0x0a, 0x73, 0x18, 0xa5, 0x7d, 0x3c, 0x16, 0xc1, 0x72, 0x51, 0xb2, 0x66,
      0x45, 0xdf, 0x4c, 0x2f, 0x87, 0xeb, 0xc0, 0x99, 0x2a, 0xb1, 0x77, 0xfb, 0xa5, 0x1d, 0xb9,
      0x2c, 0x2a,
    ])
    const bobPublic = new Uint8Array([
      0xde, 0x9e, 0xdb, 0x7d, 0x7b, 0x7d, 0xc1, 0xb4, 0xd3, 0x5b, 0x61, 0xc2, 0xec, 0xe4, 0x35,
      0x37, 0x3f, 0x83, 0x43, 0xc8, 0x5b, 0x78, 0x67, 0x4d, 0xad, 0xfc, 0x7e, 0x14, 0x6f, 0x88,
      0x2b, 0x4f,
    ])
    const expectedShared = new Uint8Array([
      0x4a, 0x5d, 0x9d, 0x5b, 0xa4, 0xce, 0x2d, 0xe1, 0x72, 0x8e, 0x3b, 0xf4, 0x80, 0x35, 0x0f,
      0x25, 0xe0, 0x7e, 0x21, 0xc9, 0x47, 0xd1, 0x9e, 0x33, 0x76, 0xf0, 0x9b, 0x3c, 0x1e, 0x16,
      0x17, 0x42,
    ])

    const result = computeSharedPoint(alicePrivate, bobPublic)
    expect(result).toEqual(expectedShared)
  })
})
