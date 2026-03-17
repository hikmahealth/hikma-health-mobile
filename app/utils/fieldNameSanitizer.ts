/**
 * react-hook-form's internal `stringToPath` parses field names with:
 *
 *   input.replace(/["|']|\]/g, '').split(/\.|\[/)
 *
 * Characters STRIPPED (removed silently): " ' | ]
 * Characters SPLIT ON (path separators): . [
 *
 * Any of these in a field name will cause the stored key to diverge from
 * the original name, breaking lookups during validation / submission.
 *
 * These utilities replace every problematic character with a unique Unicode
 * placeholder so field names round-trip safely through react-hook-form.
 */

const REPLACEMENTS: [string, string][] = [
  // split-on characters (path separators)
  [".", "〔dot〕"],
  ["[", "〔lbracket〕"],
  // stripped characters
  ["|", "〔pipe〕"],
  ["]", "〔rbracket〕"],
  ['"', "〔dquote〕"],
  ["'", "〔squote〕"],
]

/** Replace problematic characters in a field name so react-hook-form treats it as a flat key. */
export const sanitizeFieldName = (name: string): string =>
  REPLACEMENTS.reduce((acc, [char, placeholder]) => acc.replaceAll(char, placeholder), name)

/** Restore original characters in a single sanitized field name. */
export const unsanitizeFieldName = (name: string): string =>
  REPLACEMENTS.reduce((acc, [char, placeholder]) => acc.replaceAll(placeholder, char), name)

/**
 * Given a flat record with sanitized keys, return a new record with original
 * keys restored.
 */
export const unsanitizeFormData = <T>(data: Record<string, T>): Record<string, T> => {
  const result: Record<string, T> = {}
  for (const key of Object.keys(data)) {
    result[unsanitizeFieldName(key)] = data[key]
  }
  return result
}
