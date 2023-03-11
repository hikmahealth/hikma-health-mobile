import {render, screen} from '@testing-library/react-native';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {
  ExaminationForm,
  ExaminationDisplay,
} from '../../src/screens/Examination';
import {generateExaminationMetadata} from '../../src/utils/generators/events';

describe('ExaminationForm', () => {
  it('should render ExaminationForm', () => {
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
        <ExaminationForm route={{params}} navigation={{}} />
      </SafeAreaProvider>,
    );

    expect(screen).toBeDefined();
  });
});

describe('Examination Display', () => {
  it('should render Examination Display', () => {
    const medicineMetaObj = generateExaminationMetadata('Proctor');
    render(
      <SafeAreaProvider
        initialSafeAreaInsets={{top: 1, left: 2, right: 3, bottom: 4}}>
        <ExaminationDisplay metadataObj={medicineMetaObj} />
      </SafeAreaProvider>,
    );

    expect(screen).toBeDefined();
  });
});
