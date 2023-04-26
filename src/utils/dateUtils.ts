import { differenceInCalendarYears, differenceInYears, intervalToDuration, parse } from "date-fns"

export function calculateAgeInYears(dob: Date): number {
  const age = differenceInYears(new Date(), dob)
  return age
}
