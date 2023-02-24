
module.exports = {
  presets: ['module:metro-react-native-babel-preset'],
  env: {
    production: {
      plugins: [['react-native-paper/babel'], ["transform-remove-console", { "exclude": ["error"] }]],
    },
  },
  plugins: [
    ["@babel/plugin-proposal-decorators", { "legacy": true }],
    [
      "module:react-native-dotenv",
      {
        envName: "APP_ENV",
        moduleName: "@env",
        path: ".env"
      }
    ]
  ]
};

