const plugins = [
  [
    '@babel/plugin-proposal-decorators',
    {
      legacy: true,
    },
  ],
  ['@babel/plugin-proposal-optional-catch-binding'],
  [
    'module:react-native-dotenv',
    {
      envName: 'APP_ENV',
      moduleName: '@env',
      path: '.env',
    },
  ],
  // '@babel/plugin-proposal-class-properties',
  // '@babel/plugin-proposal-private-methods',
  'react-native-reanimated/plugin', // NOTE: this must be last in the plugins
];

const vanillaConfig = {
  presets: ['module:metro-react-native-babel-preset'],
  env: {
    production: {
      plugins: [['react-native-paper/babel'], ['transform-remove-console', { exclude: ['error'] }]],
    },
  },
  plugins,
};

const expoConfig = {
  presets: ['babel-preset-expo'],
  env: {
    production: {
      plugins: ['transform-remove-console', { exclude: ['error'] }]
    },
  },
  plugins,
};

let isExpo = false;
try {
  const Constants = require('expo-constants');
  // True if the app is running in an `expo build` app or if it's running in Expo Go.
  isExpo =
    Constants.executionEnvironment === 'standalone' ||
    Constants.executionEnvironment === 'storeClient'
} catch {}

const babelConfig = isExpo ? expoConfig : vanillaConfig;

module.exports = babelConfig;
