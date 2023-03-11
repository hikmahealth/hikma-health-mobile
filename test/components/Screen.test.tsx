import {render, screen, waitFor} from '@testing-library/react-native';
import {Text} from 'react-native';
import {SafeAreaProvider} from 'react-native-safe-area-context';
// import {NavigationContainer} from '@react-navigation/native';
// import {Text} from '../../src/components';
import {Screen} from '../../src/components/Screen';

jest.mock('@react-navigation/native', () => {
  return {
    useNavigation: () => ({
      navigate: jest.fn(),
      dispatch: jest.fn(),
    }),
    useRoute: () => ({
      params: {
        id: '123',
      },
    }),

    useScrollToTop: (_: any) => {},
  };
});

describe('Screen', () => {
  it('should render a fixed Screen', () => {
    render(
      <SafeAreaProvider
        initialSafeAreaInsets={{top: 1, left: 2, right: 3, bottom: 4}}>
        <Screen preset="fixed">
          <Text>Fixed Screen</Text>
        </Screen>
      </SafeAreaProvider>,
    );

    expect(screen.getByText('Fixed Screen')).not.toBeNull();
  });

  it('should render a scroll Screen', () => {
    render(
      <SafeAreaProvider
        initialSafeAreaInsets={{top: 1, left: 2, right: 3, bottom: 4}}>
        <Screen preset="scroll">
          <Text>Scroll Screen</Text>
        </Screen>
      </SafeAreaProvider>,
    );

    expect(screen.getByText('Scroll Screen')).not.toBeNull();
  });

  it('should render a full Screen', () => {
    render(
      <SafeAreaProvider
        initialSafeAreaInsets={{top: 1, left: 2, right: 3, bottom: 4}}>
        <Screen preset="fullScreenFixed">
          <Text>Full Screen</Text>
        </Screen>
      </SafeAreaProvider>,
    );

    expect(screen.getByText('Full Screen')).not.toBeNull();
  });
});
