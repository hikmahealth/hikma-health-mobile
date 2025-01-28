// import "./wdr"
import App from "./app/app"
import React from "react"
import * as SplashScreen from "expo-splash-screen"
import * as Sentry from "@sentry/react-native"
import Config from "react-native-config"
import codePush from "react-native-code-push"
// import { captureConsoleIntegration } from "@sentry/integrations"

Sentry.init({
  dsn: Config.SENTRY_DSN,
  // Set tracesSampleRate to 1.0 to capture 100% of transactions for tracing.
  // We recommend adjusting this value in production.
  tracesSampleRate: 1.0,
  // integrations: [captureConsoleIntegration({ levels: ["error"] })],
  _experiments: {
    // profilesSampleRate is relative to tracesSampleRate.
    // Here, we'll capture profiles for 100% of transactions.
    profilesSampleRate: 1.0,
  },
})

SplashScreen.preventAutoHideAsync()

function IgniteApp() {
  return <App hideSplashScreen={SplashScreen.hideAsync} />
}

let codePushOptions = {
  updateDialog: true,
  checkFrequency: codePush.CheckFrequency.ON_APP_RESUME,
  installMode: codePush.InstallMode.IMMEDIATE,
}
export default Sentry.wrap(codePush(codePushOptions)(IgniteApp))
