import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { PatientListItem } from '../../src/components/PatientListItem';
import { Patient } from '../../src/types';
import { localeDate } from '../../src/utils/formatDate';

// Mock the external hooks and components
jest.mock('../../src/i18n', () => ({
  translate: jest.fn((key) => key),

  i18n: {
    currentLocale: jest.fn(() => 'en-US'),
  },
}));

jest.mock('../../src/stores/language', () => ({
  useLanguageStore: jest.fn(),
}));

// jest.mock('react-native-paper', () => ({
//   Avatar: {
//     Text: jest.fn(() => null),
//   },
// }));

describe('PatientListItem', () => {
  const mockPatient: Patient = {
    id: '1',
    dateOfBirth: '2000-01-01',
    sex: 'male',
    camp: 'TestCamp',
    country: 'Test',
    givenName: "John",
    hometown: "testamania",
    phone: "98534023",
    surname: "Doe",
    updatedAt: new Date(),
    createdAt: new Date('2022-01-01'),
  };

  const mockOnPatientSelected = jest.fn();

  beforeEach(() => {
    // Reset the mocks before each test
    jest.clearAllMocks();
  });

  it('should render patient details correctly', () => {
    const { getByTestId } = render(
      <PatientListItem patient={mockPatient} onPatientSelected={mockOnPatientSelected} />
    );

    expect(getByTestId('dob')).toBeTruthy();
    expect(getByTestId('sex')).toBeTruthy();
    expect(getByTestId('camp')).toBeTruthy();
    // Add more assertions for other patient details
  });

  it('should call onPatientSelected when patient item is pressed', () => {
    const { getByTestId } = render(
      <PatientListItem patient={mockPatient} onPatientSelected={mockOnPatientSelected} />
    );

    const patientItem = getByTestId('patientItem'); // You'll need to add a testID prop to your TouchableOpacity component
    fireEvent.press(patientItem);

    expect(mockOnPatientSelected).toHaveBeenCalledWith(mockPatient);
  });

  // Add more tests for different interactions and scenarios
});

