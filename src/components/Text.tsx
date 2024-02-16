import I18n from "i18n-js"
import React, { useEffect } from "react"
// import { StyleProp, Text as RNText, TextProps as RNTextProps, TextStyle } from "react-native"
import { TextStyle, StyleProp } from "react-native"
import { Text as RNPText, TextProps as RNPTextProps } from "react-native-paper"
import { isRTL, i18n, translate, TxKeyPath } from "../i18n"
import { useLanguageStore } from "../stores/language"
import { colors } from "../theme/colors"
import { typography } from "../theme/typography"
// import { colors, typography } from "../theme"

type Sizes = keyof typeof $sizeStyles
type Weights = keyof typeof typography.primary
type Presets = keyof typeof $presets

export type TextProps = Omit<RNPTextProps, "children"> & {
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
  txOptions?: I18n.TranslateOptions
  // /**
  //  * An optional style override useful for padding & margin.
  //  */
  // style?: StyleProp<TextStyle>
  /**
   * One of the different types of text presets.
   */
  // preset?: Presets
  /**
   * Text weight modifier.
   */
  // weight?: Weights
  /**
   * Text size modifier.
   */
  // size?: Sizes
  /**
   * Children components.
   */
  children?: React.ReactNode
}

/**
 * For your text displaying needs.
 * This component is a HOC over the built-in React Native one.
 *
 * - [Documentation and Examples](https://github.com/infinitered/ignite/blob/master/docs/Components-Text.md)
 */
export function Text(props: TextProps) {
  const {
    // weight,
    // size,
    tx,
    txOptions,
    text,
    children,
    style: $styleOverride,
    ...rest
  } = props

  // const [v, setV] = React.useState(0);

  const i18nText = tx && translate(tx, txOptions)
  const content = i18nText || text || children
  const isRtl = useLanguageStore((state) => state.isRtl);


  // const preset: Presets = $presets[props.preset] ? props.preset : 'default';
  const $styles = [
    isRtl ? $rtlStyle : {},
    // $presets[preset],
    // $fontWeightStyles[weight],
    // $sizeStyles[size],
    $styleOverride,
  ]

  return (
    <RNPText {...rest} style={$styles}>
      {content}
    </RNPText>
  )
}

const $sizeStyles = {
  xxl: { fontSize: 36, lineHeight: 44 } as TextStyle,
  xl: { fontSize: 24, lineHeight: 34 } as TextStyle,
  lg: { fontSize: 20, lineHeight: 32 } as TextStyle,
  md: { fontSize: 18, lineHeight: 26 } as TextStyle,
  sm: { fontSize: 16, lineHeight: 24 } as TextStyle,
  xs: { fontSize: 14, lineHeight: 21 } as TextStyle,
  xxs: { fontSize: 12, lineHeight: 18 } as TextStyle,
}


// @ts-expect-error: the platform select for the primary text is causing a type of undefined to be possible
const $fontWeightStyles = Object.entries(typography.primary).reduce(
  (acc, [weight, fontFamily]) => {
    return { ...acc, [weight]: { fontFamily } };
  },
  {},
) as Record<Weights, TextStyle>;

const $baseStyle: StyleProp<TextStyle> = [
  $sizeStyles.sm,
  // @ts-expect-error: the platform select for the primary text is causing a type of undefined to be possible
  $fontWeightStyles.normal,
  { color: colors.text },
];

const $presets = {
  default: $baseStyle,

  // @ts-expect-error: the platform select for the primary text is causing a type of undefined to be possible
  bold: [$baseStyle, $fontWeightStyles.bold] as StyleProp<TextStyle>,

  heading: [
    // $baseStyle,
    $sizeStyles.xxl,
    // $fontWeightStyles.bold,
  ] as StyleProp<TextStyle>,

  subheading: [
    // $baseStyle,
    $sizeStyles.lg,
    // $fontWeightStyles.medium,
  ] as StyleProp<TextStyle>,

  // formLabel: [$baseStyle, $fontWeightStyles.medium] as StyleProp<TextStyle>,

  formHelper: [
    // $baseStyle,
    $sizeStyles.sm,
    // $fontWeightStyles.normal,
  ] as StyleProp<TextStyle>,
}

const $rtlStyle: TextStyle = { writingDirection: "rtl", textAlign: "right" }
