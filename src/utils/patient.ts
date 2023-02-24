import {Patient} from '../types';

export const displayNameAvatar = (patient: Patient) => {
  const {givenName, surname} = patient;
  return `${givenName[0] || ''}${surname[0] || ''}`;
};

export const displayName = (patient: Patient) => {
  const {givenName, surname} = patient;
  return `${givenName || ''} ${surname || ''}`;
};
