import 'react-native-gesture-handler';
import './src/i18n';
import React, {useEffect, useState} from 'react';
import {StatusBar, useColorScheme} from 'react-native';
import DatabaseProvider from '@nozbe/watermelondb/DatabaseProvider';

import {
  Provider as PaperProvider,
  MD3DarkTheme,
  MD3LightTheme,
  adaptNavigationTheme,
} from 'react-native-paper';
import merge from 'deepmerge';

import {
  NavigationContainer,
  DarkTheme as NavigationDarkTheme,
  DefaultTheme as NavigationDefaultTheme,
} from '@react-navigation/native';
import Login from './src/screens/Login';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {Colors} from 'react-native/Libraries/NewAppScreen';
import {i18n, translate} from './src/i18n';
import database from './src/db';
import {Patient, Visit} from './src/types';
import {Event, EventTypes} from './src/types/Event';
import {
  SyncModal,
  GlobalServicesContextProvider,
} from './src/components/SyncModal';
import {useProviderStore} from './src/stores/provider';
import {getClinic} from './src/db/api';
import {RootNavigator} from './src/navigators/RootDrawerNavigator';

const {LightTheme, DarkTheme} = adaptNavigationTheme({
  reactNavigationLight: NavigationDefaultTheme,
  reactNavigationDark: NavigationDarkTheme,
});

const CombinedDefaultTheme = merge(MD3LightTheme, LightTheme);
const CombinedDarkTheme = merge(MD3DarkTheme, DarkTheme);

// FIXME: Put authentication and user and clinic info in global state
// FIXME: This stack has moved!!
export type RootStackParamList = {
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

  // FOR DEVELOPMENT PURPOSES ONLY
  Benchmarking: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

function App(): JSX.Element {
  const isDarkMode = useColorScheme() === 'dark';
  const [_, setLanguage] = useState(i18n.locale);
  const [provider, setClinic] = useProviderStore(state => [
    state.provider,
    state.setClinic,
  ]);

  const [isSignedIn, setIsSignedIn] = useState(false);

  const fetchAndSetClinic = async () => {
    const clinic = (await getClinic())[0];
    clinic && setClinic({id: clinic.id, name: clinic.name});
  };

  useEffect(() => {
    fetchAndSetClinic();
    setIsSignedIn(provider !== null);
    console.warn('Provider changed: ', provider);
  }, [provider]);

  useEffect(() => {
    i18n.onChange(change => setLanguage(change.locale));
  }, []);

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

  const backgroundStyle = {
    backgroundColor: isDarkMode ? Colors.darker : Colors.lighter,
  };

  return (
    <DatabaseProvider database={database}>
      <GlobalServicesContextProvider>
        <PaperProvider theme={myTheme}>
          <SyncModal>
            <NavigationContainer theme={myTheme}>
              <StatusBar
                barStyle={isDarkMode ? 'light-content' : 'dark-content'}
                backgroundColor={backgroundStyle.backgroundColor}
              />
              <Stack.Navigator>
                {!isSignedIn ? (
                  <Stack.Screen
                    options={{
                      headerShown: false,
                    }}
                    name="Login"
                    component={Login}
                  />
                ) : (
                  <Stack.Screen
                    name="RootNavigator"
                    options={{
                      headerShown: false,
                    }}
                    component={RootNavigator}
                  />
                )}
              </Stack.Navigator>
            </NavigationContainer>
          </SyncModal>
        </PaperProvider>
      </GlobalServicesContextProvider>
    </DatabaseProvider>
  );
}

export default App;

// TODO: All page titles need the appropriate translations
