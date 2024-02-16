/**
Method standardizes object and string metadata and returns the expected type T

@param {string | Object} metadata
@returns {{result: T | string, error: Error | null}}
*/
export function parseMetadata<T>(metadata: string | Object): { result: string, error: Error } | { result: T, error: null } {
  if (typeof metadata === "object") {
    return {
      result: metadata as T, // cast the metadata into the expected type for easy type inference
      error: null
    }
  }
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
