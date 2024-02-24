const { defaults: tsjPreset } = require("ts-jest/presets")

/** @type {import('@jest/types').Config.ProjectConfig} */
module.exports = {
  ...tsjPreset,
  preset: "jest-expo",
  transformIgnorePatterns: [
    "<rootDir>/node_modules/(react-clone-referenced-element|@react-native-community|react-navigation|@react-navigation/.*|@unimodules/.*|native-base|react-native-code-push)",
    "jest-runner",
  ],
  testPathIgnorePatterns: ["<rootDir>/node_modules/", "<rootDir>/.maestro/", "@react-native", "<rootDir>/test/i18n.test.ts"],
  // testEnvironment: "jsdom",
  setupFiles: ["<rootDir>/test/setup.ts"],
  "setupFilesAfterEnv": [
    "@testing-library/jest-native/extend-expect"
  ],
  coverageDirectory: "<rootDir>/coverage",
  collectCoverageFrom: [
    "**/*.{js,jsx,ts,tsx}",
    "!**/node_modules/**",
    "!**/vendor/**",
    "!**/test/**",
    "!**/coverage/**",
    "!**/.expo/**",
    "!**/android/**",
    "!**/ios/**",
  ],
  collectCoverage: true,
  coverageReporters: ['clover', 'json', 'lcov'],
  reporters: ['summary'],
  // moduleNameMapper: {
  //   "app/(.*)": "<rootDir>/app/$1",
  // },
  transform:{
    // '^.+\\.test.tsx?$': ['ts-jest', {
      // tsconfig: '<rootDir>/test/test-tsconfig.json'
    // }],
    "^.+\\.[jt]sx?$": "babel-jest",
  },
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json", "node"],
  "globals": {
    "ts-jest": {
      "diagnostics": false
    }
  }
}
