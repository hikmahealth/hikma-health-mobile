import './src/i18n';
import React from 'react';
import {StatusBar, useColorScheme, Platform, View, Alert} from 'react-native';
import DatabaseProvider from '@nozbe/watermelondb/DatabaseProvider';

import {
  Provider as PaperProvider,
  MD3DarkTheme,
  MD3LightTheme,
  adaptNavigationTheme,
  Button,
  IconButton,
} from 'react-native-paper';
import merge from 'deepmerge';

import {
  NavigationContainer,
  DarkTheme as NavigationDarkTheme,
  DefaultTheme as NavigationDefaultTheme,
  StackActions,
} from '@react-navigation/native';
import Login from './src/screens/Login';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import PatientList from './src/screens/PatientList';
import {Colors} from 'react-native/Libraries/NewAppScreen';
import {translate} from './src/i18n';
import LanguageToggle from './src/components/LanguageToggle';
import NewPatient from './src/screens/NewPatient';
import database from './src/db';
import {Patient, Visit} from './src/types';
import {PatientView} from './src/screens/PatientView';
import {SnapshotList} from './src/screens/SnapshotList';
import {NewVisit} from './src/screens/NewVisit';
import {OpenTextEvent} from './src/screens/OpenTextEvent';
import {Covid19Form} from './src/screens/Covid19Form';
import {ExaminationForm} from './src/screens/Examination';
import {VitalsForm} from './src/screens/VitalsForm';
import {MedicalHistoryForm} from './src/screens/MedicalHistoryForm';
import {Event, EventTypes} from './src/types/Event';
import {VisitList} from './src/screens/VisitList';
import {EventList} from './src/screens/EventList';
import {MedicineForm} from './src/screens/MedicineForm';
import {Benchmarking} from './src/screens/Benchmarking';
import {syncDB} from './src/db/sync';
import {SyncModal} from './src/components/SyncModal';
import {useProviderStore} from './src/stores/provider';
import {useSyncStore} from './src/stores/sync';
import {AppBarNav} from './src/components/AppBarNav';
import {primaryTheme} from './src/styles/buttons';

const {LightTheme, DarkTheme} = adaptNavigationTheme({
  reactNavigationLight: NavigationDefaultTheme,
  reactNavigationDark: NavigationDarkTheme,
});

const CombinedDefaultTheme = merge(MD3LightTheme, LightTheme);
const CombinedDarkTheme = merge(MD3DarkTheme, DarkTheme);

// FIXME: Put authentication and user and clinic info in global state
export type VisitScreensProps = {
  patientId: string;
  visitId: string;
  providerId: string;
  eventType?: EventTypes;
};

export type RootStackParamList = {
  Login: undefined;
  PatientList: undefined;
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

  // FOR DEVELOPMENT PURPOSES ONLY
  Benchmarking: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

function App(): JSX.Element {
  const isDarkMode = useColorScheme() === 'dark';
  const setProvider = useProviderStore(store => store.setProvider);
  const theme = isDarkMode ? CombinedDarkTheme : CombinedDefaultTheme;
  const myTheme = {
    ...theme,
    roundness: 10,
    colors: {
      ...theme.colors,
      primary: '#3A539B',
      secondary: 'yellow',
    },
  };

  const signOut = (cb: any) => () => {
    setProvider(null);
    cb();
  };

  // theme.colors.

  const backgroundStyle = {
    backgroundColor: isDarkMode ? Colors.darker : Colors.lighter,
  };

  return (
    <DatabaseProvider database={database}>
      <PaperProvider theme={myTheme}>
        <SyncModal>
          <NavigationContainer theme={myTheme}>
            <StatusBar
              barStyle={isDarkMode ? 'light-content' : 'dark-content'}
              backgroundColor={backgroundStyle.backgroundColor}
            />
            <Stack.Navigator
              screenOptions={({navigation}) => ({
                headerRight: () => {
                  const resetToLogin = () =>
                    navigation.dispatch(StackActions.replace('Login', {}));

                  const initSync = async () => {
                    useSyncStore.setState({syncing: true});
                    try {
                      await syncDB();
                      useSyncStore.setState({syncing: false});
                    } catch (error) {
                      console.error('Error syncing: ', error);
                      useSyncStore.setState({syncing: false});
                    }
                  };

                  return (
                    <>
                      <LanguageToggle />
                      {/* <Button */}
                      {/*   mode="text" */}
                      {/*   compact */}
                      {/*    */}
                      {/*   onPress={signOut(resetToLogin)}> */}
                      {/*   {translate('signOut')} */}
                      {/* </Button> */}
                      <Button
                        onPress={initSync}
                        theme={primaryTheme}
                        contentStyle={{flexDirection: 'row-reverse'}}
                        icon={'refresh'}>
                        {translate('sync')}
                      </Button>
                      {/* <IconButton onPress={initSync} icon="refresh" /> */}
                      <IconButton
                        icon="dots-vertical"
                        theme={primaryTheme}
                        size={20}
                        onPress={() => {
                          Alert.alert(
                            'More options',
                            'Mainly For development purposes & testing purposes',
                            [
                              {
                                text: 'Sign Out',
                                onPress: signOut(resetToLogin),
                              },
                              {
                                text: 'Benchmarking',
                                onPress: () =>
                                  navigation.navigate('Benchmarking'),
                              },
                            ],
                            {
                              cancelable: true,
                            },
                          );
                        }}
                      />
                      {/* <AppBarNav /> */}
                    </>
                  );
                },
              })}>
              <Stack.Screen
                options={{
                  headerShown: false,
                }}
                name="Login"
                component={Login}
              />
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
                options={{
                  // Title is overwritten on page render
                  title: 'Open Text Event',
                }}
                component={OpenTextEvent}
              />
              <Stack.Screen
                name="VitalsForm"
                options={{
                  title: 'Patient Vitals',
                }}
                component={VitalsForm}
              />
              {/* // FOR DEVELOPMENT PURPOSES ONLY */}
              <Stack.Screen
                name="Benchmarking"
                options={{
                  title: 'Benchmarking',
                }}
                component={Benchmarking}
              />
            </Stack.Navigator>
          </NavigationContainer>
        </SyncModal>
      </PaperProvider>
    </DatabaseProvider>
  );
}

export default App;

// TODO: All page titles need the appropriate translations
