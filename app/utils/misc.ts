import Appointment from "@/models/Appointment"
import Prescription from "@/models/Prescription"
import PrescriptionItem from "@/models/PrescriptionItem"
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

/**
 * Given a string and an array of strings, return an array that either includes the new string if it was not there in the first place, or return an array that filters it out if it was already there.
 * @param string - String to add or remove from the array
 * @param array - Array of strings to modify
 * @returns Array of strings with the new string added or removed
 */
export function toggleStringInArray(string: string, array: string[]): string[] {
  if (array.includes(string)) {
    return array.filter((item) => item !== string)
  } else {
    return [...array, string]
  }
}

/**
 * Checks if an email address is valid.
 * @param {string} email - the email address to validate
 * @returns {boolean} - true if the email is valid, false otherwise
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

// export const Status = {
//   PENDING: "pending",
//   SCHEDULED: "scheduled",
//   CHECKED_IN: "checked_in",
//   IN_PROGRESS: "in_progress",
//   CONFIRMED: "confirmed",
//   CANCELLED: "cancelled",
//   COMPLETED: "completed",
// } as const

/**
 * Mapping of appointment status to color
 * @param {Appointment.Status} status
 * @returns {[color, textColor]}
 */
export function getAppintmentStatusColor(status: Appointment.Status): [string, string] {
  switch (status) {
    case "pending":
      return ["#a16207", "#ffffff"] // amber-700
    case "scheduled":
      return ["#1e40af", "#ffffff"] // blue-700
    case "checked_in":
      return ["#6d28d9", "#ffffff"] // violet-700
    case "in_progress":
      return ["#0369a1", "#ffffff"] // sky-700
    case "confirmed":
      return ["#15803d", "#ffffff"] // green-700
    case "cancelled":
      return ["#a21caf", "#ffffff"] // fuchsia-700
    case "completed":
      return ["#059669", "#ffffff"] // emerald-700
    default:
      return ["#374151", "#ffffff"] // gray-700
  }
}

// export const Status = {
//   PENDING: "pending",
//   PREPARED: "prepared",
//   PICKED_UP: "picked-up",
//   NOT_PICKED_UP: "not-picked-up",
//   PARTIALLY_PICKED_UP: "partially-picked-up",
//   CANCELLED: "cancelled",
//   OTHER: "other",
// } as const
/**
 * Mapping of prescription status to color
 * @param {Prescription.Status} status
 * @returns {[color, textColor]}
 */
export function getPrescriptionStatusColor(status: Prescription.Status): [string, string] {
  switch (status) {
    case "pending":
      return ["#a16207", "#ffffff"] // amber-700
    case "prepared":
      return ["#1e40af", "#ffffff"] // blue-700
    case "picked-up":
      return ["#6d28d9", "#ffffff"] // violet-700
    case "not-picked-up":
      return ["#0369a1", "#ffffff"] // sky-700
    case "partially-picked-up":
      return ["#15803d", "#ffffff"] // green-700
    case "cancelled":
      return ["#a21caf", "#ffffff"] // fuchsia-700
    case "other":
      return ["#374151", "#ffffff"] // gray-700
    default:
      return ["#374151", "#ffffff"] // gray-700
  }
}

// export const ItemStatus = {
//   ACTIVE: "active",
//   COMPLETED: "completed",
//   CANCELLED: "cancelled",
// }
export function getPrescriptionItemStatusColor(
  status: PrescriptionItem.ItemStatus,
): [string, string] {
  switch (status) {
    case "active":
      return ["#1e40af", "#ffffff"] // blue-700
    case "completed":
      return ["#6d28d9", "#ffffff"] // violet-700
    case "cancelled":
      return ["#a21caf", "#ffffff"] // fuchsia-700
    default:
      return ["#374151", "#ffffff"] // gray-700
  }
}
