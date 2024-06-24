import React, { FC, useEffect } from "react"
import { observer } from "mobx-react-lite"
import { ViewStyle, Image, Pressable, Linking, Alert, ToastAndroid } from "react-native"
import { AppStackScreenProps } from "app/navigators"
import { Button, If, LanguageToggle, Screen, Text, TextField, Toggle, View } from "app/components"
import { colors } from "app/theme"
import { ChevronRight, LockIcon, UndoIcon } from "lucide-react-native"
// import { useNavigation } from "@react-navigation/native"
import { useStores } from "app/models"
import * as Notifications from "expo-notifications"
import EncryptedStorage from "react-native-encrypted-storage"
import { useLockWhenIdleSettings } from "app/hooks/useLockWhenIdleSettings"
import { generateDummyPatients, insertBenchmarkingData } from "app/utils/benchmarking"

const launchIcon = require("./../assets/images/launch_icon.png")

const HIKMA_URL = "https://www.hikmahealth.org/"

interface SettingsScreenProps extends AppStackScreenProps<"Settings"> {}

export const SettingsScreen: FC<SettingsScreenProps> = observer(function SettingsScreen({
  navigation,
  route,
}) {
  const { provider, appState } = useStores()
  const {
    toggleLockWhenIdle,
    state,
    onPinTextChange,
    savePin,
    cancelSavePin,
    startPinChange,
    lockScreenNow,
  } = useLockWhenIdleSettings()

  const openWebsite = (url: string) => {
    Linking.canOpenURL(url).then((supported) => {
      if (supported) {
        Linking.openURL(url)
      } else {
        console.log("Don't know how to open URI: " + url)
        Alert.alert("Failed to open: " + url)
      }
    })
  }

  const signOut = async () => {
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
          },
        },
      ],
      {
        cancelable: true,
      },
    )
  }

  const toggleNotifications = async (newStatus: boolean) => {
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync()
      let finalStatus = existingStatus
      if (existingStatus !== "granted") {
        const { status } = await Notifications.requestPermissionsAsync()
        finalStatus = status
      }
      if (finalStatus !== "granted") {
        alert("Failed to get push token for push notification!")
      }

      if (newStatus && finalStatus === "granted") {
        appState.setProp("notificationsEnabled", finalStatus === "granted")
      } else {
        appState.setProp("notificationsEnabled", false)
      }
    } catch (error) {
      console.log(error)
      alert("Error setting the notifications. Please try again later.")
    }
  }

  const createSyntheticPatients = () => {
    const patients = generateDummyPatients(1_000, 3, 2)
    // ToastAndroid.show("Synthetic patients created: " + patients.length, ToastAndroid.SHORT)
    // toast showing the total number of patients, visits and events
    ToastAndroid.show(
      `Synthetic patients created: ${patients.length} patients, ${patients[0]?.visits.length} visits and ${patients[0]?.events.length} events`,
      ToastAndroid.SHORT,
    )
    insertBenchmarkingData(patients)
      .then((res) => {
        ToastAndroid.show("Synthetic patients created: " + patients.length, ToastAndroid.SHORT)
      })
      .catch((err) => {
        console.log(err)
        ToastAndroid.show("Error creating synthetic patients: " + err, ToastAndroid.SHORT)
        Alert.alert("Done")
      })
  }

  const openPrivacyPolicy = () => {
    navigation.navigate("PrivacyPolicy")
  }
  return (
    <Screen style={$root} preset="scroll">
      <View py={12} style={{ borderBottomColor: colors.border, borderBottomWidth: 1 }}>
        <Image source={launchIcon} style={{ height: 80, width: 80 }} resizeMode="contain" />
        <View style={{ flexShrink: 1 }}>
          <Text text="Hikma Health" size="lg" />
          <Text
            size="xs"
            text="Hikma Health is an independent 501(c)(3) nonprofit and is not affiliated with Hikma
            Pharmaceuticals PLC or any of its affiliates."
          />

          <Pressable onPress={() => openWebsite(HIKMA_URL)} style={{ marginTop: 8 }}>
            <Text
              textDecorationLine="underline"
              color={colors.palette.primary600}
              size="sm"
              text="Learn more"
            />
          </Pressable>
        </View>
      </View>

      <View py={22} gap={10}>
        <Text text="Quick Links" size="lg" />
        <Pressable onPress={openPrivacyPolicy}>
          <View direction="row" justifyContent="space-between" style={$withBottomBorder} py={12}>
            <Text text="Privacy Policy" size="sm" />
            <ChevronRight color={colors.palette.neutral600} size={16} />
          </View>
        </Pressable>

        <Pressable onPress={() => navigation.navigate("Reports")}>
          <View direction="row" justifyContent="space-between" style={$withBottomBorder} py={12}>
            <Text text="Reports" size="sm" />
            <ChevronRight color={colors.palette.neutral600} size={16} />
          </View>
        </Pressable>

        <Pressable onPress={() => navigation.navigate("Feedback")}>
          <View direction="row" justifyContent="space-between" style={$withBottomBorder} py={12}>
            <Text text="Feedback" size="sm" />
            <ChevronRight color={colors.palette.neutral600} size={16} />
          </View>
        </Pressable>
      </View>

      <View py={22} gap={10}>
        <Text text="Settings" size="lg" />
        <View direction="row" justifyContent="space-between" style={$withBottomBorder} py={12}>
          <Text text="Show Notifications" size="sm" />
          <Toggle
            variant="switch"
            value={appState.notificationsEnabled}
            onValueChange={toggleNotifications}
          />
        </View>

        <View style={$withBottomBorder} py={12}>
          <View direction="row" justifyContent="space-between">
            <Text text="Lock Screen when idle" size="sm" />
            <Toggle
              variant="switch"
              containerStyle={[
                state === "setting-pin"
                  ? { borderWidth: 4, borderColor: colors.palette.accent500, borderRadius: 20 }
                  : {},
              ]}
              value={state === "active"}
              onValueChange={toggleLockWhenIdle}
            />
          </View>
          {state === "setting-pin" && (
            <View gap={4}>
              <TextField
                label="Enter a 4-digit PIN"
                secureTextEntry
                keyboardType="number-pad"
                onChangeText={(t) => {
                  !isNaN(parseInt(t)) && onPinTextChange(parseInt(t))
                }}
              />
              <View direction="row" gap={10}>
                <Pressable onPress={cancelSavePin}>
                  <Text text="Cancel" size="sm" color={colors.palette.primary600} />
                </Pressable>
                <Pressable onPress={savePin}>
                  <Text text="Save pin" size="sm" color={colors.palette.primary600} />
                </Pressable>
              </View>
            </View>
          )}

          {state === "active" && (
            <View direction="row" gap={20} alignItems="center">
              <Pressable
                onPress={lockScreenNow}
                style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
              >
                <LockIcon size={14} color={colors.palette.primary600} />
                <Text text="Lock screen" size="sm" color={colors.palette.primary600} />
              </Pressable>
              <Pressable
                onPress={() => {
                  startPinChange()
                }}
                style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
              >
                <UndoIcon size={14} color={colors.palette.primary600} />
                <Text text="Change pin" size="sm" color={colors.palette.primary600} />
              </Pressable>
            </View>
          )}
        </View>

        <If condtion={false}>
          <View direction="row" justifyContent="space-between" style={$withBottomBorder} py={12}>
            <Text text="Enable Health + Environment Index" size="sm" />
            <Toggle
              variant="switch"
              value={appState.hersEnabled}
              disabled
              onValueChange={(value) => appState.setProp("hersEnabled", value)}
            />
          </View>
        </If>

        <View style={$withBottomBorder} py={4}>
          <LanguageToggle />
        </View>
      </View>

      {/** HERS DATA **/}
      <If condition={appState.hersEnabled && false}>
        <View py={22} gap={10}>
          <Text text="Health + Environment Summary" size="lg" />
          <Text size="xs" text="7 day avg - today +/- 3 days" />
          <View direction="row" justifyContent="space-between" style={$withBottomBorder} py={12}>
            <Text text="Air Quality" size="sm" />
            <Text text="2" />
          </View>
          <View direction="row" justifyContent="space-between" style={$withBottomBorder} py={12}>
            <Text text="Temperature" size="sm" />
            <Text text="32ºC" />
          </View>
          <View direction="row" justifyContent="space-between" style={$withBottomBorder} py={12}>
            <Text text="Precipitation" size="sm" />
            <Text text="24mm" />
          </View>
          <View style={$withBottomBorder} py={12}>
            <Text text="Conditions Impacted" size="sm" />
            <View direction="row" style={{ flexWrap: "wrap" }} gap={6} pt={4}>
              {[
                "COPD",
                "Pneumonia",
                "Bronchitis",
                "Malaria",
                "Upper Respiratory Tract Infections",
              ].map((cond) => (
                <Pressable style={$hersChip} key={cond}>
                  <Text text={cond} size="xs" />
                </Pressable>
              ))}
            </View>
          </View>
        </View>
      </If>

      {/* ONLY SHOW THE FOLLOWING IN DEV MODE */}
      <If condition={__DEV__}>
        <View py={22} gap={10}>
          <Text text="Benchmarking" size="lg" />
          <Button onPress={createSyntheticPatients}>Create 5000 patients</Button>
        </View>
      </If>

      <View py={22}>
        <Button preset="filled" onPress={signOut}>
          Sign Out
        </Button>
      </View>
    </Screen>
  )
})

const $withBottomBorder: ViewStyle = {
  borderBottomColor: colors.border,
  borderBottomWidth: 1,
}

const $hersChip: ViewStyle = {
  borderColor: colors.border,
  borderWidth: 1,
  borderRadius: 8,
  paddingHorizontal: 8,
  paddingVertical: 4,
}

const $root: ViewStyle = {
  flex: 1,
  paddingHorizontal: 14,
}
