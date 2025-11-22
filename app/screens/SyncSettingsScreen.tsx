import { FC, useEffect, useState } from "react"
import {
  Alert,
  BackHandler,
  Dimensions,
  Pressable,
  Vibration,
  ViewStyle,
  StyleSheet,
  TouchableOpacity,
} from "react-native"
import { CameraType, useCameraPermissions, BarcodeScanningResult } from "expo-camera"
import { Option } from "effect"
import CameraView from "expo-camera/build/CameraView"
import { LucideCamera, LucideRefreshCcw } from "lucide-react-native"
import Toast from "react-native-root-toast"
import { v1 as uuidV1 } from "uuid"

import { Screen } from "@/components/Screen"
import { Text } from "@/components/Text"
import { View } from "@/components/View"
import { useSync } from "@/hooks/useSync"
import { translate } from "@/i18n/translate"
import Sync from "@/models/Sync"
import type { AppStackScreenProps } from "@/navigators/AppNavigator"
import { colors } from "@/theme/colors"
import { getHHApiUrl, setHHApiUrl } from "@/utils/storage"

interface SyncSettingsScreenProps extends AppStackScreenProps<"SyncSettings"> {}

const { width, height } = Dimensions.get("window")

/**
 * Hook to get the current servers that have been configured
 * @returns {servers: Sync.Server.T[], setServers: (servers: Sync.Server.T[]) => void, refresh: () => Promise<void>}
 */
function useSyncServerDetails() {
  const [servers, setServers] = useState<Sync.Server.T[]>([])

  async function getDetails() {
    try {
      const servers = await Sync.Server.getAll()
      return setServers(Object.values(servers))
    } catch (error) {
      console.error(error)
      setServers([])
    }
  }

  useEffect(() => {
    getDetails()
  }, [])

  return { servers, setServers, refresh: getDetails }
}

