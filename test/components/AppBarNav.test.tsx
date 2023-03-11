import '../../src/i18n/i18n';
import {render, screen, waitFor} from '@testing-library/react-native';
import {AppBarNav} from '../../src/components/AppBarNav';
import {GlobalServicesContextProvider} from '../../src/components/SyncModal';
import {SafeAreaProvider} from 'react-native-safe-area-context';

// Write test for AppBarNav component
describe('AppBarNav', () => {
  it('should render AppBarNav', async () => {
    render(
      <SafeAreaProvider
        initialSafeAreaInsets={{top: 1, left: 2, right: 3, bottom: 4}}>
        <GlobalServicesContextProvider>
          <AppBarNav
            options={{title: 'Test'}}
            navigation={{canGoBack: jest.fn()} as any}
            route={{name: 'Test'} as any}
          />
        </GlobalServicesContextProvider>
      </SafeAreaProvider>,
    );

    expect(screen.getByTestId('headerContent')).not.toBeNull();
    expect(screen.getByText('Test')).not.toBeNull();
  });
});
