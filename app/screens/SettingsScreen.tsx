import React, { FC, useMemo } from "react"
import { observer } from "mobx-react-lite"
import { ViewStyle, Image, Pressable, Linking, Alert } from "react-native"
import { AppStackScreenProps } from "../navigators"
import { Button, If, LanguageToggle, Screen, Text, TextField, Toggle, View } from "../components"
import { colors } from "../theme"
import { ChevronRight, LockIcon, LucideRefreshCcw, UndoIcon } from "lucide-react-native"
// import { useNavigation } from "@react-navigation/native"
import { useStores } from "../models"
import * as Notifications from "expo-notifications"
import EncryptedStorage from "react-native-encrypted-storage"
import { useLockWhenIdleSettings } from "../hooks/useLockWhenIdleSettings"
import { generateDummyPatients, insertBenchmarkingData } from "../utils/benchmarking"
import { translate } from "../i18n"
import { useDBProvider } from "../hooks/useDBProvider"
import codePush from "react-native-code-push"
import * as Sentry from "@sentry/react-native"
import Toast from "react-native-root-toast"
import { useOTAVersion } from "../hooks/useOTAVersion"

const launchIcon = require("./../assets/images/launch_icon.png")

const HIKMA_URL = "https://www.hikmahealth.org/"

interface SettingsScreenProps extends AppStackScreenProps<"Settings"> {}

export const SettingsScreen: FC<SettingsScreenProps> = observer(function SettingsScreen({
  navigation,
  route,
}) {
  const { appState, provider: providerStore } = useStores()
  const { clinic, provider, isLoading } = useDBProvider()
  const { appVersion } = useOTAVersion()

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
      translate("settingsScreen:confirmSignOut"),
      translate("settingsScreen:signOutDescription"),
      [
        {
          text: translate("common:cancel"),
          style: "cancel",
        },
        {
          text: translate("drawer:signOut"),
          onPress: async () => {
            await EncryptedStorage.removeItem("provider_password")
            await EncryptedStorage.removeItem("provider_email")
            providerStore.resetProvider() // navigation will automatically respond to this event and go to home screen directly
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
      .then((res) => {
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
  }

  const checkForUpdates = () => {
    const updateToast = Toast.show("Checking for updates...", {
      duration: Toast.durations.LONG,
      containerStyle: {
        marginBottom: 100,
      },
    })
    codePush
      .checkForUpdate()
      .then((res) => {
        if (res) {
          codePush
            .sync({
              updateDialog: true,
              installMode: codePush.InstallMode.IMMEDIATE,
            })
            .then((res) => {
              if (res === codePush.SyncStatus.UP_TO_DATE) {
                Toast.show("Already up to date", {
                  duration: Toast.durations.LONG,
                  containerStyle: {
                    marginBottom: 100,
                  },
                })
              } else if (res === codePush.SyncStatus.UPDATE_INSTALLED) {
                Toast.show("Update installed", {
                  duration: Toast.durations.LONG,
                  containerStyle: {
                    marginBottom: 100,
                  },
                })
              } else if (res === codePush.SyncStatus.UPDATE_IGNORED) {
                Toast.show("Update ignored", {
                  duration: Toast.durations.LONG,
                  containerStyle: {
                    marginBottom: 100,
                  },
                })
              } else if (res === codePush.SyncStatus.UNKNOWN_ERROR) {
                Toast.show("Unknown error", {
                  duration: Toast.durations.LONG,
                  containerStyle: {
                    marginBottom: 100,
                  },
                })
              } else if (res === codePush.SyncStatus.CHECKING_FOR_UPDATE) {
                Toast.show("Checking for update", {
                  duration: Toast.durations.LONG,
                  containerStyle: {
                    marginBottom: 100,
                  },
                })
              }
            })
            .catch((fail) => {
              Toast.show("Error checking for updates: " + fail, {
                duration: Toast.durations.LONG,
                containerStyle: {
                  marginBottom: 100,
                },
              })
              Sentry.captureException(fail)
            })
        } else {
          Toast.hide(updateToast)
          Toast.show("No new updates", {
            duration: Toast.durations.LONG,
            containerStyle: {
              marginBottom: 100,
            },
          })
        }
      })
      .catch((err) => {
        console.log(err)
        Toast.show("Error checking for updates: " + err, {
          duration: Toast.durations.LONG,
          containerStyle: {
            marginBottom: 100,
          },
        })
        Sentry.captureException(err)
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
          <View direction="row" gap={4} alignItems="baseline">
            <Text text={`Hikma Health`} size="lg" />
            <Text text={`(v${appVersion})`} size="xs" />
          </View>
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
              tx="common:learnMore"
            />
          </Pressable>
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
          <Text text={clinic?.name || ""} size="sm" />
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
          <Toggle
            variant="switch"
            value={appState.notificationsEnabled}
            onValueChange={toggleNotifications}
          />
        </View>

        <View style={$withBottomBorder} py={12}>
          <View direction="row" justifyContent="space-between">
            <Text tx="settingsScreen:lockWhenIdle" size="sm" />
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
                labelTx="settingsScreen:requestPin"
                secureTextEntry
                keyboardType="number-pad"
                onChangeText={(t) => {
                  !isNaN(parseInt(t)) && onPinTextChange(parseInt(t))
                }}
              />
              <View direction="row" gap={10}>
                <Pressable onPress={cancelSavePin}>
                  <Text tx="common:cancel" size="sm" color={colors.palette.primary600} />
                </Pressable>
                <Pressable onPress={savePin}>
                  <Text tx="settingsScreen:savePin" size="sm" color={colors.palette.primary600} />
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
                <Text tx="settingsScreen:lockScreen" size="sm" color={colors.palette.primary600} />
              </Pressable>
              <Pressable
                onPress={() => {
                  startPinChange()
                }}
                style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
              >
                <UndoIcon size={14} color={colors.palette.primary600} />
                <Text tx="settingsScreen:changePin" size="sm" color={colors.palette.primary600} />
              </Pressable>
            </View>
          )}
        </View>

        <View style={$withBottomBorder} py={12}>
          <Pressable onPress={checkForUpdates}>
            <View direction="row" justifyContent="space-between">
              <Text tx="settingsScreen:checkOTAForUpdates" size="sm" />
              <LucideRefreshCcw size={16} color={colors.palette.neutral600} />
            </View>
          </Pressable>
        </View>

        <If condition={false}>
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

        <View style={$withBottomBorder} py={4} pb={22}>
          <Text text={translate("common:chooseLanguage")} size="sm" />
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
          {translate("common:signOut")}
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
