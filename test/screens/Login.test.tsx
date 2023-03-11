import {render, screen} from '@testing-library/react-native';
import {GlobalServicesContextProvider} from '../../src/components/SyncModal';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import Login from '../../src/screens/Login';

describe('Login', () => {
  it('should render Covid19Form', () => {
    render(
      <SafeAreaProvider
        initialSafeAreaInsets={{top: 1, left: 2, right: 3, bottom: 4}}>
        <GlobalServicesContextProvider>
          <Login />
        </GlobalServicesContextProvider>
      </SafeAreaProvider>,
    );

    expect(screen).toBeDefined();
    expect(screen.getByTestId('loginLogo')).toBeDefined();
  });
});
