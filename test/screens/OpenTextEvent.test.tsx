import {render, screen} from '@testing-library/react-native';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {OpenTextEvent} from '../../src/screens/OpenTextEvent';

describe('OpenTextEvent', () => {
  it('should render OpenTextEvent', () => {
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
        <OpenTextEvent route={{params}} navigation={{}} />
      </SafeAreaProvider>,
    );

    expect(screen).toBeDefined();
  });
});
