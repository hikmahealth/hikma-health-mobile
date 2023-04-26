// import {LanguageString} from './LanguageString';

// export type Patient = {
//   id: string;
//   givenName: LanguageString;
//   surname: LanguageString;
//   dateOfBirth: string;
//   country: LanguageString;
//   hometown: LanguageString;
//   sex: string;
//   phone: string;
//   camp: string;
// };

export type Patient = {
  id: string
  givenName: string
  surname: string
  dateOfBirth: string
  country: string
  hometown: string
  sex: string
  phone: string
  camp: string
  createdAt: Date
  updatedAt: Date
}

// export type NewPatient = {
//   id: string;
//   given_name: string;
//   surname: string;
//   date_of_birth: string;
//   country: string;
//   hometown: string;
//   sex: string;
//   phone: string;
// };
