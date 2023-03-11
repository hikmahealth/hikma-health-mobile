import {render, screen} from '@testing-library/react-native';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {Covid19Form} from '../../src/screens/Covid19Form';

describe('Covid19Form', () => {
  it('should render Covid19Form', () => {
    const params = {
      eventType: 'Complaint',
      patientId: 'e2dw',
      visitId: 'fewods',
      providerId: '32enows',
    };
    render(
      <SafeAreaProvider
        initialSafeAreaInsets={{top: 1, left: 2, right: 3, bottom: 4}}>
        {/* @ts-ignore */}
        <Covid19Form route={{params}} navigation={{}} />
      </SafeAreaProvider>,
    );

    expect(screen).toBeDefined();
  });
});
