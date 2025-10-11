import "@expo/metro-runtime" // this is for fast refresh on web w/o expo-router
import { LogBox } from "react-native"
import { registerRootComponent } from "expo"
import * as Sentry from "@sentry/react-native"
import { LaunchArguments } from "react-native-launch-arguments"

import { App } from "@/app"

if (LaunchArguments.value().isE2E) {
  LogBox.ignoreAllLogs()
}

const sentryDsnDev = process.env.EXPO_PUBLIC_SENTRY_DSN_DEV
const sentryDsnProd = process.env.EXPO_PUBLIC_SENTRY_DSN

Sentry.init({
  dsn: __DEV__ ? sentryDsnDev : sentryDsnProd,
  // Set tracesSampleRate to 1.0 to capture 100% of transactions for tracing.
  // We recommend adjusting this value in production.
  tracesSampleRate: 1.0,
  environment: __DEV__ ? "development" : "production",
  // integrations: [captureConsoleIntegration({ levels: ["error"] })],
  _experiments: {
    // profilesSampleRate is relative to tracesSampleRate.
    // Here, we'll capture profiles for 100% of transactions.
    profilesSampleRate: 1.0,
  },
})

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(__DEV__ ? App : Sentry.wrap(App))
