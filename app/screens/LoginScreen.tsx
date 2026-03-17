import { FC, useState, useEffect } from "react"
import {
  ViewStyle,
  Image,
  Pressable,
  useWindowDimensions,
  StyleSheet,
  BackHandler,
  Alert,
} from "react-native"
import { BarcodeScanningResult, Camera, CameraView } from "expo-camera"
import * as SecureStore from "expo-secure-store"
import { useSelector } from "@xstate/react"
import { InfoIcon, QrCodeIcon, XIcon } from "lucide-react-native"
import Toast from "react-native-root-toast"
import { useImmer } from "use-immer"

import { Button } from "@/components/Button"
import { LanguageToggle } from "@/components/LanguageToggle"
import { Screen } from "@/components/Screen"
import { Text } from "@/components/Text"
import { TextField } from "@/components/TextField"
import { View } from "@/components/View"
import { useLanguage } from "@/hooks/useLanguage"
import { usePeerRegistration } from "@/hooks/usePeerRegistration"
import { translate } from "@/i18n/translate"
import Peer from "@/models/Peer"
import User from "@/models/User"
import type { AppStackScreenProps } from "@/navigators/AppNavigator"
import type { HubSession } from "@/rpc/handshake"
import { createEncryptedTransport } from "@/rpc/transport"
import { providerStore } from "@/store/provider"
import { colors } from "@/theme/colors"
import { useAppTheme } from "@/theme/context"
import {
  initialWindowMetrics,
  SafeAreaProvider,
  SafeAreaView,
} from "react-native-safe-area-context"

const HIKMA_API_TESTING = process.env.EXPO_PUBLIC_HIKMA_API_TESTING

const GOOGLE_TESTER_EMAIL = process.env.EXPO_PUBLIC_GOOGLE_TESTER_EMAIL
const GOOGLE_TESTER_PASSWORD = process.env.EXPO_PUBLIC_GOOGLE_TESTER_PASSWORD

const DEFAULT_ADMIN_EMAIL = process.env.EXPO_PUBLIC_DEFAULT_ADMIN_EMAIL
const DEFAULT_ADMIN_PASSWORD = process.env.EXPO_PUBLIC_DEFAULT_ADMIN_PASSWORD

interface LoginScreenProps extends AppStackScreenProps<"Login"> {}

