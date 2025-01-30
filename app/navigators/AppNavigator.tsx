/**
 * The app navigator (formerly "AppNavigator" and "MainNavigator") is used for the primary
 * navigation flows of your app.
 * Generally speaking, it will contain an auth flow (registration, login, forgot password)
 * and a "main" flow which the user will use once logged in.
 */
import { DarkTheme, DefaultTheme, NavigationContainer } from "@react-navigation/native"
import { createNativeStackNavigator, NativeStackScreenProps } from "@react-navigation/native-stack"
import { observer } from "mobx-react-lite"
import React, { useEffect } from "react"
import * as Sentry from "@sentry/react-native"
import { Alert, AppState, NativeModules, Pressable, StatusBar, useColorScheme } from "react-native"
import * as Screens from "../screens"
import Config from "../config"
import { navigationRef, useBackButtonHandler } from "./navigationUtilities"
import { colors, spacing } from "../theme"
import { useStores } from "../models"
import { translate } from "../i18n"
import { Text } from "../components"
import {
  ArrowUpDownIcon,
  AxeIcon,
  LoaderIcon,
  LucideCalendar,
  LucidePillBottle,
  LucideTrash2,
  Settings2Icon,
} from "lucide-react-native"
import { syncDB } from "../db/sync"
import { hasUnsyncedChanges } from "@nozbe/watermelondb/sync"
import database from "../db"
import { on } from "@nozbe/watermelondb/QueryDescription"
import { View } from "../components"
import { PatientRecord } from "../types"
import PatientModel from "../db/model/Patient"
import { SafeAreaView } from "react-native-safe-area-context"
import AppointmentModel from "../db/model/Appointment"
import { api } from "../services/api"
import Toast from "react-native-root-toast"
import { getHHApiUrl } from "../utils/storage"
import { PrescriptionStatus } from "../db/model/Prescription"

