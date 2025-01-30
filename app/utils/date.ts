import i18nLib from "i18next"
import * as locales from "date-fns/locale"
import { differenceInYears, differenceInMonths, differenceInDays, format, Locale } from "date-fns"

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
 * @param {Date} date The date to format.
 * @param {string} dateFormat The date format.
 * @param {Options} options The date-fns options.
 * @returns {string} The formatted date string.
 */
export function localeDate(date: Date, dateFormat = "MMM dd, yyyy", options: Options = {}): string {
  // console.log(getLocale())
  return format(date, dateFormat, { ...options, locale: getLocale() })
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
