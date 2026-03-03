// Pin fast-check seed globally for deterministic property-based tests in CI.
// This prevents flaky failures from random seed variation across runs.
import fc from "fast-check"
fc.configureGlobal({ seed: 1337 })

// Eagerly resolve all lazy globals installed by expo/src/winter/runtime.native.ts.
// Expo installs lazy getters for globals like structuredClone, __ExpoImportMetaRegistry, etc.
// Jest 30 blocks imports after leaveTestCode(), so if any lazy getter fires outside
// a test/hook scope it throws. Force-reading each global here (during setupFiles)
// resolves them eagerly while imports are still allowed.
void globalThis.__ExpoImportMetaRegistry
void globalThis.structuredClone

// we always make sure 'react-native' gets included first
// eslint-disable-next-line no-restricted-imports
import * as ReactNative from "react-native"

import mockFile from "./mockFile"

// libraries to mock
jest.doMock("react-native", () => {
  // Extend ReactNative
  // Use Object.assign to add mock methods onto the real Image component,
  // preserving its callable nature (spreading with {...Image} creates a plain object).
  return Object.setPrototypeOf(
    {
      Image: Object.assign(ReactNative.Image, {
        resolveAssetSource: jest.fn((_source) => mockFile), // eslint-disable-line @typescript-eslint/no-unused-vars
        getSize: jest.fn(
          (
            uri: string, // eslint-disable-line @typescript-eslint/no-unused-vars
            success: (width: number, height: number) => void,
            failure?: (_error: any) => void, // eslint-disable-line @typescript-eslint/no-unused-vars
          ) => success(100, 100),
        ),
      }),
    },
    ReactNative,
  )
})

jest.mock("react-native-nitro-modules", () => ({
  NitroModules: {
    createHybridObject: jest.fn(() => {
      // Return a mock object that won't be used since MMKV has its own mock
      return {}
    }),
  },
}))

jest.mock("i18next", () => ({
  currentLocale: "en",
  t: (key: string, params: Record<string, string>) => {
    return `${key} ${JSON.stringify(params)}`
  },
  translate: (key: string, params: Record<string, string>) => {
    return `${key} ${JSON.stringify(params)}`
  },
}))

jest.mock("expo-localization", () => ({
  ...jest.requireActual("expo-localization"),
  getLocales: () => [{ languageTag: "en-US", textDirection: "ltr" }],
}))

jest.mock("../app/i18n/index.ts", () => ({
  i18n: {
    isInitialized: true,
    language: "en",
    t: (key: string, params: Record<string, string>) => {
      return `${key} ${JSON.stringify(params)}`
    },
    numberToCurrency: jest.fn(),
  },
}))

declare const tron // eslint-disable-line @typescript-eslint/no-unused-vars

declare global {
  let __TEST__: boolean
}
