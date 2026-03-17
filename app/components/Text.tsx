import { ReactNode, forwardRef, ForwardedRef } from "react"
// eslint-disable-next-line no-restricted-imports
import { StyleProp, Text as RNText, TextProps as RNTextProps, TextStyle } from "react-native"
import { TOptions } from "i18next"

import { useSelector } from "@xstate/react"

import { TxKeyPath } from "@/i18n"
import { translate } from "@/i18n/translate"
import { languageStore } from "@/store/language"
import { useAppTheme } from "@/theme/context"
import type { ThemedStyle, ThemedStyleArray } from "@/theme/types"
import { typography } from "@/theme/typography"

export type Sizes = keyof typeof $sizeStyles
type Weights = keyof typeof typography.primary
type Presets = "default" | "bold" | "heading" | "subheading" | "formLabel" | "formHelper"

export interface TextProps extends RNTextProps {
  /**
   * Text which is looked up via i18n.
   */
  tx?: TxKeyPath
  /**
   * The text to display if not using `tx` or nested components.
   */
  text?: string
  /**
   * Optional options to pass to i18n. Useful for interpolation
   * as well as explicitly setting locale or translation fallbacks.
   */
  txOptions?: TOptions
  /**
   * An optional style override useful for padding & margin.
   */
  style?: StyleProp<TextStyle>
  /**
   * One of the different types of text presets.
   */
  preset?: Presets
  /**
   * Decoration Line of the text
   */
  textDecorationLine?: "none" | "underline" | "line-through" | "underline line-through"
  /**
   * Color of the text
   */
  color?: string
  /**
   * Text weight modifier.
   */
  weight?: Weights
  /**
   * Text size modifier.
   */
  size?: Sizes
  /**
   * Text aligh modifier
   */
  align?: "auto" | "left" | "right" | "center"
  /**
   * Whether to append an asterisk (*) to the text.
   * Useful for marking required form fields or indicating a disclaimer.
   */
  withAsterisk?: boolean
  /**
   * Children components.
   */
  children?: ReactNode
}

/**
 * For your text displaying needs.
 * This component is a HOC over the built-in React Native one.
 * @see [Documentation and Examples]{@link https://docs.infinite.red/ignite-cli/boilerplate/app/components/Text/}
 * @param {TextProps} props - The props for the `Text` component.
 * @returns {JSX.Element} The rendered `Text` component.
 */
export const Text = forwardRef(function Text(props: TextProps, ref: ForwardedRef<RNText>) {
  const {
    weight,
    size,
    tx,
    txOptions,
    text,
    children,
    textDecorationLine,
    color,
    align,
    withAsterisk,
    style: $styleOverride,
    ...rest
  } = props
  const { themed } = useAppTheme()
  const { isRTL } = useSelector(languageStore, (state) => state.context)

  const i18nText = tx && translate(tx, txOptions)
  const content = i18nText || text || children
  const displayContent = withAsterisk && typeof content === "string" ? `${content} *` : content

  const preset: Presets = props.preset ?? "default"
  const $styles: StyleProp<TextStyle> = [
    isRTL ? $rtlStyle : undefined,
    themed($presets[preset]),
    weight && $fontWeightStyles[weight],
    // When RTL, drop the custom fontFamily so the system font handles non-Latin
    // glyphs while preserving the numeric fontWeight for correct rendering.
    isRTL && { fontFamily: undefined },
    size && $sizeStyles[size],
    color ? { color } : {},
    textDecorationLine ? { textDecorationLine } : {},
    { textAlign: align ?? (isRTL ? "right" : "left") },
    $styleOverride,
  ]

  return (
    <RNText {...rest} style={$styles} ref={ref}>
      {displayContent}
    </RNText>
  )
})

const $sizeStyles = {
  xxl: { fontSize: 36, lineHeight: 44 } satisfies TextStyle,
  xl: { fontSize: 24, lineHeight: 34 } satisfies TextStyle,
  lg: { fontSize: 20, lineHeight: 32 } satisfies TextStyle,
  md: { fontSize: 18, lineHeight: 26 } satisfies TextStyle,
  sm: { fontSize: 16, lineHeight: 24 } satisfies TextStyle,
  xs: { fontSize: 14, lineHeight: 21 } satisfies TextStyle,
  xxs: { fontSize: 12, lineHeight: 18 } satisfies TextStyle,
}

const fontWeightMap: Record<string, TextStyle["fontWeight"]> = {
  light: "300",
  normal: "400",
  medium: "500",
  semiBold: "600",
  bold: "700",
}

const $fontWeightStyles = Object.entries(typography.primary).reduce((acc, [weight, fontFamily]) => {
  return { ...acc, [weight]: { fontFamily, fontWeight: fontWeightMap[weight] ?? "400" } }
}, {}) as Record<Weights, TextStyle>

const $baseStyle: ThemedStyle<TextStyle> = (theme) => ({
  ...$sizeStyles.sm,
  ...$fontWeightStyles.normal,
  color: theme.colors.text,
})

const $presets: Record<Presets, ThemedStyleArray<TextStyle>> = {
  default: [$baseStyle],
  bold: [$baseStyle, { ...$fontWeightStyles.bold }],
  heading: [
    $baseStyle,
    {
      ...$sizeStyles.xxl,
      ...$fontWeightStyles.bold,
    },
  ],
  subheading: [$baseStyle, { ...$sizeStyles.lg, ...$fontWeightStyles.medium }],
  formLabel: [$baseStyle, { ...$fontWeightStyles.medium }],
  formHelper: [$baseStyle, { ...$sizeStyles.sm, ...$fontWeightStyles.normal }],
}
const $rtlStyle: TextStyle = { writingDirection: "rtl" }
