import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import { PatientSummary } from '../../src/components/PatientSummary';

// Mocking dependencies
jest.mock('react-native', () => {
  const rn = jest.requireActual('react-native');
  return {
    ...rn,
    Alert: {
      alert: jest.fn(),
    },
  };
});

jest.mock('../../src/db/api', () => ({
  getLatestPatientEventByType: jest.fn(),
  createEvent: jest.fn(),
  createVisit: jest.fn(),
}));

jest.mock('../../src/i18n', () => ({
  translate: jest.fn((key) => key),
}));

jest.mock('../../src/stores/provider', () => ({
  useProviderStore: jest.fn((_) => ([{}, {}])),
}));

describe('PatientSummary', () => {
  const mockPatientId = '12345';

  beforeEach(() => {
    // Reset all mock implementations before each test
    jest.clearAllMocks();
  });

  it('should render the component correctly', () => {
    const { getByText } = render(<PatientSummary patientId={mockPatientId} />);
    expect(getByText('patientSummary')).toBeTruthy();
  });

  it('should toggle to edit mode when pencil icon is pressed', () => {
    const { getByTestId } = render(<PatientSummary patientId={mockPatientId} />);
    const editButton = getByTestId('edit');
    fireEvent.press(editButton);
    // Assertions for edit mode
  });

  it('should toggle to view mode when close icon is pressed in edit mode', async () => {
    const { getByTestId } = render(<PatientSummary patientId={mockPatientId} />);
    const editButton = getByTestId('edit');
    fireEvent.press(editButton);
    const closeButton = getByTestId('close');
    fireEvent.press(closeButton);
    // Assertions for view mode
  });

  it('should save patient summary when save button is pressed', async () => {
    const { getByTestId, getByText } = render(<PatientSummary patientId={mockPatientId} />);
    const editButton = getByTestId('edit');
    fireEvent.press(editButton);
    const saveButton = getByText('Save');
    await act(async () => {
      fireEvent.press(saveButton);
    });
    // Assertions for the save functionality
  });
});
