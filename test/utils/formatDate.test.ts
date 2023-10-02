import { localeDate } from "../../src/utils/formatDate";


describe('localeDate', () => {

  it('should format date in English locale by default', () => {
    const date = new Date('2023-09-22');
    const result = localeDate(date);
    // Expected result based on English locale and default format
    // your results might vary depending on time zone
    expect(result).toBe('Sep 21, 2023');
  });

});