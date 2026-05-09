/**
 * QR code parsing for hub and cloud connections.
 *
 * Hub QR: JSON object with { type: "sync_hub", url: "http://..." }
 * Cloud QR: Plain URL string (https://...)
 */

import type { QRData, HubQRData, CloudQRData } from "./types"

/**
 * Parse a QR code data string into either a HubQRData or CloudQRData.
 * Returns null if the data is not a valid QR code for either type.
 */
export function parseQRCode(data: string): QRData | null {
  if (!data || typeof data !== "string") return null

  // Try JSON parse for hub format
  try {
    const parsed = JSON.parse(data)
    if (
      parsed &&
      typeof parsed === "object" &&
      parsed.type === "sync_hub" &&
      typeof parsed.url === "string" &&
      parsed.url.length > 0
    ) {
      return { type: "sync_hub", url: parsed.url, id: parsed.id, pk: parsed.pk }
    }
  } catch {
    // Not JSON — fall through to cloud check
  }

  // Plain URL string → cloud (HTTPS only to prevent credential leakage over HTTP)
  if (data.startsWith("https://")) {
    return { type: "cloud", url: data }
  }

  return null
}

/** Type guard: is this a hub QR code? */
export function isHubQR(qr: QRData): qr is HubQRData {
  return qr.type === "sync_hub"
}

/** Type guard: is this a cloud QR code? */
export function isCloudQR(qr: QRData): qr is CloudQRData {
  return qr.type === "cloud"
}
