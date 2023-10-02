import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { HeaderSearch } from '../../src/screens/PatientList';

// Mocking dependencies
jest.mock('../../src/i18n', () => ({
  translate: jest.fn((key) => key),
}));

describe('HeaderSearch', () => {

  beforeEach(() => {
    // Reset all mock implementations before each test
    jest.clearAllMocks();
  });

  it('should render the component correctly', () => {
    const { getByPlaceholderText } = render(<HeaderSearch submitSearch={jest.fn()} totalPatientsCount={0} cancelSearch={jest.fn()} />);
    expect(getByPlaceholderText('patientSearch')).toBeTruthy();
  });

  it('should update search query when typing in the search bar', () => {
    const { getByPlaceholderText } = render(<HeaderSearch submitSearch={jest.fn()} totalPatientsCount={0} cancelSearch={jest.fn()} />);
    const searchBar = getByPlaceholderText('patientSearch');
    fireEvent.changeText(searchBar, 'test query');
    expect(searchBar.props.value).toBe('test query');
  });

  it('should toggle advanced search when advanced filters button is pressed', () => {
    const { getByTestId } = render(<HeaderSearch submitSearch={jest.fn()} totalPatientsCount={0} cancelSearch={jest.fn()} />);
    const advancedFiltersButton = getByTestId('advancedFilters');
    fireEvent.press(advancedFiltersButton);
    expect(getByTestId('country')).toBeTruthy();
    expect(getByTestId('hometown')).toBeTruthy();
    // Add more assertions for other fields...
  });


});