export const LoginScreen: FC<LoginScreenProps> = ({ navigation }) => {
  const { theme } = useAppTheme()
  const [isLoading, setIsLoading] = useState(false)
  const { language, isRTL } = useLanguage()
  const { height, width } = useWindowDimensions()

  const [creds, updateCreds] = useImmer({
    email: __DEV__ ? DEFAULT_ADMIN_EMAIL : "",
    password: __DEV__ ? DEFAULT_ADMIN_PASSWORD : "",
  })

  const isDarkmode = theme.isDark
  const launchIcon = require("@/assets/images/launch_icon.png")

  const [hasPermission, setHasPermission] = useState<boolean | null>(null)
  const [scannerVisible, setScannerVisible] = useState(false)
  const [scanned, setScanned] = useState(false)

  const { connectionType, hubSession, isRegistering, registerFromQR } = usePeerRegistration()

  const openPrivacyPolicy = () => {
    navigation.navigate("PrivacyPolicy")
  }

  /**
   * Handle the user sign in process depending on the type of sign in
   * @returns
   */
  const handleSignIn = async () => {
    if (isLoading) return
    const isGoogle = isGoogleTester(creds.email, creds.password)
    console.log(
      "isGoogle",
      isGoogle,
      creds.email,
      creds.password,
      GOOGLE_TESTER_EMAIL,
      GOOGLE_TESTER_PASSWORD,
    )
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
                handleBarCodeScanned({
                  data: HIKMA_API_TESTING,
                } as BarcodeScanningResult).then(() => {
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
    if (creds.email.length < 4 || creds.password.length < 4) {
      return Alert.alert("Invalid email or password")
    }

    console.log({ connectionType, hubSession })

    // Hub login flow
    if (connectionType === "sync_hub" && hubSession) {
      setIsLoading(true)
      try {
        const transport = createEncryptedTransport(hubSession)
        const result = await transport.login(creds.email, creds.password)
        console.warn("[Login] Hub login: ", { result, creds })
        if (!result.ok) {
          setIsLoading(false)
          Alert.alert(translate("login:hubAuthFailed"))
          return
        }
        // Update session with token and persist
        const updatedSession: HubSession = { ...hubSession, token: result.data.token }
        await Peer.Session.save(updatedSession)

        // Set user from hub login response
        await User.setFromHubLogin(result.data, creds.email, creds.password)
        setIsLoading(false)
      } catch (e) {
        console.error("[Login] Hub login error:", e)
        setIsLoading(false)
        Alert.alert(translate("login:hubAuthFailed"))
      }
      return
    }

    // Cloud login flow — verify a cloud peer is registered
    const cloudUrl = await Peer.getActiveUrl()
    if (!cloudUrl) {
      Alert.alert(translate("login:invalidQRMessage"))
      return
    }

    setIsLoading(true)

    try {
      // Use User.signIn from the User module
      // This now handles updating the provider store and storing credentials
      await User.signIn(creds.email, creds.password)
      setIsLoading(false)
    } catch (e) {
      console.error("[Login] Login error: ", e)
      setIsLoading(false)

      // Show appropriate error message based on the error type
      if (e instanceof Error) {
        if (e.message === "Invalid credentials") {
          Alert.alert(translate("login:invalidCredentials"))
        } else if (e.message === "Invalid API URL") {
          Alert.alert(translate("login:invalidQRMessage"))
        } else {
          Alert.alert(translate("login:errorConnectingToDB"))
        }
      } else {
        Alert.alert(translate("login:errorConnectingToDB"))
      }
    }
  }

  const openCamera = async () => {
    const { status } = await Camera.requestCameraPermissionsAsync()
    setHasPermission(status === "granted")

    if (status === "granted") {
      setScannerVisible(true)
      setScanned(false)
    }
  }

  const handleBarCodeScanned = async ({ data }: { data: string }) => {
    setScanned(true)
    setScannerVisible(false)

    const result = await registerFromQR(data)
    console.log({ data })

    if (result.ok) {
      const messageKey =
        result.type === "sync_hub" ? "login:hubConnected" : "login:qrCodeRegistered"
      Toast.show(translate(messageKey), {
        duration: Toast.durations.LONG,
        position: Toast.positions.BOTTOM,
      })
    } else {
      console.log("Peer registration failed:", result.error)
      Toast.show(translate("login:invalidQRCode"), {
        duration: Toast.durations.LONG,
        position: Toast.positions.BOTTOM,
      })
    }
  }

  useEffect(() => {
    const backHandler = BackHandler.addEventListener("hardwareBackPress", () => {
      if (scannerVisible) {
        setScannerVisible(false)
        return true
      }
      return false
    })

    return () => backHandler.remove()
  }, [scannerVisible])

  if (scannerVisible) {
    return (
      <View style={{ ...StyleSheet.absoluteFillObject, flex: 1 }}>
        <CameraView
          barcodeScannerSettings={{
            barcodeTypes: ["qr"],
          }}
          active={true}
          onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
          style={{ height, ...StyleSheet.absoluteFillObject }}
        />
        <View
          style={{
            position: "absolute",
            top: 40,
            right: 10,
          }}
        >
          <Pressable style={{}} onPress={() => setScannerVisible(false)}>
            <XIcon
              size={24}
              color={colors.palette.angry500}
              style={{ backgroundColor: "white", borderRadius: 100, padding: 20 }}
            />
          </Pressable>
        </View>
      </View>
    )
  }

  return (
    <SafeAreaView style={$root}>
      <Screen style={$root} preset="scroll">
        <View
          style={$brandingContainer}
          pt={height * 0.08}
          pb={height * 0.04}
          direction="column"
          alignItems="center"
          justifyContent="center"
        >
          <Image source={launchIcon} style={{ height: 160, width: 160 }} resizeMode="contain" />
          <Text size="xl">HIKMA HEALTH</Text>
        </View>

        <View style={$formContainer} px={20} gap={10}>
          <TextField
            autoCapitalize="none"
            labelTx="login:email"
            value={creds.email}
            onChangeText={(t) =>
              updateCreds((d) => {
                d.email = t
              })
            }
          />

          <TextField
            autoCapitalize="none"
            labelTx="login:password"
            secureTextEntry={true}
            value={creds.password}
            onChangeText={(t) =>
              updateCreds((d) => {
                d.password = t
              })
            }
          />

          <LanguageToggle preset="options" size="xs" />

          <Button
            tx={isLoading ? "common:loading" : "login:signIn"}
            onPress={handleSignIn}
            style={{ width: "100%" }}
          />

          <Pressable style={{ paddingTop: 14 }} onPress={openCamera}>
            <View direction={isRTL ? "row-reverse" : "row"} gap={10} alignItems="center">
              <QrCodeIcon size={36} color={colors.palette.primary500} />
              <Text color={colors.palette.primary500} tx="login:qrCodeRegister" />
            </View>
          </Pressable>

          {connectionType && (
            <View pt={8}>
              <Text
                size="xs"
                color={
                  connectionType === "sync_hub"
                    ? colors.palette.secondary500
                    : colors.palette.primary500
                }
                tx={connectionType === "sync_hub" ? "login:hubConnected" : "login:qrCodeRegistered"}
              />
            </View>
          )}
        </View>

        {/* Spacer Component */}
        <View height={40} />
      </Screen>
      <Pressable
        testID="login-privacy-policy"
        onPress={openPrivacyPolicy}
        style={{ margin: 8 }}
        // style={{ position: "absolute", bottom: 0, left: 12, zIndex: 1 }}
      >
        <InfoIcon
          size={24}
          color={isDarkmode ? colors.palette.neutral700 : colors.palette.neutral700}
        />
      </Pressable>
    </SafeAreaView>
  )
}
const $root: ViewStyle = {
  flex: 1,
}

const $brandingContainer: ViewStyle = {
  // paddingBottom: "5%",
}

const $formContainer: ViewStyle = {
  // rowGap: 10,
  // paddingHorizontal: "10%",
  // maxWidth: 1000,
}

function isGoogleTester(email: string, password: string) {
  return email === GOOGLE_TESTER_EMAIL && password === GOOGLE_TESTER_PASSWORD
}
