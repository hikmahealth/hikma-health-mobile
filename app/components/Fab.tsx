import * as React from "react"
import { Pressable, StyleProp, ViewStyle } from "react-native"
import { observer } from "mobx-react-lite"
import { colors } from "../theme"
import { LucideIcon } from "lucide-react-native"

export interface FabProps {
  /**
   * An optional style override useful for padding & margin.
   */
  style?: StyleProp<ViewStyle>
  /**
   * A function that is invoked when the button is pressed.
   */
  onPress?: () => void
  /**
   * The icon to display for the `Fab`.
   */
  Icon: LucideIcon
}

/**
 * Floating Action Button Component
 */
export const Fab = observer(function Fab(props: FabProps) {
  const { style, onPress, Icon } = props
  const $styles = [$container, style]

  return (
    <Pressable style={$styles} onPress={onPress}>
      <Icon size={24} color={colors.palette.neutral100} />
    </Pressable>
  )
})

const $container: ViewStyle = {
  position: "absolute",
  bottom: 54,
  right: 24,
  width: 64,
  height: 64,
  elevation: 4,
  zIndex: 100,
  borderRadius: 100,
  backgroundColor: colors.palette.primary500,
  justifyContent: "center",
  alignItems: "center",
}
