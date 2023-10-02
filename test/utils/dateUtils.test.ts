import { calculateAgeInYears } from "../../src/utils/dateUtils";

describe('calculateAgeInYears', () => {
  it('should calculate the correct age for a given date of birth', () => {
    const dob = new Date('2000-01-01');
    const currentDate = new Date('2023-01-01');
    const expectedAge = 23;

    // Mock the current date to ensure consistent test results
    jest.spyOn(global.Date, 'now').mockImplementationOnce(() => currentDate.valueOf());

    const result = calculateAgeInYears(dob);
    expect(result).toBe(expectedAge);
  });

  it('should handle edge cases like birthdays', () => {
    const dob = new Date('2000-09-22');
    const currentDate = new Date('2023-09-22');
    const expectedAge = 23;

    // Mock the current date to ensure consistent test results
    jest.spyOn(global.Date, 'now').mockImplementationOnce(() => currentDate.valueOf());

    const result = calculateAgeInYears(dob);
    expect(result).toBe(expectedAge);
  });

});

