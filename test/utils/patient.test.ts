import { Patient } from "../../src/types";
import { displayName, displayNameAvatar } from "../../src/utils/patient";

describe('displayNameAvatar', () => {
  it('should return the initials of the givenName and surname', () => {
    const patient = {
      givenName: 'John',
      surname: 'Doe'
    } as unknown as Patient;

    const result = displayNameAvatar(patient);
    expect(result).toBe('JD');
  });

  it('should handle missing givenName', () => {
    const patient = {
      surname: 'Doe'
    } as unknown as Patient;

    const result = displayNameAvatar(patient);
    expect(result).toBe('D');
  });

  it('should handle missing surname', () => {
    const patient = {
      givenName: 'John'
    } as unknown as Patient

    const result = displayNameAvatar(patient);
    expect(result).toBe('J');
  });

  it('should handle both missing givenName and surname', () => {
    const patient = {} as Patient;

    const result = displayNameAvatar(patient);
    expect(result).toBe('');
  });
});

describe('displayName', () => {
  it('should return the full name', () => {
    const patient = {
      givenName: 'John',
      surname: 'Doe'
    } as unknown as Patient;

    const result = displayName(patient);
    expect(result).toBe('John Doe');
  });

  it('should handle missing givenName', () => {
    const patient = {
      surname: 'Doe'
    } as unknown as Patient;

    const result = displayName(patient);
    expect(result).toBe('Doe');
  });

  it('should handle missing surname', () => {
    const patient = {
      givenName: 'John'
    } as unknown as Patient;

    const result = displayName(patient);
    expect(result).toBe('John');
  });

  it('should handle both missing givenName and surname', () => {
    const patient = {} as unknown as Patient;

    const result = displayName(patient);
    expect(result).toBe('');
  });
});
