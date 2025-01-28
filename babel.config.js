// const path = require("path");

/** @type {import('@babel/core').TransformOptions['plugins']} */
const plugins = [
  /** react-native-reanimated web support @see https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/installation/#web */
  // "@babel/plugin-proposal-export-namespace-from",
  // [
  //   "module-resolver",
  //   {
  //     extensions: [".ios.js", ".android.js", ".ios.jsx", ".android.jsx", ".js", ".jsx", ".json", ".ts", ".tsx"],
  //     root: ["."],
  //     alias: {
  //       "app": path.resolve(__dirname + "/app"),
  //     },
  //   },
  // ],
  /** NOTE: This must be last in the plugins @see https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/installation/#babel-plugin */
  "react-native-reanimated/plugin",
]

/** @type {import('@babel/core').TransformOptions} */
module.exports = function(api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    env: {
      production: {},
    },
    plugins,
  };
};