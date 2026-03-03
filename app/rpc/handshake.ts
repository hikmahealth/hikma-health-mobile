/**
 * Hub-specific ECDH handshake.
 * Generates a client keypair, sends client public key to the hub,
 * receives hub public key, and derives a shared session key.
 */

import { generateKeyPair, computeSharedPoint, deriveSessionKey } from "../crypto/keys"
import { encode, decode } from "../crypto/encoding"
import type { RpcResult, HandshakeResponse } from "./types"

/** Represents an active session with a hub */
export type HubSession = {
  readonly hubUrl: string
  readonly hubId: string
  readonly hubName: string
  readonly clientId: string
  readonly sharedKey: Uint8Array // 32-byte AES key
  readonly token: string | null
}

/**
 * Perform the ECDH handshake with a hub.
 *
 * 1. Generate client X25519 keypair
 * 2. POST client public key to /rpc/handshake
 * 3. Receive hub public key
 * 4. Derive shared AES-256 key via HKDF
 */
export async function performHandshake(
  hubUrl: string,
  clientId: string,
): Promise<RpcResult<HubSession>> {
  try {
    const { privateKey, publicKey } = generateKeyPair()

    const response = await fetch(`${hubUrl}/rpc/handshake`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: clientId,
        client_public_key: encode(publicKey),
      }),
    })

    if (!response.ok) {
      return {
        ok: false,
        error: {
          code: "HUB_UNREACHABLE",
          message: `Handshake failed with HTTP ${response.status}`,
        },
      }
    }

    const result: HandshakeResponse = await response.json()

    if (!result.success || !result.hub_public_key || !result.hub_id) {
      return {
        ok: false,
        error: { code: "HANDSHAKE_FAILED", message: "Invalid handshake response from hub" },
      }
    }

    const hubPublicKey = decode(result.hub_public_key)
    const sharedPoint = computeSharedPoint(privateKey, hubPublicKey)
    const sharedKey = deriveSessionKey(sharedPoint, hubPublicKey, publicKey)

    return {
      ok: true,
      data: {
        hubUrl,
        hubId: result.hub_id,
        hubName: result.hub_name,
        clientId,
        sharedKey,
        token: null,
      },
    }
  } catch (e) {
    return {
      ok: false,
      error: { code: "HUB_UNREACHABLE", message: String(e) },
    }
  }
}
