import {render, screen} from '@testing-library/react-native';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {PatientFileSummary, PatientView} from '../../src/screens/PatientView';
import {generatePatient} from '../../src/utils/generators/patients';

// BUG: https://github.com/facebook/react-native/issues/28693
// BUG: https://github.com/facebook/react-native/issues/27431
// describe('PatientView', () => {
//   it('should render PatientView', () => {
//     const params = {
//       patientId: 'e2dw',
//       visitId: 'fewods',
//       clinicId: 'newjs',
//       patient: generatePatient(),
//     };
//     render(
//       <SafeAreaProvider
//         initialSafeAreaInsets={{top: 1, left: 2, right: 3, bottom: 4}}>
//         {/* @ts-ignore */}
//         <PatientView route={{params}} navigation={{}} />
//       </SafeAreaProvider>,
//     );

//     expect(screen).toBeDefined();
//   });
// });

describe('PatientFileSummary Display', () => {
  it('should render MedicineForm Display', () => {
    const patient = generatePatient();

    // TODO: test the handleGoToEditPatient function
    const handleGoToEditPatient = jest.fn();

    render(
      <SafeAreaProvider
        initialSafeAreaInsets={{top: 1, left: 2, right: 3, bottom: 4}}>
        <PatientFileSummary
          patient={patient}
          goToEditPatient={handleGoToEditPatient}
        />
      </SafeAreaProvider>,
    );

    expect(screen).toBeDefined();
  });
});
