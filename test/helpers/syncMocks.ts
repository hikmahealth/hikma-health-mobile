/**
 * Shared mock setup for tests that import from app/db/sync.ts.
 *
 * Usage: Import this file at the top of your test (before the module under test)
 * or call the mocks inline. Jest hoists jest.mock() calls regardless of import order,
 * but the factory functions here can be referenced from test files.
 *
 * NOTE: Jest requires jest.mock() calls to be at the top level of the test file.
 * This module only exports helpers and constants — the actual jest.mock() calls
 * must still live in each test file.
 */

/**
 * A minimal safeStringify implementation for test mocks.
 * Mirrors the real implementation closely enough for sync tests.
 */
export function mockSafeStringify(v: unknown, d: string): string {
  if (v === undefined || v === null || v === "") return d
  if (typeof v === "string") {
    try {
      return JSON.stringify(JSON.parse(v))
    } catch {
      return JSON.stringify(v)
    }
  }
  try {
    return JSON.stringify(v)
  } catch {
    return d
  }
}
