import {render, screen} from '@testing-library/react-native';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {
  PhysiotherapyForm,
  PhysiotherapyDisplay,
} from '../../src/screens/PhysiotherapyForm';
import {generatePhysiotherapyMetadata} from '../../src/utils/generators/events';

describe('PhysiotherapyForm', () => {
  it('should render PhysiotherapyForm', () => {
    const params = {
      eventType: 'Physiotherapy',
      patientId: 'e2dw',
      visitId: 'fewods',
    };
    render(
      <SafeAreaProvider
        initialSafeAreaInsets={{top: 1, left: 2, right: 3, bottom: 4}}>
        {/* @ts-ignore */}
        <PhysiotherapyForm route={{params}} navigation={{}} />
      </SafeAreaProvider>,
    );

    expect(screen).toBeDefined();
  });
});

describe('PhysiotherapyDisplay Display', () => {
  it('should render PhysiotherapyDisplay Display', () => {
    const metadataObj = generatePhysiotherapyMetadata('Roctor');

    render(
      <SafeAreaProvider
        initialSafeAreaInsets={{top: 1, left: 2, right: 3, bottom: 4}}>
        <PhysiotherapyDisplay metadataObj={metadataObj} />
      </SafeAreaProvider>,
    );

    expect(screen).toBeDefined();
  });
});
