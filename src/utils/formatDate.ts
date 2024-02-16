import { Locale, format, parseISO, isValid } from "date-fns"
import { i18n } from "../i18n"

import ar from "date-fns/locale/ar-SA"
// import ko from "date-fns/locale/ko"
import en from "date-fns/locale/en-US"
import es from "date-fns/locale/es"

type Options = Parameters<typeof format>[2]

const getLocale = (): Locale => {
  const locale = i18n.currentLocale().split('-')[0];
  // return locale === 'ar' ? ar : locale === 'ko' ? ko : en;
  switch (locale) {
    case "ar":
      return ar
    case "es":
      return es
    case "en":
    default:
      return en
  }
};

// export const formatDate = (
//   date: string,
//   dateFormat?: string,
//   options?: Options,
// ) => {
//   // const locale = getLocale();

//   const locale = i18n.locale.split("-")[0]
//   const dateOptions = {
//     ...options,
//     locale,
//   };
//   return format(parseISO(date), dateFormat ?? 'MMM dd, yyyy', dateOptions);
// };

export function localeDate(date: Date, dateFormat: string = "MMM dd, yyyy", options: Options = {}): string {
  // console.log(getLocale())
  return format(
    date,
    dateFormat,
    { ...options, locale: getLocale() }
  )
}


/**
Given an object that contains datestring fields, or strings that compose a valid date, 
format them into a Date object

@param {Record<string, any>}
@returns {T}
*/
export function formatDateStrings<T>(obj: any): T {
  const newObj = { ...obj }
  Object.keys(newObj).forEach((key) => {
    const value = newObj[key]
    if (value && typeof value === "string" && (value.includes("/") || value.includes("-"))) {
      newObj[key] = isValid(new Date(value)) ? new Date(value) : value
    }
  })
  return newObj
}

