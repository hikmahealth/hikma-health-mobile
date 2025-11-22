import { useEffect } from "react"
import { Pressable, StyleProp, ViewStyle } from "react-native"
import { LucideRefreshCcw } from "lucide-react-native"
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  cancelAnimation,
} from "react-native-reanimated"

import { useSync } from "@/hooks/useSync"
import { colors } from "@/theme/colors"

export interface SyncButtonIndicatorProps {
  /**
   * An optional style override useful for padding & margin.
   */
  style?: StyleProp<ViewStyle>
}

/**
 * A sync button indicator that displays a rotating refresh icon when syncing is in progress.
 */
export const SyncButtonIndicator = (props: SyncButtonIndicatorProps) => {
  const { style } = props
  const $styles = [$container, style]
  const { isFetching, isResolving, isPushing, isIdle, startSync, forceReset, hasError } = useSync()

  const rotation = useSharedValue(0)

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ rotate: `${rotation.value}deg` }],
    }
  })

  useEffect(() => {
    if (isFetching || isResolving || isPushing) {
      rotation.value = withRepeat(
        withTiming(360, { duration: 1000 }),
        -1, // infinite repetitions
        false, // don't reverse
      )
    } else {
      cancelAnimation(rotation)
      rotation.value = withTiming(0, { duration: 300 })
    }
  }, [isFetching, isResolving, isPushing, rotation])

  const handlePress = () => {
    if (hasError) {
      forceReset()
    }
    // Only trigger sync if not already syncing
    if (isIdle) {
      startSync()
        .then(() => {
          //   // Second sync ensures we get any server computed values. We need this for correct stock count values.
          //   return startSync()
          forceReset()
        })
        .catch((err) => {
          forceReset()
          console.log("Failed to start sync:", err)
        })
    }
  }

  return (
    <Pressable style={$styles} onPress={handlePress}>
      <Animated.View style={animatedStyle}>
        <LucideRefreshCcw color={colors.palette.primary500} size={22} />
      </Animated.View>
    </Pressable>
  )
}

const $container: ViewStyle = {
  justifyContent: "center",
}