export const SyncSettingsScreen: FC<SyncSettingsScreenProps> = () => {
  const [isCameraScannerActive, setIsCameraScannerActive] = useState(false)
  const [facing, setFacing] = useState<CameraType>("back")
  const [permission, requestPermission] = useCameraPermissions()
  const [serverTypeScanner, setServerTypeScanner] = useState<Sync.ServerType>("local")

  const { servers, refresh } = useSyncServerDetails()

  /**
   * Cold start problem: remote server is not set up as this feature is being introduced. It exists in the encrypted storage
   */
  useEffect(() => {
    const checkAndSetCloudServer = async () => {
      const existingServers = await Sync.Server.getAll()
      const hasCloudServer = Object.values(existingServers).some(
        (server) => server.type === "cloud",
      )

      if (!hasCloudServer) {
        const url = await getHHApiUrl()
        if (url) {
          await Sync.Server.set("cloud", {
            id: uuidV1(),
            name: "cloud",
            url: Option.isOption(url) ? Option.getOrElse(url, () => "") : "",
            isActive: true,
            type: "cloud",
          })

          await refresh()
        }
      }
    }

    checkAndSetCloudServer()
  }, [])

  // on back press of the phone, close the camera, if camera is closed, go back
  useEffect(() => {
    const backAction = () => {
      if (isCameraScannerActive) {
        setIsCameraScannerActive(false)
        return true
      }
      return false
    }

    const backHandler = BackHandler.addEventListener("hardwareBackPress", backAction)

    return () => {
      backHandler.remove()
    }
  }, [isCameraScannerActive])

  async function setCameraActive(serverType: Sync.ServerType) {
    const { status } = await requestPermission()
    console.log("status", status)
    if (status === "granted") {
      setIsCameraScannerActive(true)
      setServerTypeScanner(serverType)
    } else {
      Alert.alert(translate("login:requiredCameraPermissions"))
    }
  }

  // whether or not there exists a local sync server
  const hasLocalServer = servers.some((server) => server.type === "local")

  const handleBarCodeScanned =
    (serverType: Sync.ServerType) =>
    async ({ data }: BarcodeScanningResult) => {
      try {
        await Sync.Server.set(serverType, {
          id: uuidV1(),
          name: serverType,
          url: data,
          isActive: false,
          type: serverType,
        })
        await setHHApiUrl(data)
        await refresh()

        Vibration.vibrate(500)

        // FIXME: Check that the scanned data is valid
      } catch (error) {
        console.error(error)
        Alert.alert(translate("login:invalidQRCode"))
      }
      setIsCameraScannerActive(false)
    }

  const handleSetActiveServer = (type: Sync.ServerType) => {
    console.log({ type })
    Alert.alert(
      translate("syncSettingsScreen:confirmSetDefault"),
      translate("syncSettingsScreen:confirmSetDefaultDescription"),
      [
        { text: translate("common:cancel"), style: "cancel" },
        {
          text: translate("common:confirm"),
          onPress: () => {
            Sync.Server.setActive(type)
              .then(() => {
                refresh()
                Toast.show("Server set as default", {
                  position: Toast.positions.BOTTOM,
                  duration: Toast.durations.SHORT,
                })
              })
              .catch((error) => {
                console.error(error)
                Alert.alert(translate("syncSettingsScreen:syncError"))
              })
          },
        },
      ],
    )
  }

  const handleAddServer = (type: Sync.ServerType) => {
    if (type === "local") {
      setCameraActive("local")
    } else if (type === "cloud") {
      setCameraActive("cloud")
    }
  }

  const cloudServer = servers.find((server) => server.type === "cloud")
  const localServer = servers.find((server) => server.type === "local")

  const { isSyncing, startSync } = useSync()

  if (isCameraScannerActive && permission?.granted) {
    return (
      <View style={$cameraContainer}>
        <CameraView
          barcodeScannerSettings={{
            barcodeTypes: ["qr"],
          }}
          facing={facing}
          onBarcodeScanned={handleBarCodeScanned(serverTypeScanner)}
          style={StyleSheet.absoluteFillObject}
        />
      </View>
    )
  }

  const handleManualSync = async () => {
    try {
      await startSync()
      await startSync()
    } catch (error) {
      console.error("Manual sync failed:", error)
    }
  }

  const handleClearServer = async (type: Sync.ServerType) => {
    handleBarCodeScanned(type)({
      type,
      data: "",
      raw: undefined,
      cornerPoints: [],
      bounds: {
        origin: { x: 0, y: 0 },
        size: { width: 0, height: 0 },
      },
      extra: undefined,
    })
  }

  // TODO: All time re-sync. Get all data from server.
  const handleAllTimeSync = async () => {
    // try {
    //   await startSync()
    // } catch (error) {
    //   console.error("All time sync failed:", error)
    // }
  }

  getHHApiUrl()
    .then((url) => {
      console.log("HH API URL:", url)
    })
    .catch((error) => {
      console.error("Failed to get HH API URL:", error)
    })

  return (
    <Screen style={$root} preset="scroll">
      <View style={$syncButtonContainer}>
        <TouchableOpacity
          style={[$manualSyncButton, isSyncing && $syncButtonDisabled]}
          onPress={handleManualSync}
          disabled={isSyncing}
        >
          <LucideRefreshCcw
            color={isSyncing ? colors.palette.neutral400 : colors.palette.primary600}
            size={20}
          />
          <Text
            text={isSyncing ? "Syncing..." : "Manual Sync"}
            size="sm"
            color={isSyncing ? colors.palette.neutral400 : colors.palette.primary600}
          />
        </TouchableOpacity>
      </View>

      <Text size="lg" text="Configured Servers" />

      {cloudServer && (
        <ServerTypeComponent
          handleAddServer={handleAddServer}
          handleSetActiveServer={handleSetActiveServer}
          server={cloudServer}
        />
      )}

      {localServer && (
        <ServerTypeComponent
          handleAddServer={handleAddServer}
          handleSetActiveServer={handleSetActiveServer}
          server={localServer}
          clearServer={handleClearServer}
        />
      )}

      {!hasLocalServer && (
        <View style={$withBottomBorder} py={12} direction="column" gap={4}>
          <View>
            <Text text="Local Server" size="md" />
            <Text text="Not Configured" size="xxs" />
          </View>

          <ConnectButton onPress={() => handleAddServer("local")} mode="connect" />
        </View>
      )}
    </Screen>
  )
}

