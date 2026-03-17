import { FC, useCallback, useEffect, useRef, useState } from "react"
import {
  Alert,
  BackHandler,
  Dimensions,
  Pressable,
  Vibration,
  ViewStyle,
  StyleSheet,
  TouchableOpacity,
  TextStyle,
  ActivityIndicator,
} from "react-native"
import { CameraType, useCameraPermissions, BarcodeScanningResult, CameraView } from "expo-camera"
import * as SecureStore from "expo-secure-store"
import { useSelector } from "@xstate/react"
import { LucideCamera, LucideRefreshCcw, LucideUpload, LucideDownload } from "lucide-react-native"
import Toast from "react-native-root-toast"

import { useIsFocused } from "@react-navigation/native"

import { Screen } from "@/components/Screen"
import { Text } from "@/components/Text"
import { TextField } from "@/components/TextField"
import { View } from "@/components/View"
import { useForceSyncActions } from "@/hooks/useForceSyncActions"
import { usePeerRegistration } from "@/hooks/usePeerRegistration"
import { useSync } from "@/hooks/useSync"
import { translate } from "@/i18n/translate"
import Peer from "@/models/Peer"
import User from "@/models/User"
import type { AppStackScreenProps } from "@/navigators/AppNavigator"
import type { HubSession } from "@/rpc/handshake"
import { createEncryptedTransport } from "@/rpc/transport"
import { appStateStore } from "@/store/appState"
import { colors } from "@/theme/colors"

import {
  peerToServerDisplay,
  markSyncTarget,
  getServerDisplayName,
  type DisplayServerType,
  type ServerDisplay,
} from "./syncSettingsHelpers"
import { If } from "@/components/If"

interface SyncSettingsScreenProps extends AppStackScreenProps<"SyncSettings"> {}
const { height, width } = Dimensions.get("screen")

// ── Helpers ───────────────────────────────────────────────────────────

const formatTimestamp = (ts: number | null): string => {
  if (!ts) return "Never"
  return new Date(ts).toLocaleString()
}

const formatDateForInput = (ts: number | null): string => {
  if (!ts) return ""
  const d = new Date(ts)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

const parseDateInput = (input: string): number => {
  const parsed = new Date(input)
  return isNaN(parsed.getTime()) ? 0 : parsed.getTime()
}

async function reauthWithHub(
  hubSession: HubSession,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const email = await SecureStore.getItemAsync("provider_email")
  const password = await SecureStore.getItemAsync("provider_password")

  if (!email || !password) {
    return { ok: false, error: "no_credentials" }
  }

  const transport = createEncryptedTransport(hubSession)
  const result = await transport.login(email, password)

  if (!result.ok) {
    return { ok: false, error: result.error.message }
  }

  const updatedSession: HubSession = { ...hubSession, token: result.data.token }
  await Peer.Session.save(updatedSession)
  await User.setFromHubLogin(result.data, email, password)

  return { ok: true }
}

// ── Hook ──────────────────────────────────────────────────────────────

function usePeerServers(activeSyncPeerId: string | null) {
  const [servers, setServers] = useState<ServerDisplay[]>([])

  useEffect(() => {
    const { unsubscribe } = Peer.DB.subscribe((peers) => {
      setServers(markSyncTarget(peers.map(peerToServerDisplay), activeSyncPeerId))
    })
    return unsubscribe
  }, [activeSyncPeerId])

  return { servers }
}

const HEARTBEAT_INTERVAL_MS = 5000

function useHeartbeats(servers: ServerDisplay[], active: boolean) {
  const [statuses, setStatuses] = useState<Record<string, boolean>>({})
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const poll = useCallback(async () => {
    const results: Record<string, boolean> = {}
    await Promise.all(
      servers.map(async (s) => {
        if (!s.url) {
          results[s.id] = false
          return
        }
        results[s.id] = await Peer.heartbeat(s.url)
      }),
    )
    setStatuses(results)
  }, [servers])

  useEffect(() => {
    if (!active || servers.length === 0) {
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
      return
    }

    poll()
    timerRef.current = setInterval(poll, HEARTBEAT_INTERVAL_MS)

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }
  }, [active, poll, servers.length])

  return statuses
}

// ── Screen ────────────────────────────────────────────────────────────

