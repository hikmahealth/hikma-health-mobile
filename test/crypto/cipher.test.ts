import fc from "fast-check"
import { seal, open, type AadTag } from "../../app/crypto/cipher"
import { randomBytes } from "@noble/ciphers/utils"

/** Generate a random 32-byte key for testing */
function randomKey(): Uint8Array {
  return randomBytes(32)
}

const aadArb = fc.constantFrom<AadTag>("command", "query", "command_response", "query_response")

describe("crypto/cipher", () => {
  it("roundtrips arbitrary plaintext", () => {
    fc.assert(
      fc.property(
        fc.uint8Array({ minLength: 0, maxLength: 1024 }),
        aadArb,
        (plaintext, aad) => {
          const key = randomKey()
          const sealed = seal(key, plaintext, aad)
          const opened = open(key, sealed, aad)
          expect(opened).toEqual(plaintext)
        },
      ),
    )
  })

  it("wrong key returns null", () => {
    fc.assert(
      fc.property(
        fc.uint8Array({ minLength: 1, maxLength: 256 }),
        aadArb,
        (plaintext, aad) => {
          const key1 = randomKey()
          const key2 = randomKey()
          const sealed = seal(key1, plaintext, aad)
          expect(open(key2, sealed, aad)).toBeNull()
        },
      ),
    )
  })

  it("wrong AAD returns null", () => {
    const key = randomKey()
    const plaintext = new Uint8Array([1, 2, 3, 4])
    const sealed = seal(key, plaintext, "command")
    expect(open(key, sealed, "query")).toBeNull()
  })

  it("each seal produces a unique nonce (50 seals are distinct)", () => {
    const key = randomKey()
    const plaintext = new Uint8Array([42])
    const nonces = new Set<string>()

    for (let i = 0; i < 50; i++) {
      const sealed = seal(key, plaintext, "command")
      // Extract the 12-byte nonce from the front
      const nonce = Array.from(sealed.slice(0, 12)).join(",")
      nonces.add(nonce)
    }

    expect(nonces.size).toBe(50)
  })

  it("returns null for truncated ciphertext", () => {
    const key = randomKey()
    // Less than nonce(12) + tag(16) = 28 bytes
    expect(open(key, new Uint8Array(10), "command")).toBeNull()
  })
})
