import Patient from "../db/model/Patient"

/**
 * Display the patient name that would show in the avatar (usually in the case of no image)
 * @param {Patient} patient
 * @returns {string}
 */
export const displayNameAvatar = (patient: Patient): string => {
  const { givenName = " ", surname = " " } = patient
  return getInitials(`${givenName} ${surname}`)
}

/**
 * Given a patients name, return the initials
 * @param {string} name
 * @returns {string}
 */
export const getInitials = (name: string): string => {
  // split at the spaces and take the first letter of each word in the name, make it uppercase
  return name
    .split(" ")
    .map((word) => word[0]?.toUpperCase())
    .join("")
    .trim()
}

/**
 * Display the patient name that would show in the patient list
 * @param {Patient} patient
 * @returns {string}
 */
export const displayName = (patient: Patient): string => {
  const { givenName = " ", surname = " " } = patient
  return `${givenName} ${surname}`.trim()
}
