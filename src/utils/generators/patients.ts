import {faker} from '@faker-js/faker';
import {format} from 'date-fns';
import {sample} from 'lodash';
import {Patient} from '../../types/Patient';

// generate a random patient using faker
export const generatePatient = (): Patient => ({
  id: faker.datatype.uuid(),
  givenName: faker.name.firstName(),
  surname: faker.name.lastName(),
  dateOfBirth: format(faker.date.past(), 'yyyy-MM-dd'),
  country: faker.address.country(),
  hometown: faker.address.city(),
  sex: sample(['male', 'female']) as string,
  phone: faker.phone.number(),
  camp: faker.address.streetAddress(),
  // @ts-ignore: This object is for use directly as insert into db
  createdAt: faker.date.past(2).getTime(),
  // @ts-ignore: This object is for use directly as insert into db
  updatedAt: faker.date.past(2).getTime(),
});

// generate a list of random patients
export const generatePatients = (count: number): Patient[] => {
  return Array.from({length: count}, generatePatient);
};
