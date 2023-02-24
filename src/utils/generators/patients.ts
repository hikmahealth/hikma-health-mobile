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
  createdAt: faker.date.past(2).getTime(),
  updatedAt: faker.date.past(2).getTime(),
});

// generate a list of random patients
export const generatePatients = (count: number): Patient[] => {
  return Array.from({length: count}, generatePatient);
};