/**
 * Connect button
 * @param {Function} onPress - The function to call when the button is pressed
 * @param {"connect" | "change"} mode - The mode of the button
 * @returns {JSX.Element} The connect button
 */
function ConnectButton({ onPress, mode }: { onPress: () => void; mode: "connect" | "change" }) {
  return (
    <Pressable onPress={onPress} style={$connectButton}>
      <LucideCamera color={colors.palette.primary600} size={20} />
      <Text
        text={mode === "connect" ? "Connect" : "Change"}
        size="xxs"
        color={colors.palette.primary600}
      />
    </Pressable>
  )
}

/**
 * Server type component
 * @param {Sync.Server.T} server - The server to display
 * @param {Function} handleSetActiveServer - The function to call when the server is set as active
 * @param {Function} handleAddServer - The function to call when the server is added
 * @param {Function} clearServer - The function to call when the server is cleared
 * @returns {JSX.Element} The server type component
 */
function ServerTypeComponent({
  server,
  handleSetActiveServer,
  handleAddServer,
  clearServer,
}: {
  server: Sync.Server.T
  handleSetActiveServer: (type: Sync.ServerType) => void
  handleAddServer: (type: Sync.ServerType) => void
  clearServer?: (type: Sync.ServerType) => Promise<void>
}) {
  return (
    <View style={$withBottomBorder} py={12} direction="column" gap={4}>
      <View direction="row" gap={4} justifyContent="space-between">
        <Text text={getServerDisplayName(server.type)} size="md" />
        {server.isActive && <ActiveBadge isDefault={server.isActive} />}
      </View>
      <Text text={server.url} size="xxs" />

      <View direction="row" gap={4} justifyContent="space-between">
        {!server.isActive && (
          <Pressable onPress={() => handleSetActiveServer(server.type)} hitSlop={10}>
            <View style={$makeDefaultButton}>
              <Text
                size="xs"
                color={colors.palette.primary700}
                text="Make Default"
                textDecorationLine="underline"
              />
            </View>
          </Pressable>
        )}

        {clearServer && (
          <Pressable onPress={() => clearServer(server.type)} hitSlop={10}>
            <View>
              <Text
                size="xs"
                color={colors.palette.primary700}
                text="Clear"
                textDecorationLine="underline"
              />
            </View>
          </Pressable>
        )}

        {/*{server.type === "local" && (*/}
        <ConnectButton onPress={() => handleAddServer(server.type)} mode="change" />
        {/*)}*/}
      </View>
    </View>
  )
}

function ActiveBadge({ isDefault }: { isDefault: boolean }) {
  return (
    <View style={$activeBadge}>
      <Text text={isDefault ? "Active" : "Inactive"} size="xs" />
    </View>
  )
}

/**
 * Given a server type, return the display name
 * @param {Sync.ServerType} type - The type of server
 * @returns {string} The display name of the server
 */
const getServerDisplayName = (type: Sync.ServerType): string => {
  switch (type) {
    case "local":
      return "Local Server"
    case "cloud":
      return "Cloud Server"
    default:
      return "Unknown Server"
  }
}

const $root: ViewStyle = {
  flex: 1,
  paddingHorizontal: 14,
}

const $withBottomBorder: ViewStyle = {
  borderBottomColor: colors.border,
  borderBottomWidth: 1,
}

const $syncButtonContainer: ViewStyle = {
  paddingVertical: 16,
  alignItems: "center",
}

const $manualSyncButton: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
  gap: 8,
  paddingHorizontal: 20,
  paddingVertical: 10,
  backgroundColor: colors.palette.primary50,
  borderRadius: 8,
  borderWidth: 1,
  borderColor: colors.palette.primary200,
}

const $syncButtonDisabled: ViewStyle = {
  backgroundColor: colors.palette.neutral100,
  borderColor: colors.palette.neutral300,
}

const $cameraContainer: ViewStyle = {
  height,
  width,
}

const $connectButton: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
  gap: 4,
}

const $makeDefaultButton: ViewStyle = {
  backgroundColor: colors.palette.neutral200,
  borderRadius: 6,
  padding: 4,
}

const $activeBadge: ViewStyle = {
  backgroundColor: colors.palette.neutral300,
  borderRadius: 6,
  paddingHorizontal: 8,
  paddingVertical: 4,
}
