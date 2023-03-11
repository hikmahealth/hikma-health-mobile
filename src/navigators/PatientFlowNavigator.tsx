export type VisitScreensProps = {
  patientId: string;
  visitId: string;
  providerId: string;
  eventType?: EventTypes;
};

export type PatientFlowParamList = {
  Login: undefined;
  PatientList: undefined;
  RootNavigator: undefined;
  NewPatient: {
    patient?: Patient;
  };
  PatientView: {
    patient: Patient;
    providerId: string;
    clinicId: string;
  };
  NewVisit: {
    patientId: string;
    providerId: string;
    visitId: string;
    patientAge: number;
  };
  VisitList: {patientId: string; patient: Patient};
  EventList: {patient: Patient; visit: Visit};
  SnapshotList: {
    patientId: string;
    events: Event[];
    eventType: EventTypes;
  };
  MedicalHistoryForm: VisitScreensProps;
  ExaminationForm: VisitScreensProps;
  MedicineForm: VisitScreensProps;
  PhysiotherapyForm: VisitScreensProps;
  Covid19Form: VisitScreensProps & {patientAge: number};
  OpenTextEvent: VisitScreensProps;
  VitalsForm: VisitScreensProps;
};

import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {View} from 'react-native';
import {Text} from '../components/Text';
import {AppBarNav} from '../components/AppBarNav';
import {CustomDrawerContent} from '../components/CustomDrawerContent';

import {translate} from '../i18n';
import {Covid19Form} from '../screens/Covid19Form';
import {EventList} from '../screens/EventList';
import {ExaminationForm} from '../screens/Examination';
import {MedicalHistoryForm} from '../screens/MedicalHistoryForm';
import {MedicineForm} from '../screens/MedicineForm';
import NewPatient from '../screens/NewPatient';
import {NewVisit} from '../screens/NewVisit';
import {OpenTextEvent} from '../screens/OpenTextEvent';
import PatientList from '../screens/PatientList';
import {PatientView} from '../screens/PatientView';
import {PhysiotherapyForm} from '../screens/PhysiotherapyForm';
import {SnapshotList} from '../screens/SnapshotList';
import {VisitList} from '../screens/VisitList';
import {VitalsForm} from '../screens/VitalsForm';
import {EventTypes, Patient, Visit} from '../types';

const Stack = createNativeStackNavigator<PatientFlowParamList>();

export const PatientFlow = () => {
  return (
    <Stack.Navigator
      screenOptions={({navigation}) => ({
        header: props => <AppBarNav {...props} />,
      })}>
      <Stack.Screen
        name="PatientList"
        options={{
          title: 'Patients',
        }}
        component={PatientList}
      />
      <Stack.Screen
        name="NewPatient"
        options={{
          title: 'New Patient',
        }}
        component={NewPatient}
      />
      <Stack.Screen
        name="PatientView"
        options={{
          // TODO: Page title should be patients name??
          title: 'Patient View',
        }}
        component={PatientView}
      />
      <Stack.Screen
        name="VisitList"
        options={{
          title: 'Patient Visits',
        }}
        component={VisitList}
      />
      <Stack.Screen
        name="EventList"
        options={{
          title: 'Visits Events',
        }}
        component={EventList}
      />
      <Stack.Screen
        name="NewVisit"
        options={{
          title: 'New Visit',
        }}
        component={NewVisit}
      />
      <Stack.Screen
        name="ExaminationForm"
        options={{
          title: 'Examination',
        }}
        component={ExaminationForm}
      />
      <Stack.Screen
        name="SnapshotList"
        options={({route}) => ({
          title: route.params.eventType || 'Snapshot List',
        })}
        // options={{
        //   title: 'Snapshot List',
        // }}
        component={SnapshotList}
      />
      <Stack.Screen
        name="MedicalHistoryForm"
        options={{
          title: 'Medical History',
        }}
        component={MedicalHistoryForm}
      />
      <Stack.Screen
        name="MedicineForm"
        options={{
          title: 'Medicine Dispensing',
        }}
        component={MedicineForm}
      />
      <Stack.Screen
        name="Covid19Form"
        options={{
          title: translate('covidScreening'),
        }}
        component={Covid19Form}
      />
      <Stack.Screen
        name="OpenTextEvent"
        options={({route}) => ({
          title: route.params.eventType || 'Open Text Event',
        })}
        // options={{
        //   // TODO:
        //   // Title is overwritten on page render
        //   title: 'Open Text Event',
        // }}
        component={OpenTextEvent}
      />
      <Stack.Screen
        name="PhysiotherapyForm"
        options={{
          title: translate('physiotherapy'),
        }}
        component={PhysiotherapyForm}
      />
      <Stack.Screen
        name="VitalsForm"
        options={{
          title: 'Patient Vitals',
        }}
        component={VitalsForm}
      />
    </Stack.Navigator>
  );
};
