/**
 * AES-256-GCM seal/open using @noble/ciphers.
 * Nonce is 12 random bytes prepended to the ciphertext.
 * Wire format: nonce(12B) || ciphertext || tag(16B)
 */

import { gcm } from "@noble/ciphers/aes"
import { randomBytes } from "@noble/ciphers/utils"
import { utf8Encode } from "./encoding"

const NONCE_LENGTH = 12

export type AadTag = "command" | "query" | "command_response" | "query_response"

/**
 * Encrypt plaintext with AES-256-GCM.
 * @returns nonce(12B) || ciphertext || tag(16B)
 */
export function seal(key: Uint8Array, plaintext: Uint8Array, aad: AadTag): Uint8Array {
  const nonce = randomBytes(NONCE_LENGTH)
  const aadBytes = utf8Encode(aad)
  const cipher = gcm(key, nonce, aadBytes)
  const ciphertext = cipher.encrypt(plaintext)

  // Prepend nonce: nonce || ciphertext+tag
  const sealed = new Uint8Array(NONCE_LENGTH + ciphertext.length)
  sealed.set(nonce, 0)
  sealed.set(ciphertext, NONCE_LENGTH)
  return sealed
}

/**
 * Decrypt AES-256-GCM sealed data.
 * @returns plaintext on success, null on authentication failure
 */
export function open(key: Uint8Array, sealed: Uint8Array, aad: AadTag): Uint8Array | null {
  if (sealed.length < NONCE_LENGTH + 16) return null // Too short: need nonce + at least tag

  const nonce = sealed.slice(0, NONCE_LENGTH)
  const ciphertext = sealed.slice(NONCE_LENGTH)
  const aadBytes = utf8Encode(aad)

  try {
    const cipher = gcm(key, nonce, aadBytes)
    return cipher.decrypt(ciphertext)
  } catch {
    return null
  }
}
