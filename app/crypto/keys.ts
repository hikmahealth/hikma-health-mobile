/**
 * X25519 ECDH key exchange + HKDF-SHA256 key derivation.
 * Uses @noble/curves for X25519 and @noble/hashes for HKDF.
 */

import { x25519 } from "@noble/curves/ed25519"
import { hkdf } from "@noble/hashes/hkdf"
import { sha256 } from "@noble/hashes/sha2"
import { utf8Encode } from "./encoding"

const HKDF_SALT = utf8Encode("hikma-health-pairing-v1")

/** Generate an X25519 keypair (32-byte private key, 32-byte public key) */
export function generateKeyPair(): { privateKey: Uint8Array; publicKey: Uint8Array } {
  const { secretKey, publicKey } = x25519.keygen()
  return { privateKey: secretKey, publicKey }
}

/**
 * Compute the raw X25519 shared point.
 * Rejects all-zero output (low-order point attack).
 */
export function computeSharedPoint(
  ourPrivateKey: Uint8Array,
  theirPublicKey: Uint8Array,
): Uint8Array {
  const shared = x25519.getSharedSecret(ourPrivateKey, theirPublicKey)

  // Reject all-zero result (low-order point)
  let allZero = true
  for (let i = 0; i < shared.length; i++) {
    if (shared[i] !== 0) {
      allZero = false
      break
    }
  }
  if (allZero) {
    throw new Error("X25519 shared secret is all zeros — possible low-order point attack")
  }

  return shared
}

/**
 * Derive a 32-byte AES session key from the raw shared point using HKDF-SHA256.
 *
 * @param sharedPoint - Raw X25519 shared secret
 * @param hubPublicKey - Hub's public key (used in info)
 * @param clientPublicKey - Client's public key (used in info)
 * @returns 32-byte derived key suitable for AES-256-GCM
 */
export function deriveSessionKey(
  sharedPoint: Uint8Array,
  hubPublicKey: Uint8Array,
  clientPublicKey: Uint8Array,
): Uint8Array {
  // info = hubPub || clientPub
  const info = new Uint8Array(hubPublicKey.length + clientPublicKey.length)
  info.set(hubPublicKey, 0)
  info.set(clientPublicKey, hubPublicKey.length)

  return hkdf(sha256, sharedPoint, HKDF_SALT, info, 32)
}
