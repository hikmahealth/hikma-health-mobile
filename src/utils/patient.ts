import { Patient } from "../types"

export const displayNameAvatar = (patient: Patient) => {
  const { givenName = " ", surname = " " } = patient
  return `${givenName[0]}${surname[0]}`.trim()
}

export const displayName = (patient: Patient) => {
  const { givenName = " ", surname = " " } = patient
  return `${givenName} ${surname}`.trim()
}
