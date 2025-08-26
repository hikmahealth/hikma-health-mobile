import * as Sentry from "@sentry/react-native"
/**
 * A sanitizer function for the metadata JSON field.
 * It ensures that the stored value is always a valid JSON string.
 * If the input is an object, it's stringified. If it's an invalid
 * JSON string or another data type, it defaults to an empty object string '{}'.
 * @param rawJson The raw input to be sanitized.
 * @returns A valid JSON string.
 */
export function sanitizeMetadata(rawJson: any): string {
  if (typeof rawJson === "object" && rawJson !== null) {
    // If it's already an object, stringify it
    return JSON.stringify(rawJson)
  }
  if (typeof rawJson === "string") {
    // If it's a string, try to parse it to ensure it's valid JSON.
    // If it is, we can return it as is or re-stringify to normalize formatting.
    // If not, we return a default empty object string.
    try {
      JSON.parse(rawJson)
      return rawJson // It's a valid JSON string
    } catch (error) {
      Sentry.captureException(error)
      console.error(error)
      return "{}" // Not a valid JSON string
    }
  }
  // For any other type (null, undefined, number, etc.), default to an empty object.
  return "{}"
}
