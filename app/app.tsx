/* eslint-disable import/first */
/**
 * Welcome to the main entry point of the app. In this file, we'll
 * be kicking off our app.
 *
 * Most of this file is boilerplate and you shouldn't need to modify
 * it very often. But take some time to look through and understand
 * what is going on here.
 *
 * The app navigation resides in ./app/navigators, so head over there
 * if you're interested in adding screens and navigators.
 */
if (__DEV__) {
  // Load Reactotron in development only.
  // Note that you must be using metro's `inlineRequires` for this to work.
  // If you turn it off in metro.config.js, you'll have to manually import it.
  require("./devtools/ReactotronConfig.ts")
}
import "react-native-get-random-values"
import "./utils/gestureHandler"

import "@/db"
import { useEffect, useState } from "react"
import { useFonts } from "expo-font"
import * as Linking from "expo-linking"
import * as SecureStorage from "expo-secure-store"
import { useSelector } from "@xstate/react"
import { Option } from "effect"
import { KeyboardProvider } from "react-native-keyboard-controller"
import { RootSiblingParent } from "react-native-root-siblings"
import { initialWindowMetrics, SafeAreaProvider } from "react-native-safe-area-context"

import { initI18n } from "./i18n"
import UserClinicPermissions from "./models/UserClinicPermissions"
import { AppNavigator } from "./navigators/AppNavigator"
import { useNavigationPersistence } from "./navigators/navigationUtilities"
import Peer from "./models/Peer"
import { hydrateAppState } from "./store/appState"
import { languageStore } from "./store/language"
import { providerStore } from "./store/provider"
import { QueryProvider } from "./providers/QueryProvider"
import { DataAccessProvider } from "./providers/DataAccessProvider"
import { useOperationModeInit } from "./hooks/useOperationModeInit"
import { ThemeProvider, useAppTheme } from "./theme/context"
import { customFontsToLoad } from "./theme/typography"
import { loadDateFnsLocale } from "./utils/formatDate"
import { logger } from "./utils/logger"
import * as storage from "./utils/storage"

export const NAVIGATION_PERSISTENCE_KEY = "NAVIGATION_STATE"

// Web linking configuration
const prefix = Linking.createURL("/")
const config = {
  screens: {
    Login: {
      path: "",
    },
    Welcome: "welcome",
    Demo: {
      screens: {
        DemoShowroom: {
          path: "showroom/:queryIndex?/:itemIndex?",
        },
        DemoDebug: "debug",
        DemoPodcastList: "podcast",
        DemoCommunity: "community",
      },
    },
  },
}

/**
 * This is the root component of our app.
 * @param {AppProps} props - The props for the `App` component.
 * @returns {JSX.Element} The rendered `App` component.
 */
export function App() {
  const {
    initialNavigationState,
    onNavigationStateChange,
    isRestored: isNavigationStateRestored,
  } = useNavigationPersistence(storage, NAVIGATION_PERSISTENCE_KEY)

  const language = useSelector(languageStore, (state) => state.context.language)

  const [areFontsLoaded, fontLoadError] = useFonts(customFontsToLoad)
  const [isI18nInitialized, setIsI18nInitialized] = useState(false)
  const [isProviderStoreInitialized, setIsProviderStoreInitialized] = useState(false)

  useOperationModeInit()

  useEffect(() => {
    hydrateAppState()
    // Migrate legacy SecureStore API URL → Peer table (one-time, safe to call repeatedly)
    Peer.migrateFromLegacyApiUrl().catch(console.error)
  }, [])

  useEffect(() => {
    initI18n(Option.some(language || "en-US"))
      .then(() => setIsI18nInitialized(true))
      .then(() => loadDateFnsLocale())
  }, [])

  useEffect(() => {
    // Restore the provider store from SecureStore on cold start.
    // Cloud re-authentication is handled later by AppNavigator (gated by peer type),
    // so this effect only needs to hydrate the store from cached data.
    const loadProviderStore = async () => {
      try {
        const storedProvider = await SecureStorage.getItemAsync("providerStore")
        const email = await SecureStorage.getItemAsync("provider_email")
        const password = await SecureStorage.getItemAsync("provider_password")

        logger.warn("First one 🚩🚩🚩: ", { storedProvider, email, password })

        // Fallback to old storage method for backward compatibility
        let credentials = { email: "", password: "" }
        const storedCredentials = await SecureStorage.getItemAsync("providerCredentials")
        if (storedCredentials) {
          credentials = JSON.parse(storedCredentials)
        }

        const finalEmail = email || credentials.email
        const finalPassword = password || credentials.password

        logger.warn("🚩🚩🚩: ", { storedProvider, finalEmail, finalPassword })

        if (storedProvider && finalEmail && finalPassword) {
          const payload = JSON.parse(storedProvider)
          providerStore.send({
            type: "set_provider",
            id: payload.id,
            name: payload.name,
            email: payload.email,
            role: Option.fromNullable(payload.role),
            instance_url: Option.fromNullable(payload.instance_url),
            clinic_id: Option.fromNullable(payload.clinic_id),
            clinic_name: Option.fromNullable(payload.clinic_name),
            permissions: Option.none<UserClinicPermissions.T>(),
          })
        } else {
          providerStore.send({ type: "reset" })
        }
      } catch (error) {
        console.error("Failed to load provider store:", error)
        providerStore.send({ type: "reset" })
      }
    }

    loadProviderStore().finally(() => setIsProviderStoreInitialized(true))
  }, [])

  // Before we show the app, we have to wait for our state to be ready.
  // In the meantime, don't render anything. This will be the background
  // color set in native by rootView's background color.
  // In iOS: application:didFinishLaunchingWithOptions:
  // In Android: https://stackoverflow.com/a/45838109/204044
  // You can replace with your own loading component if you wish.
  if (
    !isNavigationStateRestored ||
    !isI18nInitialized ||
    (!areFontsLoaded && !fontLoadError) ||
    !isProviderStoreInitialized
  ) {
    return null
  }

  const linking = {
    prefixes: [prefix],
    config,
  }

  // otherwise, we're ready to render the app
  return (
    <QueryProvider>
      <DataAccessProvider>
        <RootSiblingParent>
          <SafeAreaProvider initialMetrics={initialWindowMetrics}>
            <KeyboardProvider>
              <ThemeProvider>
                <AppNavigator
                  linking={linking}
                  initialState={initialNavigationState}
                  onStateChange={onNavigationStateChange}
                />
              </ThemeProvider>
            </KeyboardProvider>
          </SafeAreaProvider>
        </RootSiblingParent>
      </DataAccessProvider>
    </QueryProvider>
  )
}
