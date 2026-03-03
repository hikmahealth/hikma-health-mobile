/**
 * @deprecated Used only by the deprecated onlineProvider.ts. Kept for rollback.
 *
 * Injectable HTTP client for the online provider.
 * Wraps apisauce for testability — tests can mock the HttpClient type directly.
 */

import { create, ApisauceInstance } from "apisauce"

export type HttpResponse<T> =
  | { ok: true; data: T; status: number }
  | { ok: false; error: { message: string; statusCode: number }; status: number }

export type HttpClient = {
  get: <T>(url: string, params?: Record<string, any>) => Promise<HttpResponse<T>>
  post: <T>(url: string, body?: Record<string, any>) => Promise<HttpResponse<T>>
  put: <T>(url: string, body?: Record<string, any>) => Promise<HttpResponse<T>>
  delete: <T>(url: string, params?: Record<string, any>) => Promise<HttpResponse<T>>
}

/**
 * Create an HTTP client backed by apisauce.
 * @param baseUrl - API base URL
 * @param getAuthHeader - Returns the Basic Auth header value (e.g. "Basic base64(email:pass)")
 */
export function createApisauceClient(baseUrl: string, getAuthHeader: () => string): HttpClient {
  const instance: ApisauceInstance = create({
    baseURL: baseUrl,
    timeout: 15000,
    headers: { Accept: "application/json" },
  })

  // Attach auth header to every request
  instance.addRequestTransform((request) => {
    request.headers = request.headers ?? {}
    const auth = getAuthHeader()
    request.headers["Authorization"] = auth
    if (__DEV__) {
      console.log(`[HttpClient] ${request.method?.toUpperCase()} ${request.url}`, {
        hasAuth: auth.length > 0,
        baseURL: baseUrl,
      })
    }
  })

  function mapResponse<T>(response: Awaited<ReturnType<ApisauceInstance["get"]>>): HttpResponse<T> {
    if (response.ok && response.data !== undefined) {
      if (__DEV__) console.log(`[HttpClient] Response OK — status: ${response.status}`)
      return { ok: true, data: response.data as T, status: response.status ?? 200 }
    }
    const errorMsg = (response.data as any)?.error ?? response.problem ?? "Unknown error"
    if (__DEV__) {
      console.warn(
        `[HttpClient] Response FAIL — status: ${response.status}, problem: ${response.problem}, error: ${errorMsg}`,
      )
    }
    return {
      ok: false,
      error: {
        message: errorMsg,
        statusCode: response.status ?? 0,
      },
      status: response.status ?? 0,
    }
  }

  return {
    get: async <T>(url: string, params?: Record<string, any>) =>
      mapResponse<T>(await instance.get(url, params)),
    post: async <T>(url: string, body?: Record<string, any>) =>
      mapResponse<T>(await instance.post(url, body)),
    put: async <T>(url: string, body?: Record<string, any>) =>
      mapResponse<T>(await instance.put(url, body)),
    delete: async <T>(url: string, params?: Record<string, any>) =>
      mapResponse<T>(await instance.delete(url, params)),
  }
}
