
module.exports = {
  presets: ['module:metro-react-native-babel-preset'],
  env: {
    production: {
      plugins: [['react-native-paper/babel'], ["transform-remove-console", { "exclude": ["error"] }]],
    },
  },
  plugins: [
    ["@babel/plugin-proposal-decorators", { "legacy": true }],
    '@babel/plugin-proposal-class-properties',
    '@babel/plugin-proposal-private-methods',
    'react-native-reanimated/plugin',
  ]
};

