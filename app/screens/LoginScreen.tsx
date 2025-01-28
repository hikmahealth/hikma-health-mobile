import React, { FC, useEffect, useState } from "react"
import { observer } from "mobx-react-lite"
import { BarCodeScanner } from "expo-barcode-scanner"
import {
  ViewStyle,
  useColorScheme,
  Image,
  Dimensions,
  Alert,
  StyleSheet,
  Pressable,
  BackHandler,
  Linking,
} from "react-native"
import { AppStackScreenProps } from "../navigators"
import EncryptedStorage from "react-native-encrypted-storage"
import { Button, LanguageToggle, Screen, Text, TextField, View } from "../components"
import { translate } from "../i18n"
import { hasUnsyncedChanges } from "@nozbe/watermelondb/sync"
import { InfoIcon, QrCodeIcon } from "lucide-react-native"
import { useImmer } from "use-immer"
import { colors } from "../theme"
import { useStores } from "../models"
import database from "../db/"
import { SafeAreaView } from "react-native-safe-area-context"
import { getHHApiUrl } from "../utils/storage"
import Config from "react-native-config"

const { height, width } = Dimensions.get("window")

const HIKMA_API_TESTING = Config.HIKMA_API_TESTING
// import { useNavigation } from "@react-navigation/native"
// import { useStores } from "../models"

const GOOGLE_TESTER_EMAIL = "test-user@hikmahealth.org"
const GOOGLE_TESTER_PASSWORD = "HikmaTester4"

function isGoogleTester(email: string, password: string) {
  return email === GOOGLE_TESTER_EMAIL && password === GOOGLE_TESTER_PASSWORD
}

interface LoginScreenProps extends AppStackScreenProps<"Login"> {}

