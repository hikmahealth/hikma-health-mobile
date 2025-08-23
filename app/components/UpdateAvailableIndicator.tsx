import { Alert, Pressable, StyleProp, TextStyle, ViewStyle } from "react-native"
import * as Updates from "expo-updates"
import { LucideArrowBigDownDash } from "lucide-react-native"
import Toast from "react-native-root-toast"

import { colors } from "@/theme/colors"
import { useAppTheme } from "@/theme/context"
import type { ThemedStyle } from "@/theme/types"

export interface UpdateAvailableIndicatorProps {
  /**
   * An optional style override useful for padding & margin.
   */
  style?: StyleProp<ViewStyle>

  /**
   * An optional style override for the container.
   */
  containerStyle?: StyleProp<ViewStyle>
}

/**
 * Visual indicator that an update is available.
 */
export const UpdateAvailableIndicator = (props: UpdateAvailableIndicatorProps) => {
  const { style, containerStyle } = props
  const $styles = [$container, containerStyle, style]
  const { themed } = useAppTheme()

  const { currentlyRunning, isUpdateAvailable, isUpdatePending, isDownloading, downloadedUpdate } =
    Updates.useUpdates()

  const handleApplyUpdate = async () => {
    Alert.alert(
      "Apply Update",
      "The app will restart to apply the update. Continue?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Apply",
          onPress: async () => {
            try {
              await Updates.reloadAsync()
            } catch (error) {
              Toast.show("Error applying update", {
                duration: Toast.durations.SHORT,
                position: Toast.positions.BOTTOM,
                shadow: true,
                animation: true,
                hideOnPress: true,
                delay: 0,
              })
              console.error("Error applying update:", error)
            }
          },
        },
      ],
      {
        cancelable: true,
      },
    )
  }

  // Code to apply the latest update with a refresh
  // Updates.reloadAsync()

  // Icons for each state:
  // Downloading: LucideDownload
  // isUpdatePending: LucideArrowBigDownDash
  //

  // if (isUpdateAvailable) {
  //   return (
  //     <Pressable style={$styles}>
  //       <LucideArrowBigDownDash color={colors.palette.primary500} size={24} />
  //     </Pressable>
  //   )
  // }

  if (isUpdatePending) {
    return (
      <Pressable onPress={handleApplyUpdate} style={$styles}>
        <LucideArrowBigDownDash color={colors.palette.primary500} size={24} />
      </Pressable>
    )
  }

  return null
}

const $container: ViewStyle = {
  justifyContent: "center",
}
