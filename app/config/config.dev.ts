/**
 * These are configuration settings for the dev environment.
 *
 * Do not include API secrets in this file or anywhere in your JS.
 *
 * https://reactnative.dev/docs/security#storing-sensitive-info
 */
import Config from "react-native-config"

export default {
  API_URL: Config.HIKMA_DEV_API,
}
