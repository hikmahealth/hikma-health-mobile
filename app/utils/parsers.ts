import Language from "@/models/Language"

/**
Method standardizes object and string metadata and returns the expected type T

@param {string | Object} metadata
@returns {{result: T | string, error: Error | null}}
*/
export function parseMetadata<T>(
  metadata: string | object,
): { result: string; error: Error } | { result: T; error: null } {
  if (typeof metadata === "object") {
    return {
      result: metadata as T, // cast the metadata into the expected type for easy type inference
      error: null,
    }
  }
  try {
    const result = JSON.parse(metadata)
    return {
      result,
      error: null,
    }
  } catch (e) {
    return {
      result: metadata,
      error: e as Error,
    }
  }
}

/**
Given a translation object and a language key to, return that language label, or default to the english version.
If the english version does not exist, return any.

@param {TranslationObject} translations
@param {string} language
@return {string} translation
*/
export function getTranslation(translations: Language.TranslationObject, language: string): string {
  const translationKeys = Object.keys(translations)

  // in the case of no translations, return an empty string
  if (translationKeys.length === 0) {
    return ""
  }
  if (language in translations) {
    return translations[language]
  } else if (translations.en) {
    return translations.en
  } else {
    return translations[translationKeys[0]]
  }
}

/*
Normalize Arabic text to remove extra characters and spaces
*/
export function normalizeArabic(text: string): string {
  return text
    .replace(/[يى]/g, "ی")
    .replace(/[أإآا]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ئ/g, "ی")
    .replace(/ؤ/g, "و")
    .replace(/[ءٔ]/g, "")
    .replace(/\s+/g, " ")
    .trim()
}

/**
 * Sanitize a string to be used in a LIKE query
 * @param value - The string to sanitize
 * @returns The sanitized string
 */
const safeLikeCharsRegexp = /[^\p{L}\p{N}]/gu

export function extendedSanitizeLikeString(value: string): string {
  invariant(typeof value === "string", "Value passed to Q.sanitizeLikeString() is not a string")
  return value.replace(safeLikeCharsRegexp, "_")
}

export default function invariant(condition: any, errorMessage?: string): void {
  if (!condition) {
    const error: any = new Error(errorMessage || "Broken invariant")
    error.framesToPop = 1
    throw error
  }
}

/**
 * Safely stringifies an object or returns the input if it's already a string.
 * If input is a string that appears to be JSON, it will be parsed and re-stringified.
 *
 * @param {unknown} input - The input to stringify or return
 * @param {string} defaultValue - The default value to return if stringification fails
 * @returns {string} The stringified object or the default value
 */
export function safeStringify(input: unknown, defaultValue: string): string {
  if (input === undefined || input === null) {
    return defaultValue
  }

  if (typeof input === "string") {
    try {
      // Check if the string is valid JSON by attempting to parse it
      const parsed = JSON.parse(input)
      return JSON.stringify(parsed)
    } catch (error) {
      // If it's not valid JSON, return the original string
      return input
    }
  }

  try {
    return JSON.stringify(input)
  } catch (error) {
    return defaultValue
  }
}
