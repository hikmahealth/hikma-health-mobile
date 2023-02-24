import {faker} from '@faker-js/faker';
import {Visit} from '../../types';

// generate a random visit using faker
export const generateVisit = (
  patientId: string,
  providerId: string,
  clinicId: string,
): Visit => ({
  id: faker.datatype.uuid(),
  checkInTimestamp: new Date().getTime(),
  providerId,
  clinicId,
  patientId,
  isDeleted: false,
  // @ts-ignore
  createdAt: new Date().getTime(),
  updatedAt: new Date().getTime(),
});

// generate a list of random patients
export const generateVisits = (
  count: number,
  patientId: string,
  providerId: string,
  clinicId: string,
): Visit[] => {
  return Array.from({length: count}, () =>
    generateVisit(patientId, providerId, clinicId),
  );
};
