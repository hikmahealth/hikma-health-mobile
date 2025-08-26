/**
 * These are configuration settings for the production environment.
 *
 * Do not include API secrets in this file or anywhere in your JS.
 *
 * https://reactnative.dev/docs/security#storing-sensitive-info
 */

export default {
  API_URL: "https://api.rss2json.com/v1/",
  API_URL_TESTING: process.env.EXPO_PUBLIC_HIKMA_API_TESTING,
}
