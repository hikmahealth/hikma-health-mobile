/**
 * @deprecated Used only by the deprecated onlineProvider.ts. Kept for rollback.
 *
 * Thin tRPC-over-HTTP helper. Calls tRPC mutations via POST through
 * the existing HttpClient. No @trpc/client dependency.
 */

import type { HttpClient, HttpResponse } from "./httpClient"

/**
 * Call a tRPC mutation via HTTP POST.
 * @param httpClient - The HTTP client to use
 * @param procedure - Procedure name (e.g., "patients.create")
 * @param input - The procedure input
 */
export async function trpcMutate<TInput, TOutput>(
  httpClient: HttpClient,
  procedure: string,
  input: TInput,
): Promise<HttpResponse<TOutput>> {
  console.log(`[tRPC] ${procedure}`, input)
  const response = await httpClient.post<TOutput>(`/api/trpc/${procedure}`, input)
  return response
}
