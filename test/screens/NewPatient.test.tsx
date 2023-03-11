import {render, screen} from '@testing-library/react-native';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import NewPatientScreen from '../../src/screens/NewPatient';

// import {generateMedicineMetadata} from '../../src/utils/generators/events';

describe('NewPatientScreen', () => {
  it('should render NewPatient screen without a patientID prop : for creation', () => {
    const params = {
      visitId: 'fewods',
      providerId: '32enows',
    };
    render(
      <SafeAreaProvider
        initialSafeAreaInsets={{top: 1, left: 2, right: 3, bottom: 4}}>
        {/* @ts-ignore */}
        <NewPatientScreen route={{params}} navigation={{}} />
      </SafeAreaProvider>,
    );

    expect(screen).toBeDefined();
  });

  it('should render NewPatient screen with a patientID prop : for editing', () => {
    // TODO: Add test for the change of the navbar header
    const params = {
      patientId: 'e2dw',
      visitId: 'fewods',
      providerId: '32enows',
    };
    render(
      <SafeAreaProvider
        initialSafeAreaInsets={{top: 1, left: 2, right: 3, bottom: 4}}>
        {/* @ts-ignore */}
        <NewPatientScreen route={{params}} navigation={{}} />
      </SafeAreaProvider>,
    );

    expect(screen).toBeDefined();
  });
});
