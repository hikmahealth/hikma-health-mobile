import fc from "fast-check"
import { encryptForWire, decryptFromWire } from "../../app/rpc/wire"
import { randomBytes } from "@noble/ciphers/utils"
import type { AadTag } from "../../app/crypto/cipher"

const aadArb = fc.constantFrom<AadTag>("command", "query", "command_response", "query_response")

/** Arbitrary JSON-serializable objects */
const jsonArb = fc.dictionary(fc.string(), fc.oneof(fc.string(), fc.integer(), fc.boolean()))

describe("rpc/wire", () => {
  it("roundtrips arbitrary JSON data", () => {
    fc.assert(
      fc.property(jsonArb, aadArb, (data, aad) => {
        const key = randomBytes(32)
        const clientId = "test-client"
        const wire = encryptForWire(key, clientId, data, aad)
        expect(wire.client_id).toBe(clientId)
        expect(typeof wire.payload).toBe("string")

        const decrypted = decryptFromWire(key, wire.payload, aad)
        expect(decrypted).toEqual(data)
      }),
    )
  })

  it("wrong key returns null", () => {
    const key1 = randomBytes(32)
    const key2 = randomBytes(32)
    const wire = encryptForWire(key1, "client", { hello: "world" }, "command")
    expect(decryptFromWire(key2, wire.payload, "command")).toBeNull()
  })

  it("wrong AAD returns null", () => {
    const key = randomBytes(32)
    const wire = encryptForWire(key, "client", { hello: "world" }, "command")
    expect(decryptFromWire(key, wire.payload, "query")).toBeNull()
  })

  it("invalid base64 returns null", () => {
    const key = randomBytes(32)
    expect(decryptFromWire(key, "!!!not-valid-base64!!!", "command")).toBeNull()
  })
})
