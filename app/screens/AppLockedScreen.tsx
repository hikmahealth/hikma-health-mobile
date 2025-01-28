import React, { FC, useEffect, useState } from "react"
import { observer } from "mobx-react-lite"
import { ViewStyle, Dimensions, Alert, Image, Pressable, BackHandler } from "react-native"
import { AppStackScreenProps } from "../navigators"
import { Button, Screen, Text, TextField, View } from "../components"
import { useStores } from "../models"
import { colors } from "../theme"
import { SafeAreaView } from "react-native-safe-area-context"
import { useLockWhenIdleSettings } from "../hooks/useLockWhenIdleSettings"
import EncryptedStorage from "react-native-encrypted-storage"
import { LogOutIcon } from "lucide-react-native"

const { height, width } = Dimensions.get("window")

// interface AppLockedScreenProps extends AppStackScreenProps<"AppLocked"> {}
interface AppLockedScreenProps {}

export const AppLockedScreen: FC<AppLockedScreenProps> = observer(function AppLockedScreen() {
  // Pull in one of our MST stores
  const { appState, provider } = useStores()
  const [pin, setPin] = useState<string>("")
  const { unlock, toggleLockWhenIdle } = useLockWhenIdleSettings()

  const attemptUnlock = async () => {
    const res = await unlock(pin)
    if (!res) {
      setPin("")
      Alert.alert("Invalid PIN")
    } else {
      setPin("")
    }
  }

  const signOut = async () => {
    // alert to confirm the sign out
    Alert.alert(
      "Are you sure you want to sign out?",
      "You will be signed out of your account.",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Sign Out",
          onPress: async () => {
            await EncryptedStorage.removeItem("provider_password")
            await EncryptedStorage.removeItem("provider_email")
            provider.resetProvider() // navigation will automatically respond to this event and go to home screen directly
            toggleLockWhenIdle(false)
          },
        },
      ],
      {
        cancelable: true,
      },
    )
  }

  useEffect(() => {
    const backAction = () => {
      if (appState.isLocked) {
        return true
      }
      return false
    }
    // on back press of the phone, close the camera, if camera is closed, go back
    const backHandler = BackHandler.addEventListener("hardwareBackPress", backAction)

    return () => {
      backHandler.remove()
    }
  }, [appState.isLocked])

  const launchIcon = require("./../assets/images/launch_icon.png")

  const $container = appState.isLocked ? $visible : $hidden
  return (
    <SafeAreaView style={$container}>
      <View
        style={$brandingContainer}
        direction="column"
        alignItems="center"
        justifyContent="center"
      >
        <Image source={launchIcon} style={{ height: 160, width: 120 }} resizeMode="contain" />
        <Text size="xl">HIKMA HEALTH</Text>
      </View>

      <View gap={10}>
        <TextField
          secureTextEntry
          keyboardType="number-pad"
          onChangeText={setPin}
          value={pin}
          placeholder="Enter PIN"
        />

        <Button preset="default" onPress={attemptUnlock}>
          Unlock
        </Button>
      </View>

      <View pt={20}>
        <Pressable onPress={signOut}>
          <View direction="row" gap={10} alignContent="center">
            <LogOutIcon size={24} color={colors.palette.primary600} />
            <Text text="Sign out completely" color={colors.palette.primary600} />
          </View>
        </Pressable>
      </View>
    </SafeAreaView>
  )
})

const $visible: ViewStyle = {
  padding: 20,
  flex: 1,
  backgroundColor: colors.background,
  position: "absolute",
  height,
  width,
}

const $hidden: ViewStyle = {
  display: "none",
}

const $brandingContainer: ViewStyle = {
  paddingTop: "5%",
  paddingBottom: "15%",
}
