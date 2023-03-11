const { defaults: tsjPreset } = require("ts-jest/presets")

module.exports = {
  ...tsjPreset,
  preset: "jest-expo",
  verbose: true,
  // collectCoverage: true,
  collectCoverageFrom: ["<rootDir>/src/**/*.{js,jsx,ts,tsx}", "!**/node_modules/**"],
  coverageReporters: ["text-summary", "lcov"],
  testEnvironment: { url: "http://localhost/" },
  globals: {
    "ts-jest": {
      babelConfig: true,
    },
    "__DEV__": true,
    "__TEST__": true
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
    "<rootDir>/node_modules/(react-clone-referenced-element|@react-native-community|react-navigation|@react-navigation|@nozbe/.*|@react-navigation/.*|@unimodules/.*|watermelon|react-native-code-push)",
    // '<rootDir>/node_modules/(?!(jest-)?react-native|react-clone-referenced-element|@react-native-community|react-navigation|rollbar-react-native|@fortawesome|@react-native|@react-navigation|@unimodules/.*|@nozbe/*|react-native-code-push)',
  ],
  testPathIgnorePatterns: ["<rootDir>/node_modules/", "/detox", "@react-native"],
  testEnvironment: "jsdom",
  setupFiles: ["<rootDir>/test/setup.ts"],
  "setupFilesAfterEnv": ["@testing-library/jest-native/extend-expect"],
  "moduleNameMapper": {
    "\\.(png|jpg|ico|jpeg|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$": "<rootDir>/test/imageMock.tsx"
  }
}
