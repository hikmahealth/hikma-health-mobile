const { defaults: tsjPreset } = require("ts-jest/presets")

module.exports = {
  ...tsjPreset,
  preset: "jest-expo",
  verbose: true,
  collectCoverage: true,
  collectCoverageFrom: ["<rootDir>/src/**/*.{js,jsx,ts,tsx}", "!**/node_modules/**"],
  coverageReporters: ["text-summary", "lcov"],
  testEnvironment: { url: "http://localhost/" },
  globals: {
    "ts-jest": {
      babelConfig: true,
    },
  },
  transform: {
    // '^.+\\.[tj]sx?$' to process js/ts with `ts-jest`
    // '^.+\\.m?[tj]sx?$' to process js/ts/mjs/mts with `ts-jest`
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        diagnostics: {
          warnOnly: true,
        },
      },
    ],
  },
  transformIgnorePatterns: [
    "<rootDir>/node_modules/(react-clone-referenced-element|@react-native-community|react-navigation|@react-navigation/.*|@unimodules/.*|native-base|react-native-code-push)",
  ],
  testPathIgnorePatterns: ["<rootDir>/node_modules/", "/detox", "@react-native"],
  testEnvironment: "jsdom",
  setupFiles: ["<rootDir>/test/setup.ts"],
  "setupFilesAfterEnv": ["@testing-library/jest-native/extend-expect"]

}
