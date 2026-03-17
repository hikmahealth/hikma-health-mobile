/** @type {import('@jest/types').Config.ProjectConfig} */
module.exports = {
  preset: "jest-expo",
  setupFiles: ["<rootDir>/test/setup.ts"],
  testPathIgnorePatterns: ["/node_modules/", "/.maestro/"],
  transformIgnorePatterns: [
    "node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@sentry/react-native|native-base|react-native-svg|@noble/curves|@noble/hashes|@noble/ciphers|@scure/base|immer|use-immer|uuid)",
  ],
  moduleNameMapper: {
    "^@noble/curves/([^.]+)$": "<rootDir>/node_modules/@noble/curves/$1.js",
    "^@noble/hashes/([^.]+)$": "<rootDir>/node_modules/@noble/hashes/$1.js",
    "^@noble/ciphers/([^.]+)$": "<rootDir>/node_modules/@noble/ciphers/$1.js",
  },
  coveragePathIgnorePatterns: ["/node_modules/", "app/db/sync.ts"],
  collectCoverage: false,
  coverageDirectory: "coverage",
  coverageReporters: ["text", "text-summary", "lcov", "json-summary"],
  coverageThreshold: {
    "global": {
      branches: 20,
      functions: 20,
      lines: 20,
      statements: 20,
    },
    // Ratchet thresholds: set just below current coverage to prevent regression.
    // Pure-function tests cover the extractable logic; remaining uncovered code
    // is network I/O, WatermelonDB sync hooks, and DB subscriptions.
"./app/models/UserClinicPermissions.ts": {
      branches: 75,
      functions: 50,
      lines: 68,
      statements: 68,
    },
    "./app/models/Sync.ts": {
      branches: 54,
      functions: 60,
      lines: 60,
      statements: 60,
    },
  },
}
