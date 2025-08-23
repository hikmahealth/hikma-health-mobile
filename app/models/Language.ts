namespace Language {
  export type LanguageName =
    | "ar"
    | "en-US"
    | "en"
    | "es"
    | "ko"
    | "fr"
    | "sw"
    | "cn"
    | "jp"
    | "ru"
    | "de"
    | "it"
    | "pt"
    | "hi"
    | "ur"
    | "fa"
    | "ku"
    | "he"
    | "dv"
    | "az"
    | "arc"

  export const languagesList: LanguageName[] = [
    "ar",
    "en-US",
    "en",
    "es",
    "ko",
    "fr",
    "sw",
    "cn",
    "jp",
    "ru",
    "de",
    "it",
    "pt",
    "hi",
    "ur",
    "fa",
    "ku",
    "he",
    "dv",
    "az",
    "arc",
  ]

  export const RTL_LANGUAGES: LanguageName[] = [
    "ar", // arabic
    "arc", // aramaic
    "az", // azeri
    "dv", // dhevei
    "he", // hebrew
    "ku", // kurdish
    "fa", // farsi / persion
    "ur", // urdu
  ]

  export type DefaultLanguages = {
    en: LanguageName
    ar?: LanguageName
    es?: LanguageName
  }

  export const Language: Record<LanguageName, LanguageName> = {
    "en": "en",
    "ar": "ar",
    "es": "es",
    "en-US": "en-US",
    "ko": "ko",
    "fr": "fr",
    "sw": "sw",
    "cn": "cn",
    "jp": "jp",
    "ru": "ru",
    "de": "de",
    "it": "it",
    "pt": "pt",
    "hi": "hi",
    "ur": "ur",
    "fa": "fa",
    "ku": "ku",
    "he": "he",
    "dv": "dv",
    "az": "az",
    "arc": "arc",
  }

  export type TranslationObject = DefaultLanguages & {
    [lang: string]: string
  }

  export const isRTL = (language: LanguageName) => RTL_LANGUAGES.includes(language)
}

export default Language
