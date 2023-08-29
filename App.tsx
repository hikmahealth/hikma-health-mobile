import "react-native-gesture-handler"
import "./src/i18n"
import React, { useContext, useEffect, useState } from "react"
import { Image, ImageStyle, StatusBar, useColorScheme, View, ViewStyle } from "react-native"
import DatabaseProvider from "@nozbe/watermelondb/DatabaseProvider"

import {
  Provider as PaperProvider,
  MD3DarkTheme,
  MD3LightTheme,
  adaptNavigationTheme,
  IconButton,
} from "react-native-paper"
import {
  createDrawerNavigator,
  DrawerContentScrollView,
  DrawerItemList,
  DrawerItem,
} from "@react-navigation/drawer"
import merge from "deepmerge"

import {
  NavigationContainer,
  DarkTheme as NavigationDarkTheme,
  DefaultTheme as NavigationDefaultTheme,
  DrawerActions,
  StackActions,
} from "@react-navigation/native"
import Login from "./src/screens/Login"
import { createNativeStackNavigator } from "@react-navigation/native-stack"
import PatientList from "./src/screens/PatientList"
import { Colors } from "react-native/Libraries/NewAppScreen"
import Icon from "react-native-vector-icons/MaterialCommunityIcons"
import { i18n, translate } from "./src/i18n"
import NewPatient from "./src/screens/NewPatient"
import database from "./src/db"
import { Patient, Visit } from "./src/types"
import { Event, EventTypes } from "./src/types/Event"
import { VisitList } from "./src/screens/VisitList"
import { EventList } from "./src/screens/EventList"
import { MedicineForm } from "./src/screens/MedicineForm"
import {
  SyncModal,
  GlobalServicesContextProvider,
  GlobalServiceContext,
} from "./src/components/SyncModal"
import { useProviderStore } from "./src/stores/provider"
import { primaryTheme } from "./src/styles/buttons"
import { HeaderRight } from "./src/components/HeaderRight"
import { getClinic } from "./src/db/api"
import { Text } from "./src/components"
import { useActor } from "@xstate/react"
import { CustomDrawerContent } from "./src/components/CustomDrawerContent"
import { RootNavigator } from "./src/navigators/RootDrawerNavigator"
import { useLanguageStore } from "./src/stores/language"
import { PrivacyPolicy } from "./src/screens/PrivacyPolicy"

const { LightTheme, DarkTheme } = adaptNavigationTheme({
  reactNavigationLight: NavigationDefaultTheme,
  reactNavigationDark: NavigationDarkTheme,
})

const CombinedDefaultTheme = merge(MD3LightTheme, LightTheme)
const CombinedDarkTheme = merge(MD3DarkTheme, DarkTheme)

// FIXME: This stack has moved!!
export type RootStackParamList = {
  Login: undefined
  PrivacyPolicy: undefined
  PatientList: undefined
  RootNavigator: undefined
  NewPatient: {
    patient?: Patient
  }
  PatientView: {
    patient: Patient
    providerId: string
    clinicId: string
  }
  NewVisit: {
    patientId: string
    providerId: string
    visitId: string
    patientAge: number
    visitDate: number
  }
  VisitList: { patientId: string; patient: Patient }
  EventList: { patient: Patient; visit: Visit }
  SnapshotList: {
    patientId: string
    events: Event[]
    eventType: EventTypes
  }

  // FOR DEVELOPMENT PURPOSES ONLY
  Benchmarking: undefined
}

const Stack = createNativeStackNavigator<RootStackParamList>()

function App(): JSX.Element {
  const isDarkMode = useColorScheme() === "dark"
  const [provider, setClinic] = useProviderStore((state) => [state.provider, state.setClinic])

  const [isSignedIn, setIsSignedIn] = useState(false)

  const fetchAndSetClinic = async () => {
    const clinic = (await getClinic())[0]
    clinic && setClinic({ id: clinic.id, name: clinic.name })
  }

  useEffect(() => {
    fetchAndSetClinic()
    setIsSignedIn(provider !== null)
  }, [provider])

  const theme = isDarkMode ? CombinedDarkTheme : CombinedDefaultTheme
  const myTheme = {
    ...theme,
    roundness: 10,
    colors: {
      ...theme.colors,
      primary: "#3A539B",
      secondary: "yellow",
    },
  }

  const backgroundStyle = {
    backgroundColor: isDarkMode ? Colors.darker : Colors.lighter,
  }

  return (
    <DatabaseProvider database={database}>
      <GlobalServicesContextProvider>
        <PaperProvider theme={myTheme}>
          <SyncModal>
            <NavigationContainer theme={myTheme}>
              <StatusBar
                barStyle={isDarkMode ? "light-content" : "dark-content"}
                backgroundColor={backgroundStyle.backgroundColor}
              />
              <Stack.Navigator>
                {!isSignedIn ? (
                  <Stack.Group>
                    <Stack.Screen
                      options={{
                        headerShown: false,
                      }}
                      name="Login"
                      component={Login}
                    />
                    <Stack.Group screenOptions={{ presentation: "modal" }}>
                      <Stack.Screen
                        options={{
                          title: "Privacy Policy"
                        }}
                        name="PrivacyPolicy"
                        component={PrivacyPolicy}
                      />
                    </Stack.Group>
                  </Stack.Group>
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
  )
}

export default App

// TODO: All page titles need the appropriate translations
