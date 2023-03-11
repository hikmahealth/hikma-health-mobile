import {render, screen} from '@testing-library/react-native';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {
  MedicineForm,
  MedicineFormDisplay,
} from '../../src/screens/MedicineForm';
import {generateMedicineMetadata} from '../../src/utils/generators/events';

describe('MedicineForm', () => {
  it('should render MedicineForm', () => {
    const params = {
      eventType: 'Examination',
      patientId: 'e2dw',
      visitId: 'fewods',
      providerId: '32enows',
    };
    render(
      <SafeAreaProvider
        initialSafeAreaInsets={{top: 1, left: 2, right: 3, bottom: 4}}>
        {/* @ts-ignore */}
        <MedicineForm route={{params}} navigation={{}} />
      </SafeAreaProvider>,
    );

    expect(screen).toBeDefined();
  });
});

describe('MedicineForm Display', () => {
  it('should render MedicineForm Display', () => {
    const medicineMetaObj = generateMedicineMetadata('Proctor');
    render(
      <SafeAreaProvider
        initialSafeAreaInsets={{top: 1, left: 2, right: 3, bottom: 4}}>
        {/* @ts-ignore: Generated object has 'type' field that does not match */}
        <MedicineFormDisplay metadataObj={medicineMetaObj} />
      </SafeAreaProvider>,
    );

    expect(screen).toBeDefined();
  });
});
