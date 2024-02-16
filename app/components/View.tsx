import * as React from "react"
import { StyleProp, View as RNView, ViewStyle, ViewProps as RNViewProps } from "react-native"
import { observer } from "mobx-react-lite"

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
} & RNViewProps

/**
 * Enhanced View component
 * This is simmilar to how nativebase and tailwindcss and chakra-ui work
 * Simply used to make styling easier
 */
export const View = observer(function View(props: ViewProps) {
  const {
    style,
    children,
    gap,
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
    justifyContent,
    alignItems,
    ...rest
  } = props
  const $styles = [
    $container,
    style,
    gap && { gap },
    direction && { flexDirection: direction },
    flex && { flex },
    justifyContent && { justifyContent },
    alignItems && { alignItems },
    mt && { marginTop: mt },
    mb && { marginBottom: mb },
    my && { marginVertical: my },
    pt && { paddingTop: pt },
    pb && { paddingBottom: pb },
    pl && { paddingLeft: pl },
    pr && { paddingRight: pr },
    py && { paddingVertical: py },
    px && { paddingHorizontal: px },
    p && { padding: p },
  ]

  return (
    <RNView style={$styles} {...rest}>
      {children}
    </RNView>
  )
})

const $container: ViewStyle = {}