/**
 * This type allows TypeScript to know what routes are defined in this navigator
 * as well as what properties (if any) they might take when navigating to them.
 *
 * If no params are allowed, pass through `undefined`. Generally speaking, we
 * recommend using your MobX-State-Tree store(s) to keep application state
 * rather than passing state through navigation params.
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
  PatientsList: undefined
  // @depricated
  PatientRegistrationForm: { editPatientId?: string }
  PatientRecordEditor: { editPatientId?: string }
  PatientView: { patientId: string; patient?: PatientModel }
  NewVisit: {
    patientId: string
    visitId: string | null
    visitDate: number // timestamp
    appointmentId: string | null // A visit can be created from an appointment
  }
  EventForm: {
    patientId: string
    formId: string
    visitId: string | null
    eventId: string | null
    appointmentId: string | null // passed if the event is part of an appointment
    visitDate: number // timestamp
  }
  PatientVisitsList: {
    patientId: string
  }
  VisitEventsList: {
    visitId: string
    patientId: string
    visitDate: number // timestamp
  }
  FormEventsList: {
    patientId: string
    formId: string
  }
  Settings: undefined
  Feedback: undefined
  Reports: undefined
  AppointmentsList: undefined
  AppointmentView: {
    appointmentId: string
  }
  AppointmentEditorForm: {
    visitId: string | null | undefined
    patientId: string
    visitDate: number
  }
  PrescriptionEditorForm: {
    visitId: string | null | undefined
    patientId: string
    visitDate: number
  }
  PrescriptionsList: undefined
  PatientPrescriptionsList: {
    patientId: string
    defaultStatus: PrescriptionStatus
  }
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

const AppStack = observer(function AppStack() {
  const { provider, sync, appState } = useStores()

  const isSyncing = sync.state !== "idle"
  const startSync = async () => {
    if (provider.email === "tester.g@gmail.com") {
      return Alert.alert("Please sign in with your server to continue syncing")
    }
    const hasLocalChangesToPush = await hasUnsyncedChanges({ database })

    Toast.show(translate("syncingStarted"), {
      position: Toast.positions.BOTTOM,
      containerStyle: {
        marginBottom: 100,
      },
    })

    syncDB(
      hasLocalChangesToPush,
      sync.startSync,
      sync.startResolve,
      sync.startPush,
      console.log,
      sync.errorSync,
      sync.finishSync,
    ).catch((err) => {
      sync.setProp("state", "idle")
      console.error(err)
      Toast.show(
        "❌ Error syncing. Please make sure you have internet or contact your administrator.",
        {
          position: Toast.positions.BOTTOM,
          containerStyle: {
            marginBottom: 100,
          },
          duration: Toast.durations.LONG,
        },
      )
      Sentry.captureException(err)
    })
  }

  const cancelAppointment = (navigation: any, appointmentId: string) => {
    Alert.alert(
      "Cancel Appointment",
      "Are you sure you want to cancel this appointment?",
      [
        {
          text: translate("yes"),
          onPress: () => {
            api
              .cancelAppointment(appointmentId)
              .then((res) => {
                Toast.show("✅ Appointment cancelled", {
                  position: Toast.positions.BOTTOM,
                  containerStyle: {
                    marginBottom: 100,
                  },
                })
                navigation.goBack()
              })
              .catch((err) => {
                Toast.show("❌ Error cancelling appointment", {
                  position: Toast.positions.BOTTOM,
                  containerStyle: {
                    marginBottom: 100,
                  },
                })
                console.log(err)
              })
          },
        },
      ],
      {
        cancelable: true,
      },
    )
  }

  // TODO: Add check for valid or even existing backend api
  const isSignedIn = provider.isSignedIn

  useEffect(() => {
    if (isSignedIn) {
      // Set the sentry user
      // TODO: Bring this back with the development of transparency tracking. Once implemented, if the user does not give permissions, do not set the user.
      // Sentry.setUser({
      //   email: provider.email,
      //   id: provider.id,
      // })
      getHHApiUrl()
        .then((url) => {
          if (url) {
            startSync()
          } else {
            Alert.alert("Please activate your app on the administrator portal to continue syncing")
          }
        })
        .catch((err) => {
          console.log(err)
          Alert.alert("Please activate your app on the administrator portal to continue syncing")
        })
    }
  }, [isSignedIn])

  return (
    <Stack.Navigator
      screenOptions={({ navigation }) => ({
        headerShown: true,
        navigationBarColor: colors.background,
        orientation: "all",
        headerStyle: { backgroundColor: colors.background },
        headerRight: () => (
          <View direction="row" gap={12}>
            {isSyncing ? (
              <Pressable
                onPress={() => {
                  sync.setProp("state", "idle")
                  sync.setProp("error", null)
                }}
              >
                <LoaderIcon size={24} color="black" />
              </Pressable>
            ) : (
              <Pressable onPress={startSync}>
                <ArrowUpDownIcon size={24} color="black" />
              </Pressable>
            )}
            <Pressable onPress={() => navigation.navigate("AppointmentsList")}>
              <LucideCalendar size={24} color="black" />
            </Pressable>
            <Pressable onPress={() => navigation.navigate("PrescriptionsList")}>
              <LucidePillBottle size={24} color="black" />
            </Pressable>
            <Pressable onPress={() => navigation.navigate("Settings")}>
              <Settings2Icon size={24} color="black" />
            </Pressable>
          </View>
        ),
      })}
    >
      {/* <Stack.Screen name="Welcome" component={Screens.WelcomeScreen} /> */}
      {!isSignedIn ? (
        <Stack.Group>
          <Stack.Screen
            name="Login"
            options={{ headerShown: false }}
            component={Screens.LoginScreen}
          />
        </Stack.Group>
      ) : (
        <Stack.Group>
          <Stack.Screen
            options={{
              title: translate("common:patients"),
            }}
            name="PatientsList"
            component={Screens.PatientsListScreen}
          />
          <Stack.Screen
            name="PatientRegistrationForm"
            options={{
              title: translate("newPatient:newPatient"),
            }}
            component={Screens.PatientRegistrationFormScreen}
          />
          <Stack.Screen
            name="PatientRecordEditor"
            options={{
              title: translate("newPatient:newPatient"),
            }}
            component={Screens.PatientRecordEditorScreen}
          />
          <Stack.Screen
            options={{
              title: translate("patientFile:patientView"),
            }}
            name="PatientView"
            component={Screens.PatientViewScreen}
          />
          <Stack.Screen
            name="NewVisit"
            options={{
              title: translate("newVisit:newVisit"),
            }}
            component={Screens.NewVisitScreen}
          />
          <Stack.Screen
            name="EventForm"
            options={{
              title: translate("eventList:newEntry"),
            }}
            component={Screens.EventFormScreen}
          />
          <Stack.Screen name="PatientVisitsList" component={Screens.PatientVisitsListScreen} />
          <Stack.Screen name="VisitEventsList" component={Screens.VisitEventsListScreen} />
          <Stack.Screen name="FormEventsList" component={Screens.FormEventsListScreen} />
          <Stack.Screen
            name="Settings"
            options={{
              title: "More",
            }}
            component={Screens.SettingsScreen}
          />
          <Stack.Screen name="Feedback" component={Screens.FeedbackScreen} />
          <Stack.Screen name="Reports" component={Screens.ReportsScreen} />
          <Stack.Screen
            name="AppointmentsList"
            component={Screens.AppointmentsListScreen}
            options={{
              title: translate("common:appointments"),
            }}
          />
          <Stack.Screen
            name="AppointmentView"
            component={Screens.AppointmentViewScreen}
            options={({ navigation, route }) => {
              return {
                presentation: "modal",
                title: "",
                headerRight: () => (
                  <View>
                    <Pressable
                      onPress={() => cancelAppointment(navigation, route.params.appointmentId)}
                    >
                      <View direction="row" gap={spacing.xs} alignItems="center">
                        <LucideTrash2 color={colors.palette.angry500} size={20} />
                        <Text tx="common:cancelAppointment" />
                      </View>
                    </Pressable>
                  </View>
                ),
              }
            }}
          />
          <Stack.Screen
            name="AppointmentEditorForm"
            options={{
              title: translate("appointmentEditorForm:title"),
            }}
            component={Screens.AppointmentEditorFormScreen}
          />
          <Stack.Screen
            name="PrescriptionEditorForm"
            component={Screens.PrescriptionEditorFormScreen}
            options={{
              title: "Prescriptions",
            }}
          />
          <Stack.Screen
            name="PrescriptionsList"
            options={{
              title: "Prescriptions",
            }}
            component={Screens.PrescriptionsListScreen}
          />
          <Stack.Screen
            name="PatientPrescriptionsList"
            component={Screens.PatientPrescriptionsListScreen}
            options={{
              title: "Prescriptions",
            }}
          />
          {/* IGNITE_GENERATOR_ANCHOR_APP_STACK_SCREENS */}
        </Stack.Group>
      )}
      <Stack.Screen
        options={{
          title: translate("settingsScreen:privacyPolicy"),
          presentation: "modal",
          headerRight: undefined,
        }}
        name="PrivacyPolicy"
        component={Screens.PrivacyPolicyScreen}
      />
    </Stack.Navigator>
  )
})

