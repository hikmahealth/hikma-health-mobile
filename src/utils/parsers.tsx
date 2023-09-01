/**
Parse Metadata strings and return the type T expected

@param {string} metadata
@returns {{result: T | string, error: Error | null}}
*/
export function parseMetadata<T>(metadata: string): { result: string, error: Error } | { result: T, error: null } {
  try {
    const result = JSON.parse(metadata)
    return {
      result,
      error: null
    }
  } catch (e) {
    return {
      result: metadata,
      error: e as Error
    }
  }
}
