import {render, screen} from '@testing-library/react-native';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {SnapshotList} from '../../src/screens/SnapshotList';
import {generateEvents} from '../../src/utils/generators/events';
import {generatePatient} from '../../src/utils/generators/patients';

describe('SnapshotList', () => {
  it('should render SnapshotList', () => {
    const params = {
      patientId: 'e2dw',
      visitId: 'fewods',
      clinicId: 'newjs',
      events: generateEvents(10, 'e2dw', 'fewods', 'Doctor'),
    };
    render(
      <SafeAreaProvider
        initialSafeAreaInsets={{top: 1, left: 2, right: 3, bottom: 4}}>
        {/* @ts-ignore */}
        <SnapshotList route={{params}} navigation={{}} />
      </SafeAreaProvider>,
    );

    expect(screen).toBeDefined();
  });
});
