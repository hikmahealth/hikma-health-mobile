import { FC, useEffect, useState } from "react"
import { ActivityIndicator, Alert, Linking, Pressable, ViewStyle, Image } from "react-native"
import * as Notifications from "expo-notifications"
import * as SecureStore from "expo-secure-store"
import { useNetInfo } from "@react-native-community/netinfo"
import { CommonActions } from "@react-navigation/native"
import { useSelector } from "@xstate/react"
import { Option } from "effect"
import { ChevronRight } from "lucide-react-native"
import Toast from "react-native-root-toast"

import { Button } from "@/components/Button"
import { If } from "@/components/If"
import { Screen } from "@/components/Screen"
import { Text } from "@/components/Text"
import { Switch } from "@/components/Toggle/Switch"
import { View } from "@/components/View"
import { useLockWhenIdleSettings } from "@/hooks/useLockWhenIdleSettings"
import { useOTAVersion } from "@/hooks/useOTAVersion"
import { translate } from "@/i18n/translate"
import type { AppStackScreenProps } from "@/navigators/AppNavigator"
import { navigationRef } from "@/navigators/navigationUtilities"
import { switchToOnlineMode, switchToOfflineMode } from "@/services/modeSwitchService"
import { appStateStore } from "@/store/appState"
import { operationModeStore } from "@/store/operationMode"
import { providerStore } from "@/store/provider"
import { colors } from "@/theme/colors"
import { generateDummyPatients, insertBenchmarkingData } from "@/utils/benchmarking"
import Peer from "@/models/Peer"

interface SettingsScreenProps extends AppStackScreenProps<"Settings"> {}

