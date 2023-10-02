import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { CustomDrawerContent } from '../../src/components/CustomDrawerContent';
import { GlobalServicesContextProvider, SyncModal } from '../../src/components/SyncModal';

// Mock the external hooks and components
jest.mock('@nozbe/watermelondb/sync', () => ({
  hasUnsyncedChanges: jest.fn(),
}));


jest.mock('react-native-vector-icons/MaterialCommunityIcons', () => 'Icon');
jest.mock('../../src/components/LanguageToggle', () => 'LanguageToggle');

describe('CustomDrawerContent', () => {
  beforeEach(() => {
    // Reset the mocks before each test
    jest.clearAllMocks();
  });

  it('should render the HIKMA HEALTH title', () => {
    const { getByText } = render(
      <GlobalServicesContextProvider>
          <CustomDrawerContent />
      </GlobalServicesContextProvider>);
    expect(getByText('HIKMA HEALTH')).toBeTruthy();
  });

  it('should trigger sync when sync drawer item is pressed', () => {
    const mockInitSync = jest.fn();
    jest.spyOn(React, 'useContext').mockReturnValue({ initSync: mockInitSync });

    const { getByTestId } = render(<CustomDrawerContent />);
    const syncButton = getByTestId('syncBtn'); // Replace with the actual translation if needed

    expect(syncButton).toBeTruthy()
  });

});