export const SyncSettingsScreen: FC<SyncSettingsScreenProps> = () => {
  const [isCameraScannerActive, setIsCameraScannerActive] = useState(false)
  const [facing, setFacing] = useState<CameraType>("back")
  const [permission, requestPermission] = useCameraPermissions()
  const [serverTypeScanner, setServerTypeScanner] = useState<DisplayServerType>("local")
  const [scanned, setScanned] = useState(false)
  const [processingServer, setProcessingServer] = useState(false)

  const activeSyncPeerId = useSelector(appStateStore, (s) => s.context.activeSyncPeerId)
  const { servers } = usePeerServers(activeSyncPeerId)
  const { registerFromQR } = usePeerRegistration()
  const isFocused = useIsFocused()
  const heartbeats = useHeartbeats(servers, isFocused)

  const handleSetActivePeer = (peerId: string) => {
    appStateStore.send({ type: "SET_ACTIVE_SYNC_PEER", peerId })
  }

  useEffect(() => {
    const backAction = () => {
      if (isCameraScannerActive) {
        setIsCameraScannerActive(false)
        return true
      }
      return false
    }

    const backHandler = BackHandler.addEventListener("hardwareBackPress", backAction)
    return () => backHandler.remove()
  }, [isCameraScannerActive])

  async function setCameraActive(serverType: DisplayServerType) {
    const { status } = await requestPermission()
    if (status === "granted") {
      setIsCameraScannerActive(true)
      setScanned(false)
      setServerTypeScanner(serverType)
    } else {
      Alert.alert(translate("login:requiredCameraPermissions"))
    }
  }

  const hasLocalServer = servers.some((server) => server.type === "local")

  const handleBarCodeScanned =
    (_serverType: DisplayServerType) =>
    async ({ data }: BarcodeScanningResult) => {
      setScanned(true)
      setProcessingServer(true)
      try {
        const result = await registerFromQR(data)

        if (!result.ok) {
          Alert.alert(translate("login:invalidQRCode"))
          setIsCameraScannerActive(false)
          return
        }

        Vibration.vibrate(500)
        await new Promise((resolve) => setTimeout(resolve, 2000))

        if (result.type === "sync_hub") {
          const authResult = await reauthWithHub(result.hubSession)

          if (authResult.ok) {
            Toast.show(translate("login:hubConnected"), {
              position: Toast.positions.BOTTOM,
              duration: Toast.durations.LONG,
            })
          } else {
            console.error("[SyncSettings] Hub re-auth failed:", authResult.error)
            Toast.show(translate("login:hubAuthFailed"), {
              position: Toast.positions.BOTTOM,
              duration: Toast.durations.LONG,
            })
          }
        }
      } catch (error) {
        console.error(error)
        Alert.alert(translate("login:invalidQRCode"))
      } finally {
        setScanned(false)
        setProcessingServer(false)
      }
      setIsCameraScannerActive(false)
    }

  const handleAddServer = (type: DisplayServerType) => {
    setCameraActive(type)
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
          onBarcodeScanned={scanned ? undefined : handleBarCodeScanned(serverTypeScanner)}
          style={StyleSheet.absoluteFillObject}
        />

        <If condition={processingServer && scanned}>
          <View style={$loadingIndicatorContainer}>
            <ActivityIndicator size="large" color={colors.palette.primary600} />
          </View>
        </If>
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
          server={cloudServer}
          isConnected={heartbeats[cloudServer.id]}
          onSetActive={handleSetActivePeer}
        />
      )}

      {localServer && (
        <ServerTypeComponent
          handleAddServer={handleAddServer}
          server={localServer}
          isConnected={heartbeats[localServer.id]}
          onSetActive={handleSetActivePeer}
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

// ── Components ────────────────────────────────────────────────────────

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

function ServerTypeComponent({
  server,
  handleAddServer,
  isConnected,
  onSetActive,
}: {
  server: ServerDisplay
  handleAddServer: (type: DisplayServerType) => void
  isConnected?: boolean
  onSetActive: (peerId: string) => void
}) {
  return (
    <View style={$withBottomBorder} py={12} direction="column" gap={4}>
      <View direction="row" gap={4} justifyContent="space-between" alignItems="center">
        <View direction="row" gap={6} alignItems="center">
          <View
            style={[$connectionDot, isConnected ? $connectionDotOnline : $connectionDotOffline]}
          />
          <Text text={getServerDisplayName(server.type)} size="md" />
        </View>
        {server.isActive ? (
          <ActiveBadge isDefault />
        ) : (
          <TouchableOpacity style={$setActiveButton} onPress={() => onSetActive(server.id)}>
            <Text text="Set Active" size="xxs" color={colors.palette.primary600} />
          </TouchableOpacity>
        )}
      </View>
      <Text text={server.url} size="xxs" />

      <Text
        text={`Last synced: ${formatTimestamp(server.lastSyncedAt)}`}
        size="xxs"
        color={colors.palette.neutral500}
      />

      <View direction="row" gap={4} justifyContent="space-between">
        <ConnectButton onPress={() => handleAddServer(server.type)} mode="change" />
      </View>

      {/* Disabled in production for now */}
      <If condition={__DEV__}>
        <ForceSyncActions serverId={server.id} lastSyncedAt={server.lastSyncedAt} />
      </If>
    </View>
  )
}

/**
 * Force sync upload/download actions for a specific peer.
 * Includes a date input and upload/download buttons.
 */
function ForceSyncActions({
  serverId,
  lastSyncedAt,
}: {
  serverId: string
  lastSyncedAt: number | null
}) {
  const [dateInput, setDateInput] = useState(formatDateForInput(lastSyncedAt))
  const { state, upload, download } = useForceSyncActions(serverId)

  const isBusy = state.isUploading || state.isDownloading

  const handleUpload = () => {
    const ts = parseDateInput(dateInput)
    Alert.alert(
      "Upload Device Data",
      `Upload all records changed since ${dateInput || "the beginning"} to this server?`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Upload", onPress: () => upload(ts) },
      ],
    )
  }

  const handleDownload = () => {
    const ts = parseDateInput(dateInput)
    Alert.alert(
      "Download Data From Server",
      `Download all records since ${dateInput || "the beginning"} from this server?`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Download", onPress: () => download(ts) },
      ],
    )
  }

  return (
    <View pt={8} direction="column" gap={6}>
      <Text text="Data Transfer" size="xs" color={colors.palette.neutral600} />

      {/* TODO: THIS SHOULD BE A DATE PICKER */}
      <TextField
        label="Since:"
        // style={$dateInput}
        value={dateInput}
        onChangeText={setDateInput}
        placeholder="YYYY-MM-DD"
        placeholderTextColor={colors.palette.neutral400}
      />

      <View direction="row" gap={8}>
        <TouchableOpacity
          style={[$forceSyncButton, isBusy && $syncButtonDisabled]}
          onPress={handleUpload}
          disabled={isBusy}
        >
          <LucideUpload
            color={isBusy ? colors.palette.neutral400 : colors.palette.primary600}
            size={14}
          />
          <Text
            text={state.isUploading ? "Uploading..." : "Upload device data"}
            size="xxs"
            color={isBusy ? colors.palette.neutral400 : colors.palette.primary600}
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={[$forceSyncButton, isBusy && $syncButtonDisabled]}
          onPress={handleDownload}
          disabled={isBusy}
        >
          <LucideDownload
            color={isBusy ? colors.palette.neutral400 : colors.palette.primary600}
            size={14}
          />
          <Text
            text={state.isDownloading ? "Downloading..." : "Download from server"}
            size="xxs"
            color={isBusy ? colors.palette.neutral400 : colors.palette.primary600}
          />
        </TouchableOpacity>
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

// ── Styles ────────────────────────────────────────────────────────────

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

const $activeBadge: ViewStyle = {
  backgroundColor: colors.palette.neutral300,
  borderRadius: 6,
  paddingHorizontal: 8,
  paddingVertical: 4,
}

const $setActiveButton: ViewStyle = {
  borderRadius: 6,
  paddingHorizontal: 8,
  paddingVertical: 4,
  borderWidth: 1,
  borderColor: colors.palette.primary200,
  backgroundColor: colors.palette.primary50,
}

const $forceSyncButton: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
  gap: 4,
  paddingHorizontal: 12,
  paddingVertical: 8,
  borderRadius: 6,
  borderWidth: 1,
  borderColor: colors.palette.primary200,
  backgroundColor: colors.palette.primary50,
}

const $dateInput: TextStyle = {
  flex: 1,
  borderWidth: 1,
  borderColor: colors.palette.neutral300,
  borderRadius: 6,
  paddingHorizontal: 10,
  paddingVertical: 6,
  fontSize: 12,
  color: colors.text,
}

const $loadingIndicatorContainer: ViewStyle = {
  position: "absolute",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  justifyContent: "center",
  alignItems: "center",
  zIndex: 999,
}

const $connectionDot: ViewStyle = {
  width: 10,
  height: 10,
  borderRadius: 5,
}

const $connectionDotOnline: ViewStyle = {
  backgroundColor: colors.palette.green600,
}

const $connectionDotOffline: ViewStyle = {
  backgroundColor: colors.palette.neutral400,
}
