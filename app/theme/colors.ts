const palette = {
  neutral100: "#FFFFFF",
  neutral200: "#F4F2F1",
  neutral300: "#D7CEC9",
  neutral400: "#B6ACA6",
  neutral500: "#978F8A",
  neutral600: "#564E4A",
  neutral700: "#3C3836",
  neutral800: "#191015",
  neutral900: "#000000",

  // primary100: "#F4E0D9",
  // primary200: "#E8C1B4",
  // primary300: "#DDA28E",
  // primary400: "#D28468",
  // primary500: "#C76542",
  // primary600: "#A54F31",

  // secondary100: "#DCDDE9",
  // secondary200: "#BCC0D6",
  // secondary300: "#9196B9",
  // secondary400: "#626894",
  // secondary500: "#41476E",

  secondary100: "#F4E0D9",
  secondary200: "#E8C1B4",
  secondary300: "#DDA28E",
  secondary400: "#D28468",
  secondary500: "#C76542",
  secondary600: "#A54F31",

  primary50: "#E6E9F0",
  primary100: "#8E9CC5",
  primary200: "#7284B7",
  primary300: "#566BA9",
  primary400: "#3A539B",
  primary500: "#314784",
  primary600: "#293B6E",
  primary700: "#212F58",

  accent100: "#FFEED4",
  accent200: "#FFE1B2",
  accent300: "#FDD495",
  accent400: "#FBC878",
  accent500: "#FFBB50",

  angry100: "#F2D6CD",
  angry200: "#E5AC99",
  angry300: "#D88D7A",
  angry400: "#CB6E5B",
  angry500: "#C03403",

  green100: "#dcfce7",
  green200: "#bbf7d0",
  green300: "#86efac",
  green400: "#4ade80",
  green500: "#22c55e",
  green600: "#16a34a",
  green700: "#15803d",

  success100: "#D1F2D1",
  success200: "#A7E9A7",
  success300: "#74E074",
  success400: "#4ACD4A",
  success500: "#3BA93B",

  overlay20: "rgba(25, 16, 21, 0.2)",
  overlay50: "rgba(25, 16, 21, 0.5)",
} as const

export const colors = {
  /**
   * The palette is available to use, but prefer using the name.
   * This is only included for rare, one-off cases. Try to use
   * semantic names as much as possible.
   */
  palette,
  /**
   * A helper for making something see-thru.
   */
  transparent: "rgba(0, 0, 0, 0)",
  /**
   * The default text color in many components.
   */
  text: palette.neutral800,
  /**
   * Secondary text information.
   */
  textDim: palette.neutral600,
  /**
   * The default color of the screen background.
   */
  background: palette.neutral200,
  /**
   * The default border color.
   */
  border: palette.neutral400,
  /**
   * The main tinting color.
   */
  tint: palette.primary500,
  /**
   * The inactive tinting color.
   */
  tintInactive: palette.neutral300,
  /**
   * A subtle color used for lines.
   */
  separator: palette.neutral300,
  /**
   * Error messages.
   */
  error: palette.angry500,
  /**
   * Error Background.
   */
  errorBackground: palette.angry100,
} as const
