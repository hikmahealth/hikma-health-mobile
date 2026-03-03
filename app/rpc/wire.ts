/**
 * Wire format helpers for the encrypted RPC transport.
 * Serializes JSON payloads, encrypts them, and encodes for HTTP transport.
 */

import { seal, open, type AadTag } from "../crypto/cipher"
import { encode, decode, utf8Encode, utf8Decode } from "../crypto/encoding"

/** Encrypted wire payload sent to the hub */
export type WirePayload = {
  client_id: string
  payload: string // base64url-encoded encrypted data
}

/**
 * Encrypt a JSON-serializable object for wire transport.
 * @returns WirePayload with client_id and base64url-encoded encrypted payload
 */
export function encryptForWire(
  key: Uint8Array,
  clientId: string,
  jsonData: object,
  aad: AadTag,
): WirePayload {
  const plaintext = utf8Encode(JSON.stringify(jsonData))
  const sealed = seal(key, plaintext, aad)
  return {
    client_id: clientId,
    payload: encode(sealed),
  }
}

/**
 * Decrypt a base64url-encoded wire payload back to a JSON object.
 * @returns Parsed JSON object on success, null on decryption failure
 */
export function decryptFromWire(
  key: Uint8Array,
  payloadBase64: string,
  aad: AadTag,
): object | null {
  try {
    const sealed = decode(payloadBase64)
    const plaintext = open(key, sealed, aad)
    if (!plaintext) return null
    return JSON.parse(utf8Decode(plaintext))
  } catch {
    return null
  }
}