export interface NavigationProps
  extends Partial<React.ComponentProps<typeof NavigationContainer>> {}

export const AppNavigator = observer(function AppNavigator(props: NavigationProps) {
  const colorScheme = useColorScheme()
  const { appState, provider } = useStores()

  useBackButtonHandler((routeName) => exitRoutes.includes(routeName))

  const isSignedIn = provider.isSignedIn

  // TODO: on app minimize, set the app state last active time
  // TODO: on app resume check if the last active time is more than 5 minutes, if so, show the lock screen if the app state enables locking
  AppState.addEventListener("change", (nextAppState) => {
    if (nextAppState === "active") {
      console.log("App has come to the foreground!")

      // if the app is locked, dont set the last active time to null
      if (!appState.isLocked) {
        appState.setProp("lastActiveTime", null)
      }
    }
    if (nextAppState === "background") {
      console.log("App has gone to the background!")
      appState.setProp("lastActiveTime", new Date().getTime())
    }
  })

  return (
    <>
      <SafeAreaView
        edges={
          NativeModules.PlatformConstants?.InterfaceOrientation?.portrait
            ? ["top", "bottom"]
            : ["left", "right"]
        }
        style={{ flex: 1 }}
      >
        <StatusBar backgroundColor={colors.background} />
        <NavigationContainer
          ref={navigationRef}
          // theme={colorScheme === "dark" ? DarkTheme : DefaultTheme}
          theme={DefaultTheme}
          {...props}
        >
          <AppStack />
        </NavigationContainer>
        {isSignedIn && appState.isLocked && <Screens.AppLockedScreen />}
      </SafeAreaView>
    </>
  )
})
