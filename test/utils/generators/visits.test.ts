import {generateVisits} from '../../../src/utils/generators/visits';

describe('visits', () => {
  test('generateVisits', () => {
    const visits = generateVisits(10, 'patientId', 'providerId', 'clinicId');
    expect(visits.length).toBe(10);
  });
});
