/**
 * The app navigator (formerly "AppNavigator" and "MainNavigator") is used for the primary
 * navigation flows of your app.
 * Generally speaking, it will contain an auth flow (registration, login, forgot password)
 * and a "main" flow which the user will use once logged in.
 */
import { DarkTheme, DefaultTheme, NavigationContainer } from "@react-navigation/native"
import { createNativeStackNavigator, NativeStackScreenProps } from "@react-navigation/native-stack"
import { observer } from "mobx-react-lite"
import React from "react"
import { Alert, AppState, NativeModules, Pressable, StatusBar, useColorScheme } from "react-native"
import * as Screens from "app/screens"
import Config from "../config"
import { navigationRef, useBackButtonHandler } from "./navigationUtilities"
import { colors } from "app/theme"
import { useStores } from "app/models"
import { translate } from "app/i18n"
import { ArrowUpDownIcon, AxeIcon, LoaderIcon, Settings2Icon } from "lucide-react-native"
import { syncDB } from "app/db/sync"
import { hasUnsyncedChanges } from "@nozbe/watermelondb/sync"
import database from "app/db"
import { on } from "@nozbe/watermelondb/QueryDescription"
import { View } from "app/components"
import { PatientRecord } from "app/types"
import PatientModel from "app/db/model/Patient"
import { SafeAreaView } from "react-native-safe-area-context"

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
  }
  EventForm: {
    patientId: string
    formId: string
    visitId: string | null
    eventId: string | null
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

    syncDB(
      hasLocalChangesToPush,
      sync.startSync,
      sync.startResolve,
      sync.startPush,
      console.log,
      sync.errorSync,
      sync.finishSync,
    )
  }

  const isSignedIn = provider.isSignedIn

  return (
    <Stack.Navigator
      screenOptions={({ navigation }) => ({
        headerShown: true,
        navigationBarColor: colors.background,
        orientation: "all",
        headerStyle: { backgroundColor: colors.background },
        headerRight: () => (
          <View direction="row" gap={10}>
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
              title: translate("patients"),
            }}
            name="PatientsList"
            component={Screens.PatientsListScreen}
          />
          <Stack.Screen
            name="PatientRegistrationForm"
            options={{
              title: translate("newPatient.newPatient"),
            }}
            component={Screens.PatientRegistrationFormScreen}
          />
          <Stack.Screen
            name="PatientRecordEditor"
            options={{
              title: translate("newPatient.newPatient"),
            }}
            component={Screens.PatientRecordEditorScreen}
          />
          <Stack.Screen
            options={{
              title: translate("patientFile.patientView"),
            }}
            name="PatientView"
            component={Screens.PatientViewScreen}
          />
          <Stack.Screen
            name="NewVisit"
            options={{
              title: translate("newVisit.newVisit"),
            }}
            component={Screens.NewVisitScreen}
          />
          <Stack.Screen
            name="EventForm"
            options={{
              title: translate("eventList.newEntry"),
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
          {/* IGNITE_GENERATOR_ANCHOR_APP_STACK_SCREENS */}
        </Stack.Group>
      )}
      <Stack.Screen
        options={{
          title: "Privacy Policy",
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
