import React from 'react';
import { render, screen } from '@testing-library/react-native';

import {
  NavigationContainer
} from "@react-navigation/native"
import { createNativeStackNavigator } from "@react-navigation/native-stack"
import { useTheme } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Screen } from '../../src/components/Screen';
import { RootStackParamList } from '../../App';
import { Text } from 'react-native';
// import { Text } from '../../src/components/Text';

const Stack = createNativeStackNavigator<RootStackParamList>()
// Mock the external hooks
// jest.mock('react-native-paper', () => ({
//   useTheme: jest.fn(),
// }));

describe('Screen', () => {
  // beforeEach(() => {
  //   // Reset the mocks before each test
  //   (useTheme as jest.Mock).mockReturnValue({ colors: { background: 'white' } });
  //   (useSafeAreaInsets as jest.Mock).mockReturnValue({ top: 0, bottom: 0, left: 0, right: 0 });
  // });

  it('should render scroll container without crashing', async () => {
    render(
      <NavigationContainer>
        <Stack.Screen
          options={{
            title: "Test Screen"
          }}
          name="test"
          component={() => <Screen preset="scroll"><Text testID="childText">Test Content</Text></Screen>}
        />

      </NavigationContainer>);
    // const child = await screen.findByTestId('childText')
    // expect(child).toBeOnTheScreen()
  });


  it('should render fixed container without crashing', async () => {
    render(
      <NavigationContainer>
        <Stack.Screen
          options={{
            title: "Test Screen"
          }}
          name="test"
          component={() => <Screen preset="fixed"><Text testID="childText">Test Content</Text></Screen>}
        />

      </NavigationContainer>);
    // const child = await screen.findByTestId('childText')
    // expect(child).toBeOnTheScreen()
  });
  // it('should apply background color', () => {
  // const { getByTestId } = render(<Screen backgroundColor="red"><Text>Test Content</Text></Screen>);
  // expect(getByTestId('screen-container')).toHaveStyle({ backgroundColor: 'red' });
  // });

  // Add more tests for different props and scenarios
});

