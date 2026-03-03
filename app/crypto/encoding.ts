/**
 * Base64url-no-pad encoding/decoding using @scure/base.
 * Used for encoding cryptographic keys and encrypted payloads on the wire.
 */

import { base64urlnopad } from "@scure/base"

const encoder = new TextEncoder()
const decoder = new TextDecoder()

/** Encode raw bytes to base64url without padding */
export function encode(data: Uint8Array): string {
  return base64urlnopad.encode(data)
}

/** Decode base64url-no-pad string back to raw bytes */
export function decode(encoded: string): Uint8Array {
  return base64urlnopad.decode(encoded)
}

/** Encode a UTF-8 string to bytes */
export function utf8Encode(text: string): Uint8Array {
  return encoder.encode(text)
}

/** Decode bytes to a UTF-8 string */
export function utf8Decode(data: Uint8Array): string {
  return decoder.decode(data)
}
