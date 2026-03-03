/**
 * Pluggable transport abstraction for RPC communication.
 *
 * Both hub (AES-GCM encrypted over HTTP) and cloud (plain JSON over HTTPS)
 * implement the same RpcTransport interface. This allows the rpcProvider
 * to work identically with either backend.
 */

import type { RpcResult, RpcError, LoginResponse } from "./types"
import type { HubSession } from "./handshake"
import { encryptForWire, decryptFromWire } from "./wire"

/**
 * Transport defines how command/query payloads are sent and received.
 * Hub: AES-GCM encrypted payloads over HTTP
 * Cloud: plain JSON with Bearer auth over HTTPS
 */
export type RpcTransport = {
  sendCommand: <T>(command: string, data: object, token?: string) => Promise<RpcResult<T>>
  sendQuery: <T>(query: string, params: object, token?: string) => Promise<RpcResult<T>>
  login: (email: string, password: string) => Promise<RpcResult<LoginResponse>>
  heartbeat: () => Promise<boolean>
}

function rpcError(code: RpcError["code"], message: string): RpcResult<never> {
  return { ok: false, error: { code, message } }
}

/**
 * Create an encrypted transport for hub communication.
 * Encrypts request payloads with AES-GCM, decrypts responses.
 */
export function createEncryptedTransport(session: HubSession): RpcTransport {
  const { hubUrl, clientId, sharedKey, token: sessionToken } = session

  return {
    async sendCommand<T>(
      command: string,
      data: object,
      token = sessionToken,
    ): Promise<RpcResult<T>> {
      try {
        const body = encryptForWire(sharedKey, clientId, { command, data, token }, "command")
        const response = await fetch(`${hubUrl}/rpc/command`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        })
        if (!response.ok) {
          if (response.status === 401) return rpcError("AUTH_FAILED", "Unauthorized")
          return rpcError("NETWORK_ERROR", `HTTP ${response.status}`)
        }
        const json = await response.json()
        const decrypted = decryptFromWire(sharedKey, json.payload, "command_response")
        if (!decrypted) return rpcError("DECRYPTION_FAILED", "Failed to decrypt command response")
        return { ok: true, data: decrypted as T }
      } catch (e) {
        return rpcError("NETWORK_ERROR", String(e))
      }
    },

    async sendQuery<T>(query: string, params: object, token = sessionToken): Promise<RpcResult<T>> {
      try {
        const body = encryptForWire(sharedKey, clientId, { query, params, token }, "query")
        const response = await fetch(`${hubUrl}/rpc/query`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        })
        console.debug("[RpcTransport:hub] sendQuery response received", {
          query,
          status: response.status,
        })
        if (!response.ok) {
          if (response.status === 401) {
            console.warn("[RpcTransport:hub] sendQuery auth failed", {
              query,
              status: response.status,
            })
            return rpcError("AUTH_FAILED", "Unauthorized")
          }
          console.warn("[RpcTransport:hub] sendQuery HTTP error", {
            query,
            status: response.status,
          })
          return rpcError("NETWORK_ERROR", `HTTP ${response.status}`)
        }
        const json = await response.json()
        const decrypted = decryptFromWire(sharedKey, json.payload, "query_response")
        if (!decrypted) {
          console.error("[RpcTransport:hub] sendQuery decryption failed", { query })
          return rpcError("DECRYPTION_FAILED", "Failed to decrypt query response")
        }
        console.debug("[RpcTransport:hub] sendQuery completed successfully", { query })
        return { ok: true, data: decrypted as T }
      } catch (e) {
        console.error("[RpcTransport:hub] sendQuery exception", { query, error: String(e) })
        return rpcError("NETWORK_ERROR", String(e))
      }
    },

    async login(email: string, password: string): Promise<RpcResult<LoginResponse>> {
      return this.sendCommand<LoginResponse>("login", { email, password })
    },

    async heartbeat(): Promise<boolean> {
      try {
        const response = await fetch(`${hubUrl}/rpc/heartbeat`, { method: "GET" })
        return response.ok
      } catch {
        return false
      }
    },
  }
}

/**
 * Create a plain JSON transport for cloud communication.
 * Sends/receives plain JSON with Bearer auth over HTTPS.
 */
export function createCloudTransport(baseUrl: string, getAuth: () => string): RpcTransport {
  return {
    async sendCommand<T>(command: string, data: object, _token?: string): Promise<RpcResult<T>> {
      try {
        const response = await fetch(`${baseUrl}/rpc/command`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": getAuth(),
          },
          body: JSON.stringify({ command, data }),
        })
        if (!response.ok) {
          if (response.status === 401) return rpcError("AUTH_FAILED", "Unauthorized")
          return rpcError("NETWORK_ERROR", `HTTP ${response.status}`)
        }
        const json = await response.json()
        return { ok: true, data: json as T }
      } catch (e) {
        return rpcError("NETWORK_ERROR", String(e))
      }
    },

    async sendQuery<T>(query: string, params: object, _token?: string): Promise<RpcResult<T>> {
      try {
        const response = await fetch(`${baseUrl}/rpc/query`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": getAuth(),
          },
          body: JSON.stringify({ query, params }),
        })
        if (!response.ok) {
          if (response.status === 401) return rpcError("AUTH_FAILED", "Unauthorized")
          return rpcError("NETWORK_ERROR", `HTTP ${response.status}`)
        }
        const json = await response.json()
        return { ok: true, data: json as T }
      } catch (e) {
        return rpcError("NETWORK_ERROR", String(e))
      }
    },

    async login(email: string, password: string): Promise<RpcResult<LoginResponse>> {
      try {
        const response = await fetch(`${baseUrl}/rpc/command`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ command: "login", data: { email, password } }),
        })
        if (!response.ok) {
          if (response.status === 401) return rpcError("AUTH_FAILED", "Invalid credentials")
          return rpcError("NETWORK_ERROR", `HTTP ${response.status}`)
        }
        const json = await response.json()
        return { ok: true, data: json as LoginResponse }
      } catch (e) {
        return rpcError("NETWORK_ERROR", String(e))
      }
    },

    async heartbeat(): Promise<boolean> {
      try {
        const response = await fetch(`${baseUrl}/rpc/heartbeat`, {
          method: "GET",
          headers: { Authorization: getAuth() },
        })
        return response.ok
      } catch {
        return false
      }
    },
  }
}