export const LoginScreen: FC<LoginScreenProps> = observer(function LoginScreen({ navigation }) {
  // Pull in one of our MST stores
  const { provider, language } = useStores()
  const [cameraActive, setCameraActive] = useState<boolean>(false)
  const [hasPermission, setHasPermission] = useState<boolean | null>(null)
  const [scanned, setScanned] = useState(false)

  // Pull in navigation via hook
  // const navigation = useNavigation()

  const isDarkmode = useColorScheme() === "dark"
  const [creds, updateCreds] = useImmer({
    email: "",
    password: "",
  })
  const [isLoading, setIsLoading] = useState(false)

  const openPrivacyPolicy = () => {
    console.warn("openPrivacyPolicy")
    navigation.navigate("PrivacyPolicy")
  }

  const openCamera = async () => {
    setScanned(false)
    const { status } = await BarCodeScanner.requestPermissionsAsync()
    if (status === "granted") {
      setCameraActive(true)
    } else {
      Alert.alert(translate("login.requiredCameraPermissions"))
    }
  }

  const handleBarCodeScanned = async ({ type, data }: { data: string; type: number }) => {
    setScanned(true)

    let canOpen = false
    try {
      await fetch(data, { method: "HEAD" })
      canOpen = true
    } catch (error) {
      console.error("Error checking URL:", error)
      canOpen = false
    }

    if (canOpen) {
      await EncryptedStorage.setItem("HIKMA_API", data)
      setCameraActive(false)
      Alert.alert(translate("login.qrCodeRegistered"))
    } else {
      await EncryptedStorage.removeItem("HIKMA_API")
      Alert.alert(translate("login.invalidQRCode"))
      setCameraActive(false)
    }
  }

  /**
   * Handle the user sign in process depending on the type of sign in
   * @returns
   */
  const handleSignIn = async () => {
    if (isLoading) return
    const isGoogle = isGoogleTester(creds.email, creds.password)
    if (isGoogle) {
      Alert.alert(
        "You are about to sign in as a Tester",
        "Authenticating as a tester will allow you to use the app using our testing backend, meanin you do not need your own server. Please do not attempt to enter real patient data, as test data is regularly cleared out the test server. Do you want to continue?",
        [
          {
            text: "Cancel",
            onPress: () => console.log("Cancel Pressed"),
            style: "cancel",
          },
          {
            text: "Continue as Tester",
            onPress: () => {
              // User wants to continue as a tester
              if (typeof HIKMA_API_TESTING === "string") {
                handleBarCodeScanned({ data: HIKMA_API_TESTING, type: 0 }).then(() => {
                  signIn()
                })
              } else {
                Alert.alert(
                  "No testing backend URL found. Please refer to our documentation for more information at https://docs.hikmahealth.org/docs/try-demo",
                )
              }
            },
          },
        ],
        { cancelable: false },
      )
    } else {
      signIn()
    }
  }

  const signIn = async () => {
    const HIKMA_API = await getHHApiUrl()
    if (!HIKMA_API) {
      Alert.alert(translate("login.invalidQRMessage"))
      return
    }
    if (creds.email.length < 4 || creds.password.length < 4)
      return Alert.alert("Invalid email or password")
    setIsLoading(true)

    try {
      console.warn({ email: creds.email, password: creds.password })
      const response = await fetch(`${HIKMA_API}/api/login`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(creds),
      })
      const result = await response.json()
      setIsLoading(false)

      if (response.status === 200 && result.message === undefined) {
        provider.setProvider(result)

        // The backend requires that the password and email be sent with every request
        // The devices could be offline for a very long time, so we store the password and email in encrypted storage.
        // Long enough for tokens to expire, and the user to be logged out.
        EncryptedStorage.setItem("provider_password", creds.password)
        EncryptedStorage.setItem("provider_email", creds.email)

        // Handle database sync, and show modal when syncing is happening to prevent other kinds of interaction while data is being sent to db
        try {
          const hasLocalChangesToPush = await hasUnsyncedChanges({ database })
          console.warn({ hasLocalChangesToPush })
        } catch (e) {
          console.error(e)
        }
      } else {
        console.error({ error: response })
        Alert.alert(translate("login.invalidCredentials"))
      }
    } catch (e) {
      console.error(e)
      setIsLoading(false)
      // TODO: translate
      Alert.alert(translate("login.errorConnectingToDB"))
    }
  }

  useEffect(() => {
    const getBarCodeScannerPermissions = async () => {
      const { status } = await BarCodeScanner.requestPermissionsAsync()
      setHasPermission(status === "granted")
    }

    getBarCodeScannerPermissions()
  }, [])

  useEffect(() => {
    const backAction = () => {
      if (cameraActive) {
        setCameraActive(false)
        return true
      }
      return false
    }
    // on back press of the phone, close the camera, if camera is closed, go back
    const backHandler = BackHandler.addEventListener("hardwareBackPress", backAction)

    return () => {
      backHandler.remove()
    }
  }, [cameraActive])

  const launchIcon = require("./../assets/images/launch_icon.png")
  // isDarkmode
  //   ? require("./../assets/images/logo_no_text.png")
  //   : require("./../assets/images/launch_icon.png")

  if (cameraActive && hasPermission) {
    return (
      <View style={{ height, width }}>
        <BarCodeScanner
          onBarCodeScanned={scanned ? undefined : handleBarCodeScanned}
          style={StyleSheet.absoluteFillObject}
        />
      </View>
    )
  }

  return (
    <SafeAreaView style={{ flex: 1 }} edges={["bottom", "left", "right"]}>
      <Screen style={$root} keyboardOffset={0} preset="scroll">
        <View
          style={$brandingContainer}
          direction="column"
          alignItems="center"
          justifyContent="center"
        >
          <Image source={launchIcon} style={{ height: 160, width: 160 }} resizeMode="contain" />
          <Text size="xl">HIKMA HEALTH</Text>
        </View>

        <View style={$formContainer} gap={10}>
          <TextField
            onChangeText={(t) =>
              updateCreds((draft) => {
                draft.email = t.trim()
              })
            }
            value={creds.email}
            autoCapitalize="none"
            labelTx={"login.email"}
          />
          <TextField
            value={creds.password}
            onChangeText={(t) =>
              updateCreds((draft) => {
                draft.password = t
              })
            }
            labelTx={"login.password"}
            autoCapitalize="none"
            secureTextEntry
          />

          <LanguageToggle />

          <Button disabled={isLoading} onPress={handleSignIn}>
            <Text tx={!isLoading ? "login.signIn" : "loading"} />
          </Button>

          <Pressable style={{ paddingTop: 14 }} onPress={openCamera}>
            <View direction={language.isRTL ? "row-reverse" : "row"} gap={10} alignItems="center">
              <QrCodeIcon size={36} color={colors.palette.primary500} />
              <Text color={colors.palette.primary500} tx="login.qrCodeRegister" />
            </View>
          </Pressable>
        </View>
      </Screen>
      <Pressable onPress={openPrivacyPolicy} style={{ position: "absolute", bottom: 50, left: 12 }}>
        <InfoIcon
          size={24}
          color={isDarkmode ? colors.palette.neutral700 : colors.palette.neutral700}
        />
      </Pressable>
    </SafeAreaView>
  )
})

const $root: ViewStyle = {
  flex: 1,
}

const $brandingContainer: ViewStyle = {
  paddingTop: "30%",
  paddingBottom: "5%",
}

const $formContainer: ViewStyle = {
  rowGap: 10,
  paddingHorizontal: "10%",
  maxWidth: 1000,
}
