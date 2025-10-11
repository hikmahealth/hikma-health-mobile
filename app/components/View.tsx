import {
  StyleProp,
  TextStyle,
  View as RNView,
  ViewStyle,
  ViewProps as RNViewProps,
} from "react-native"

import { Text } from "@/components/Text"
import { useAppTheme } from "@/theme/context"
import type { ThemedStyle } from "@/theme/types"

export type ViewProps = {
  /**
   * An optional style override useful for padding & margin.
   */
  style?: StyleProp<ViewStyle>

  /** Flex gap between components */
  gap?: number

  /** Flex Direction of component children */
  direction?: "row" | "column" | "row-reverse" | "column-reverse"

  /** The flex number */
  flex?: number

  /** Flex Wrap */
  flexWrap?: "wrap" | "nowrap" | "wrap-reverse"

  /** Margin */
  m?: number

  /** Margin Top */
  mt?: number

  /** Margin Bottom */
  mb?: number

  /** Margin Vertically */
  my?: number

  /** Padding all around */
  p?: number

  /** Padding Top */
  pt?: number

  /** Padding Bottom */
  pb?: number

  /** Padding Right */
  pr?: number

  /** Padding Left */
  pl?: number

  /** Padding Vertically */
  py?: number

  /** Padding Horizontally */
  px?: number

  /** Justify Content */
  justifyContent?:
    | "space-between"
    | "center"
    | "flex-start"
    | "flex-end"
    | "space-around"
    | "stretch"

  /** Align Items */
  alignItems?: "flex-start" | "flex-end" | "center" | "stretch" | "baseline"

  /** Align Content */
  alignContent?: "space-between" | "center" | "flex-start" | "flex-end" | "space-around" | "stretch"

  /** Height */
  height?: number

  /** Width */
  width?: number

  /** Border Radius */
  borderRadius?: number
} & RNViewProps

/**
 * Custom View component with various styling options.
 */
export const View = (props: ViewProps) => {
  const {
    style,
    children,
    gap,
    m,
    mt,
    mb,
    my,
    pt,
    pb,
    pl,
    pr,
    px,
    py,
    p,
    direction,
    flex,
    flexWrap,
    justifyContent,
    alignItems,
    alignContent,
    height,
    width,
    borderRadius,
    ...rest
  } = props
  const $styles = [
    $container,
    composeStyles({
      gap,
      m,
      mt,
      mb,
      my,
      pt,
      pb,
      pl,
      pr,
      px,
      py,
      p,
      direction,
      flex,
      flexWrap,
      justifyContent,
      alignItems,
      alignContent,
      height,
      width,
      borderRadius,
    }),
    style,
  ]

  return (
    <RNView style={$styles} {...rest}>
      {children}
    </RNView>
  )
}

const styleMapping: Record<string, keyof ViewStyle> = {
  gap: "gap",
  direction: "flexDirection",
  flex: "flex",
  flexWrap: "flexWrap",
  justifyContent: "justifyContent",
  alignItems: "alignItems",
  alignContent: "alignContent",
  m: "margin",
  mt: "marginTop",
  mb: "marginBottom",
  my: "marginVertical",
  pt: "paddingTop",
  pb: "paddingBottom",
  pl: "paddingLeft",
  pr: "paddingRight",
  py: "paddingVertical",
  px: "paddingHorizontal",
  p: "padding",
  height: "height",
  width: "width",
  borderRadius: "borderRadius",
}

const composeStyles = (styles: Record<string, unknown>): ViewStyle => {
  const result = {} as ViewStyle

  Object.entries(styles).forEach(([key, value]) => {
    const styleKey = styleMapping[key as keyof typeof styleMapping]
    if (styleKey) {
      result[styleKey] = value as any
    }
  })

  return result
}

const $container: ViewStyle = {}
