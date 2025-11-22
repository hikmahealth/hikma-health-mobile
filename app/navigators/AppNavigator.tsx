/**
 * The app navigator (formerly "AppNavigator" and "MainNavigator") is used for the primary
 * navigation flows of your app.
 * Generally speaking, it will contain an auth flow (registration, login, forgot password)
 * and a "main" flow which the user will use once logged in.
 */
import { ComponentProps, useEffect } from "react"
import * as SecureStore from "expo-secure-store"
import { useNetInfo } from "@react-native-community/netinfo"
import { createDrawerNavigator } from "@react-navigation/drawer"
import { NavigationContainer } from "@react-navigation/native"
import { createNativeStackNavigator, NativeStackScreenProps } from "@react-navigation/native-stack"
import * as Sentry from "@sentry/react-native"
import { useSelector } from "@xstate/react"

import { AppDrawer } from "@/components/AppDrawer"
import Config from "@/config"
import User from "@/models/User"
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
import { PharmacyNavigator } from "./PharmacyNavigator"
import { navigationRef, useBackButtonHandler } from "./navigationUtilities"
import { PatientNavigator } from "./PatientNavigator"
import { getHHApiUrl } from "@/utils/storage"

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
  VitalHistory: undefined
  VitalForm: undefined
  AppointmentEditorForm: undefined
  AppointmentView: undefined
  PharmacyView: undefined
  PatientPrescriptionsList: undefined
  PrescriptionEditorForm: undefined
  VisitPrescriptions: undefined
  PrescriptionView: undefined
  DispensePrescriptionItem: undefined
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
    setThemeContextOverride,
  } = useAppTheme()

  useEffect(() => {
    setThemeContextOverride("light")
  }, [])

  const { isInternetReachable } = useNetInfo()

  const provider = useSelector(providerStore, (state) => state.context)
  const { isRTL } = useSelector(languageStore, (state) => state.context)

  // Check if the provider is signed in
  const isSignedIn = useSelector(providerStore, (state) => {
    const { id, name, email } = state.context
    return !!id && !!name && !!email
  })

  useEffect(() => {
    if (isSignedIn) {
      // If there is internet, send email and password to server to re-authenticate
      // ONly run the below if there is access to internet
      if (isInternetReachable) {
        getHHApiUrl().then(async (api) => {
          console.log("Re-Signing in")
          if (!api) {
            // HANDLE API NOT FOUND
            return
          }

          const email = await SecureStore.getItemAsync("provider_email")
          const password = await SecureStore.getItemAsync("provider_password")

          console.log("Email:", email)
          console.log("Password:", password)

          if (!email || !password) {
            // HANDLE EMAIL OR PASSWORD NOT FOUND
            return
          }

          await User.signIn(email, password)
            .then((res) => {
              // a provider is present
              if (res.id) {
                // HANDLE SUCCESSFUL SIGN IN
              } else {
                // HANDLE FAILED SIGN IN
              }
            })
            .catch((err) => {
              // HANDLE SIGN IN ERROR
              Sentry.captureException(err, {
                level: "warning",
                extra: {
                  message:
                    "Failed sign in on re-authentication. App store has user, but failed to re-authenticate them",
                },
              })

              // TODO: possibly sign the user out.
            })
            .finally(() => {
              // HANDLE FINALLY
            })
        })
      }
      startSync(provider.email)
        // .then(() => {
        // Second sync ensures we get any server computed values. We need this for correct stock count values.
        // return startSync(provider.email)
        // })
        .catch((err) => {
          console.log("Failed to start sync:", err)
          Sentry.captureException(err, {
            level: "error",
            extra: {
              message: "Failed to start sync",
            },
          })
        })
    }
  }, [isSignedIn, provider.email, isInternetReachable])

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
      <Drawer.Screen name="Pharmacy" component={PharmacyNavigator} />
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
