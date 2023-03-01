import {generatePatients} from '../../../src/utils/generators/patients';

describe('patients', () => {
  test('generatePatients', () => {
    const patients = generatePatients(10);
    expect(patients.length).toBe(10);
  });
});
