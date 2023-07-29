const { defaults: tsjPreset } = require("ts-jest/presets")

module.exports = {
  ...tsjPreset,
  preset: "jest-expo",
  verbose: true,
  collectCoverage: true,
  collectCoverageFrom: [
    "**/*.{js,jsx,ts,tsx}", 
    "!**/node_modules/**", 
    '!**/vendor/**', 
    '!**/test/**', 
    '!**/coverage/**'
  ],
  coverageReporters: ["text-summary", "lcov"],
  testEnvironment: "jsdom",
  globals: {
    "ts-jest": {
      babelConfig: true,
      diagnostics: {
        warnOnly: true,
        exclude: ['!**/*.(spec|test).ts?(x)'],
      },
    },
    __TEST__: true,
  },
  transform: {
    // '^.+\\.[tj]sx?$' to process js/ts with `ts-jest`
    // '^.+\\.m?[tj]sx?$' to process js/ts/mjs/mts with `ts-jest`
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        diagnostics: false,
      },
    ],
  },
  transformIgnorePatterns: [
    "<rootDir>/node_modules/(react-clone-referenced-element|@react-native-community|react-navigation|@react-navigation/.*|@unimodules/.*|native-base|react-native-code-push)",
  ],
  testPathIgnorePatterns: ["<rootDir>/node_modules/", "/detox", "@react-native"],
  testEnvironment: "jsdom",
  setupFiles: ["<rootDir>/test/setup.ts"],
  "setupFilesAfterEnv": ["@testing-library/jest-native/extend-expect"],
  moduleNameMapper: {
    '\\.(png|jpg|ico|jpeg|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$':
      '<rootDir>/test/imageMock.tsx',
  },
}
