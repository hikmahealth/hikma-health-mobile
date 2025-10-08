import { upperFirst } from "es-toolkit"

/**
 * Converts an array of strings to an array of option objects with label and value properties.
 * @param strings - Array of strings to convert to options
 * @param format - Whether to capitalize the first letter of each string for the label (default: true)
 * @returns Array of objects with label and value properties
 */
export function stringsListToOptions(strings: string[], format = true) {
  return strings.map((string) => {
    return {
      label: format ? upperFirst(string) : string,
      value: string,
    }
  })
}

/**
 * Converts a string to a friendly string.
 * @param string - String to convert to friendly string
 * @returns Friendly string
 */
export function friendlyString(string: string) {
  return string.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase())
}
