import I18n from "i18n-js"

// Note the syntax of these imports from the date-fns library.
// If you import with the syntax: import { format } from "date-fns" the ENTIRE library
// will be included in your production bundle (even if you only use one function).
// This is because react-native does not support tree-shaking.
import type { Locale } from "date-fns"
import { format, parseISO } from "date-fns"
import { ar, ko, enUS } from "date-fns/locale"

type Options = Parameters<typeof format>[2]

const getLocale = (): Locale => {
  // const locale = I18n.currentLocale()?.split("-")[0]
  const locale = I18n.locale?.split("-")[0]
  return locale === "ar" ? ar : locale === "ko" ? ko : enUS
}

export const formatDate = (date: string, dateFormat?: string, options?: Options) => {
  const locale = getLocale()
  const dateOptions = {
    ...options,
    locale,
  }
  return format(parseISO(date), dateFormat ?? "MMM dd, yyyy", dateOptions)
}
