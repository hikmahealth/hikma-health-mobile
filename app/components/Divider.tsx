import { StyleProp, View, ViewStyle } from "react-native"

import { colors } from "@/theme/colors"

export interface DividerProps {
  /**
   * An optional style override useful for padding & margin.
   */
  style?: StyleProp<ViewStyle>
}

/**
 * Horizontal line to separate content.
 */
export const Divider = function Divider(props: DividerProps) {
  const { style } = props
  const $styles = [$container, style]

  return <View style={$styles}></View>
}

// Divider (horizontal line used to separate content) styles
const $container: ViewStyle = {
  backgroundColor: colors.border,
  height: 1,
  width: "100%",
}
