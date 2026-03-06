import { differenceInYears, differenceInMonths, differenceInDays, format, Locale } from "date-fns"
import * as locales from "date-fns/locale"
import i18nLib from "i18next"

type Options = Parameters<typeof format>[2]

/**
 * Returns the current locale. Defaults to en-US.
 */
const getLocale = (i18n: typeof i18nLib = i18nLib): Locale => {
  const locale = i18n.language.split("-")[0]
  // Create a mapping of locale codes to their corresponding date-fns locales
  const localeMap: Record<string, Locale> = {
    en: locales.enUS,
    ar: locales.arSA,
    // Add more mappings as needed
  }
  return localeMap[locale] || locales.enUS
}

/**
 * Returns a formatted date string in the current locale.
 * Falls back to en-US if the date is invalid.
 */
export function localeDate(
  date: Date | string | number | null | undefined,
  dateFormat = "MMM dd, yyyy",
  options: Options = {},
): string {
  if (date === null || date === undefined) return ""

  let dateObj: Date
  if (date instanceof Date) {
    dateObj = date
  } else if (typeof date === "number") {
    dateObj = new Date(date)
  } else if (typeof date === "string" && /^-?\d+$/.test(date.trim())) {
    dateObj = new Date(Number(date))
  } else {
    dateObj = new Date(date)
  }

  if (isNaN(dateObj.getTime())) {
    console.warn(`Invalid date provided to localeDate: ${date}, ${dateObj}`)
    return ""
  }

  return format(dateObj, dateFormat, { ...options, locale: getLocale() })
}

/**
 * Calculates the age from a date of birth.
 * @param dateOfBirth The date of birth.
 * @returns The age.
 */
export function calculateAge(dateOfBirth: Date | string | number | null): string {
  if (!dateOfBirth) return ""

  let dob: Date

  if (dateOfBirth instanceof Date) {
    dob = dateOfBirth
  } else if (typeof dateOfBirth === "number") {
    dob = new Date(dateOfBirth)
  } else if (typeof dateOfBirth === "string") {
    // Check if the string is in "YYYY-MM-DD" format
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth)) {
      dob = new Date(dateOfBirth)
    } else {
      // If not in "YYYY-MM-DD" format, try parsing as a regular date string
      dob = new Date(dateOfBirth)
    }
  } else {
    return ""
  }

  if (isNaN(dob.getTime())) {
    return ""
  }

  const now = new Date()
  const years = differenceInYears(now, dob)
  const months = differenceInMonths(now, dob) % 12
  const days = differenceInDays(now, dob) % 30 // Approximation, not exact

  let ageString = ""
  if (years > 0) ageString += `${years} year${years !== 1 ? "s" : ""}`
  if (months > 0) ageString += `${ageString ? ", " : ""}${months} month${months !== 1 ? "s" : ""}`
  if (days > 0 || ageString === "")
    ageString += `${ageString ? " and " : ""}${days} day${days !== 1 ? "s" : ""}`

  return ageString
}

/**
 * Given a string date of the format "YYYY-MM-DD" return a date object
 * @param dateStr The date string in "YYYY-MM-DD" format.
 * @param defaultReturn The default date to return if the input is invalid.
 * @returns The date object.
 */
export function parseYYYYMMDD<T>(dateStr: string | undefined, defaultReturn: T): Date | T {
  if (!dateStr) return defaultReturn

  // Check if it's YYYY-MM-DD format and parse manually to avoid timezone issues
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const [year, month, day] = dateStr.split("-").map(Number)
    if (isNaN(year) || isNaN(month) || isNaN(day)) return defaultReturn

    const date = new Date() // Preserves current time
    date.setFullYear(year)
    date.setMonth(month - 1)
    date.setDate(day)

    // Validation
    if (isNaN(date.getTime())) return defaultReturn
    if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
      return defaultReturn
    }
    return date
  }

  // Fallback for other date formats
  const dateObj = new Date(dateStr)
  if (!isNaN(dateObj.getTime())) return dateObj

  return defaultReturn
}

/**
 * Given an argument of an unknown type (hopefully a valid date object or unix epoch time), safely attempt to convert into a valid Date object.
 * If the operation is not possible, return either the default parameter passed as the second parameter, or return Invalid date
 *
 * @param input The potential date to be returned as a date object
 * @param defaultDate Optional default date object - must also be a valid date
 */
export function toDateSafe(input: unknown, defaultDate?: Date): Date {
  if (input instanceof Date) {
    return isNaN(input.getTime()) ? (defaultDate ?? new Date(NaN)) : input
  }

  if (typeof input === "number") {
    const date = new Date(input)
    return isNaN(date.getTime()) ? (defaultDate ?? new Date(NaN)) : date
  }

  if (typeof input === "string") {
    // First, attempt to parse as YYYY-MM-DD format (avoids timezone issues)
    const parsed = parseYYYYMMDD(input, null)
    if (parsed !== null) return parsed

    // Fallback to standard Date parsing
    const date = new Date(input)
    return isNaN(date.getTime()) ? (defaultDate ?? new Date(NaN)) : date
  }

  return defaultDate ?? new Date(NaN)
}
