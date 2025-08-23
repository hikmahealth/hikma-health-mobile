import { StyleProp, TextStyle, View, ViewStyle } from "react-native"
import { useNetInfo } from "@react-native-community/netinfo"

import { Text } from "@/components/Text"
import { useAppTheme } from "@/theme/context"
import type { ThemedStyle } from "@/theme/types"

export interface NetworkStatusIndicatorProps {
  /**
   * An optional style override useful for padding & margin.
   */
  style?: StyleProp<ViewStyle>
}

/**
 * A network status indicator that shows connection state with colored circle and text
 */
export const NetworkStatusIndicator = (props: NetworkStatusIndicatorProps) => {
  const { style } = props
  const $styles = [$container, style]
  const { themed } = useAppTheme()
  const { isConnected, isInternetReachable } = useNetInfo()

  // Determine status and styling based on connection state
  let statusText = "No Connection"
  let indicatorColor = "#9CA3AF" // gray

  if (isConnected && isInternetReachable) {
    statusText = "Connected"
    indicatorColor = "#10B981" // green
  } else if (isConnected && !isInternetReachable) {
    statusText = "Connected (No Internet)"
    indicatorColor = "#F97316" // orange
  }

  return (
    <View style={$styles}>
      <View style={[$indicator, { backgroundColor: indicatorColor }]} />
      <Text style={themed($text)}>{statusText}</Text>
    </View>
  )
}

const $container: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "center",
}

const $indicator: ViewStyle = {
  width: 8,
  height: 8,
  borderRadius: 4,
  marginRight: 8,
}

const $text: ThemedStyle<TextStyle> = ({ colors, typography }) => ({
  fontFamily: typography.primary.normal,
  fontSize: 14,
  color: colors.palette.primary500,
})
