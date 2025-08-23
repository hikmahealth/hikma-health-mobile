/**
 * The app navigator (formerly "AppNavigator" and "MainNavigator") is used for the primary
 * navigation flows of your app.
 * Generally speaking, it will contain an auth flow (registration, login, forgot password)
 * and a "main" flow which the user will use once logged in.
 */
import { ComponentProps, useEffect } from "react"
import { createDrawerNavigator } from "@react-navigation/drawer"
import { NavigationContainer } from "@react-navigation/native"
import { createNativeStackNavigator, NativeStackScreenProps } from "@react-navigation/native-stack"
import { useSelector } from "@xstate/react"

import { AppDrawer } from "@/components/AppDrawer"
import Config from "@/config"
import { ErrorBoundary } from "@/screens/ErrorScreen/ErrorBoundary"
import { LoginScreen } from "@/screens/LoginScreen"
import { PrivacyPolicyScreen } from "@/screens/PrivacyPolicyScreen"
import { SettingsScreen } from "@/screens/SettingsScreen"
import { SyncSettingsScreen } from "@/screens/SyncSettingsScreen"
import { startSync } from "@/services/syncService"
import { languageStore } from "@/store/language"
import { providerStore } from "@/store/provider"
import { useAppTheme } from "@/theme/context"

import { AppointmentNavigator } from "./AppointmentNavigator"
import { navigationRef, useBackButtonHandler } from "./navigationUtilities"
import { PatientNavigator } from "./PatientNavigator"

/**
 * This type allows TypeScript to know what routes are defined in this navigator
 * as well as what properties (if any) they might take when navigating to them.
 *
 * For more information, see this documentation:
 *   https://reactnavigation.org/docs/params/
 *   https://reactnavigation.org/docs/typescript#type-checking-the-navigator
 *   https://reactnavigation.org/docs/typescript/#organizing-types
 */
export type AppStackParamList = {
  Welcome: undefined
  Login: undefined
  PrivacyPolicy: undefined
  Settings: undefined
  Patients: undefined
  Appointment: undefined
  NewVisit: undefined
  EventForm: undefined
  PatientVisitsList: undefined
  FormEventsList: undefined
  VisitEventsList: { patientId: string; visitId: string; visitTimestamp?: number }
  PatientRegistrationForm: { editPatientId?: string }
  SyncSettings: undefined
  // IGNITE_GENERATOR_ANCHOR_APP_STACK_PARAM_LIST
}

/**
 * This is a list of all the route names that will exit the app if the back button
 * is pressed while in that screen. Only affects Android.
 */
const exitRoutes = Config.exitRoutes

export type AppStackScreenProps<T extends keyof AppStackParamList> = NativeStackScreenProps<
  AppStackParamList,
  T
>

// Documentation: https://reactnavigation.org/docs/stack-navigator/
const Stack = createNativeStackNavigator<AppStackParamList>()

const Drawer = createDrawerNavigator()

const AppStack = () => {
  const {
    theme: { colors },
  } = useAppTheme()

  const provider = useSelector(providerStore, (state) => state.context)
  const { isRTL } = useSelector(languageStore, (state) => state.context)

  // Check if the provider is signed in
  const isSignedIn = useSelector(providerStore, (state) => {
    const { id, name, email } = state.context
    return !!id && !!name && !!email
  })

  useEffect(() => {
    if (isSignedIn) {
      startSync(provider.email).catch((err) => {
        console.log("Failed to start sync:", err)
      })
    }
  }, [isSignedIn, provider.email])

  // FIXME: perform better check
  if (!isSignedIn) {
    return (
      <Stack.Navigator
        initialRouteName="Login"
        screenOptions={{
          headerShown: false,
          navigationBarColor: colors.background,
          contentStyle: {
            backgroundColor: colors.background,
          },
        }}
      >
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} />
      </Stack.Navigator>
    )
  }

  const drawerPosition = isRTL ? "right" : "left"

  return (
    <Drawer.Navigator
      drawerContent={(props) => <AppDrawer {...props} />}
      screenOptions={{
        headerShown: false,
        drawerStyle: {
          backgroundColor: colors.background,
        },
        drawerPosition,
      }}
    >
      <Drawer.Screen name="Patients" component={PatientNavigator} />
      <Drawer.Screen name="Settings" component={SettingsScreen} />
      <Drawer.Screen
        name="SyncSettings"
        options={{ title: "Sync Settings", headerShown: true }}
        component={SyncSettingsScreen}
      />
      <Drawer.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} />
      <Drawer.Screen name="Appointment" component={AppointmentNavigator} />
    </Drawer.Navigator>
  )
}

export interface NavigationProps
  extends Partial<ComponentProps<typeof NavigationContainer<AppStackParamList>>> {}

export const AppNavigator = (props: NavigationProps) => {
  const { navigationTheme } = useAppTheme()

  useBackButtonHandler((routeName) => exitRoutes.includes(routeName))

  return (
    <NavigationContainer ref={navigationRef} theme={navigationTheme} {...props}>
      <ErrorBoundary catchErrors={Config.catchErrors}>
        <AppStack />
      </ErrorBoundary>
    </NavigationContainer>
  )
}