export const SettingsScreen: FC<SettingsScreenProps> = ({ navigation }) => {
  const { appVersion } = useOTAVersion()
  const provider = useSelector(providerStore, (state) => state.context)
  const appState = useSelector(appStateStore, (state) => state.context)
  const { mode, serverConfig, isTransitioning } = useSelector(
    operationModeStore,
    (state) => state.context,
  )
  const { isConnected, isInternetReachable } = useNetInfo()
  const showModeToggle = serverConfig === "user_choice"

  const launchIcon = require("@/assets/images/launch_icon.png")

  const {
    toggleLockWhenIdle,
    state,
    onPinTextChange,
    savePin,
    cancelSavePin,
    startPinChange,
    lockScreenNow,
  } = useLockWhenIdleSettings()

  // Check if the provider is signed in
  const isSignedIn = useSelector(providerStore, (state) => {
    const { id, name, email } = state.context
    return !!id && !!name && !!email
  })

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

  const toggleNotifications = async (newStatus: boolean) => {
    // Implement the logic to toggle notifications here
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
        appStateStore.trigger.SET_NOTIFICATIONS_ENABLED({ notificationsEnabled: true })
      } else {
        appStateStore.trigger.SET_NOTIFICATIONS_ENABLED({ notificationsEnabled: false })
      }
    } catch (error) {
      console.log(error)
      alert("Error setting the notifications. Please try again later.")
    }
  }

  const toggleOperationMode = async (wantsOnline: boolean) => {
    if (isTransitioning) return

    if (wantsOnline) {
      if (!isConnected || !isInternetReachable) {
        Toast.show(translate("settingsScreen:noInternetWarning"), {
          duration: Toast.durations.LONG,
        })
        return
      }
      const result = await switchToOnlineMode()
      if (!result.ok && result.reason === "unsynced_changes") {
        Toast.show(translate("settingsScreen:unsyncedChangesWarning"), {
          duration: Toast.durations.LONG,
        })
      }
    } else {
      await switchToOfflineMode()
    }
  }

  const createSyntheticPatients = () => {
    Alert.alert(
      "Create Synthetic Patients",
      "Warning: This will generate 1000 synthetic patients with visits and events in your local database. This data may sync to any connected server. Do you want to proceed?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Proceed",
          style: "destructive",
          onPress: () => {
            const patients = generateDummyPatients(1_000, 3, 2)
            Toast.show(
              `Synthetic patients created: ${patients.length} patients, ${patients[0]?.visits.length} visits and ${patients[0]?.events.length} events`,
              {
                duration: Toast.durations.LONG,
                containerStyle: {
                  marginBottom: 100,
                },
              },
            )
            insertBenchmarkingData(patients)
              .then(() => {
                Toast.show("Synthetic patients created: " + patients.length, {
                  duration: Toast.durations.LONG,
                  containerStyle: {
                    marginBottom: 100,
                  },
                })
              })
              .catch((err) => {
                console.log(err)
                Toast.show("Error creating synthetic patients: " + err, {
                  duration: Toast.durations.LONG,
                  containerStyle: {
                    marginBottom: 100,
                  },
                })
                Alert.alert("Done")
              })
          },
        },
      ],
      {
        cancelable: true,
      },
    )
  }

  const signOut = async () => {
    Alert.alert(
      translate("settingsScreen:confirmSignOut"),
      translate("settingsScreen:signOutDescription"),
      [
        {
          text: translate("common:cancel"),
          style: "cancel",
        },
        {
          text: translate("common:confirmSignOut"),
          onPress: async () => {
            await SecureStore.deleteItemAsync("provider_password")
            await SecureStore.deleteItemAsync("provider_email")
            // Reset navigation state before clearing provider to avoid
            // native-stack desync ("screen removed natively but not from JS state")
            if (navigationRef.isReady()) {
              navigationRef.dispatch(
                CommonActions.reset({
                  index: 0,
                  routes: [{ name: "Patients" }],
                }),
              )
            }
            providerStore.trigger.reset()
          },
        },
      ],
      {
        cancelable: true,
      },
    )
  }

  const openPrivacyPolicy = () => {
    navigation.navigate("PrivacyPolicy")
  }

  const [HIKMA_URL, setHIKMA_URL] = useState<Option.Option<string>>(Option.none)

  useEffect(() => {
    Peer.getActiveUrl().then((url) => {
      setHIKMA_URL(Option.fromNullable(url))
    })
  }, [])

  return (
    <Screen style={$root} preset="scroll">
      <View py={12} style={{ borderBottomColor: colors.border, borderBottomWidth: 1 }}>
        <Image source={launchIcon} style={{ height: 80, width: 80 }} resizeMode="contain" />
        <View style={{ flexShrink: 1 }}>
          <View direction="row" gap={4} alignItems="baseline">
            <Text text={`Hikma Health`} size="lg" />
            <Text text={`(v${appVersion})`} size="xs" />
          </View>
          <Text size="xs" tx="settingsScreen:nonprofitDisclaimer" />

          {Option.match(HIKMA_URL, {
            onSome: () => (
              <Pressable onPress={() => openWebsite(HIKMA_URL)} style={{ marginTop: 8 }}>
                <Text
                  textDecorationLine="underline"
                  color={colors.palette.primary600}
                  size="sm"
                  tx="common:learnMore"
                />
              </Pressable>
            ),
            onNone: () => null,
          })}
        </View>
      </View>
      <View py={22} gap={10}>
        <Text tx="settingsScreen:userAccount" size="lg" />
        <View style={$withBottomBorder} py={12}>
          <Text tx="common:email" size="sm" />
          <Text text={provider?.email || ""} size="sm" />
        </View>

        <View style={$withBottomBorder} py={12}>
          <Text tx="common:clinicName" size="sm" />
          <Text text={Option.getOrElse(provider.clinic_name, () => "")} size="sm" />
        </View>
      </View>
      <View py={22} gap={10}>
        <Text tx="settingsScreen:quickLinks" size="lg" />
        <Pressable onPress={openPrivacyPolicy}>
          <View direction="row" justifyContent="space-between" style={$withBottomBorder} py={12}>
            <Text tx="settingsScreen:privacyPolicy" size="sm" />
            <ChevronRight color={colors.palette.neutral600} size={16} />
          </View>
        </Pressable>

        <Pressable onPress={() => navigation.navigate("Reports")}>
          <View direction="row" justifyContent="space-between" style={$withBottomBorder} py={12}>
            <Text tx="settingsScreen:reports" size="sm" />
            <ChevronRight color={colors.palette.neutral600} size={16} />
          </View>
        </Pressable>

        <Pressable onPress={() => navigation.navigate("Feedback")}>
          <View direction="row" justifyContent="space-between" style={$withBottomBorder} py={12}>
            <Text tx="settingsScreen:feedback" size="sm" />
            <ChevronRight color={colors.palette.neutral600} size={16} />
          </View>
        </Pressable>
      </View>
      <View py={22} gap={10}>
        <Text tx="settingsScreen:settings" size="lg" />
        <View direction="row" justifyContent="space-between" style={$withBottomBorder} py={12}>
          <Text tx="settingsScreen:showNotifications" size="sm" />
          <Switch
            value={appState.notificationsEnabled}
            onValueChange={toggleNotifications}
            containerStyle={[
              appState.notificationsEnabled
                ? { borderWidth: 4, borderColor: colors.palette.accent500, borderRadius: 20 }
                : {},
            ]}
          />
        </View>

        {/* Disable for now. TODO: turn back on with cloud side pin code setting */}
        <If condition={false}>
          <View style={$withBottomBorder} py={12}>
            <View direction="row" justifyContent="space-between">
              <Text tx="settingsScreen:lockWhenIdle" size="sm" />
              <Switch
                containerStyle={[
                  state === "setting-pin"
                    ? { borderWidth: 4, borderColor: colors.palette.accent500, borderRadius: 20 }
                    : {},
                ]}
                value={state === "active"}
                onValueChange={toggleLockWhenIdle}
              />
            </View>
          </View>
        </If>

        <If condition={__DEV__}>
          {showModeToggle && (
            <View style={$withBottomBorder} py={12}>
              <View direction="row" justifyContent="space-between" alignItems="center">
                <Text tx="settingsScreen:onlineOnlyMode" size="sm" />
                {isTransitioning ? (
                  <ActivityIndicator size="small" />
                ) : (
                  <Switch
                    value={mode === "online"}
                    onValueChange={toggleOperationMode}
                    containerStyle={[
                      mode === "online"
                        ? {
                            borderWidth: 4,
                            borderColor: colors.palette.accent500,
                            borderRadius: 20,
                          }
                        : {},
                    ]}
                  />
                )}
              </View>
              <Text
                size="xxs"
                color={colors.palette.neutral500}
                tx="settingsScreen:onlineOnlyModeDescription"
              />
            </View>
          )}
        </If>

        <Pressable onPress={() => navigation.navigate("SyncSettings")}>
          <View direction="row" justifyContent="space-between" style={$withBottomBorder} py={12}>
            <View direction="row" justifyContent="space-between" flex={1}>
              <Text tx="settingsScreen:syncSettings" size="sm" />
              <ChevronRight size={16} color={colors.palette.neutral600} />
            </View>
          </View>
        </Pressable>
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
          <Button onPress={createSyntheticPatients}>Create 1000 patients</Button>
        </View>
      </If>
      <View py={22}>
        <Button testID="signOutBtn" preset="filled" onPress={signOut}>
          {translate("common:signOut")}
        </Button>
      </View>
    </Screen>
  )
}

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
