import {render, screen} from '@testing-library/react-native';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {MedicineDisplay} from '../../src/screens/Medicine';
import {generateMedicineMetadata} from '../../src/utils/generators/events';

describe('Medicine Display', () => {
  it('should render Medicine Display', () => {
    const params = {
      patientId: 'e2dw',
      visitId: 'fewods',
      providerId: '32enows',
    };
    const medicineMetaObj = generateMedicineMetadata('Proctor');
    render(
      <SafeAreaProvider
        initialSafeAreaInsets={{top: 1, left: 2, right: 3, bottom: 4}}>
        <MedicineDisplay metadataObj={medicineMetaObj} />
      </SafeAreaProvider>,
    );

    expect(screen).toBeDefined();
  });
});
