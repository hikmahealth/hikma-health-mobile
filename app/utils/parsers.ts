import { TranslationObject } from "app/types"

/**
Method standardizes object and string metadata and returns the expected type T

@param {string | Object} metadata
@returns {{result: T | string, error: Error | null}}
*/
export function parseMetadata<T>(
  metadata: string | Object,
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
export function getTranslation(translations: TranslationObject, language: string): string {
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
