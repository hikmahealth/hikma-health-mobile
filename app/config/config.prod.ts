/**
 * These are configuration settings for the production environment.
 *
 * Do not include API secrets in this file or anywhere in your JS.
 *
 * https://reactnative.dev/docs/security#storing-sensitive-info
 */
import Config from "react-native-config"

export default {
  API_URL: Config.HIKMA_API,
  API_URL_TESTING: Config.HIKMA_API_TESTING,
}
