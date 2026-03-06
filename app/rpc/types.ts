/**
 * Shared protocol types used by both hub and cloud RPC transports.
 */

/** Result type for all RPC operations */
export type RpcResult<T> = { ok: true; data: T } | { ok: false; error: RpcError }

export type RpcError = {
  code:
    | "HANDSHAKE_FAILED"
    | "ENCRYPTION_FAILED"
    | "DECRYPTION_FAILED"
    | "NETWORK_ERROR"
    | "AUTH_FAILED"
    | "HUB_UNREACHABLE"
    | "SESSION_EXPIRED"
  message: string
}

/** Login response — same shape from both hub and cloud */
export type LoginResponse = {
  token: string
  user_id: string
  clinic_id: string
  role: string
  provider_name?: string
  email?: string
}

/** QR code discriminated union */
export type HubQRData = { type: "sync_hub"; url: string; id: string; pk: string } // id: unique identifier for the sync hub, and pk: the public key
export type CloudQRData = { type: "cloud"; url: string }
export type QRData = HubQRData | CloudQRData

/** Hub handshake response */
export type HandshakeResponse = {
  hub_public_key: string // base64url
  hub_id: string
  hub_name: string
  success: boolean
}
