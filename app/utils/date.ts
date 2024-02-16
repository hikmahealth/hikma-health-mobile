import { i18n as i18nLib } from "../i18n"
import * as locales from "date-fns/locale"
import { format } from "date-fns"

type Options = Parameters<typeof format>[2]

/**
 * Returns the current locale. Defaults to en-US.
 */
const getLocale = (i18n: typeof i18nLib = i18nLib): Locale => {
  const locale = i18n.currentLocale().split("-")[0] as unknown as string
  const dateFnsLocale = locales[locale] || locales.enUS
  return dateFnsLocale
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
