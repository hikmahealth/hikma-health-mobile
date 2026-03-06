import * as SecureStore from "expo-secure-store"
import { Option } from "effect"
import Config from "react-native-config"
import { createMMKV } from "react-native-mmkv"

export const storage = createMMKV()

/**
 * Loads a string from storage.
 *
 * @param key The key to fetch.
 */
export function loadString(key: string): string | null {
  try {
    return storage.getString(key) ?? null
  } catch {
    // not sure why this would fail... even reading the RN docs I'm unclear
    return null
  }
}

/**
 * Saves a string to storage.
 *
 * @param key The key to fetch.
 * @param value The value to store.
 */
export function saveString(key: string, value: string): boolean {
  try {
    storage.set(key, value)
    return true
  } catch {
    return false
  }
}

/**
 * Loads something from storage and runs it thru JSON.parse.
 *
 * @param key The key to fetch.
 */
export function load<T>(key: string): T | null {
  let almostThere: string | null = null
  try {
    almostThere = loadString(key)
    return JSON.parse(almostThere ?? "") as T
  } catch {
    return (almostThere as T) ?? null
  }
}

/**
 * Saves an object to storage.
 *
 * @param key The key to fetch.
 * @param value The value to store.
 */
export function save(key: string, value: unknown): boolean {
  try {
    saveString(key, JSON.stringify(value))
    return true
  } catch {
    return false
  }
}

/**
 * Removes something from storage.
 *
 * @param key The key to kill.
 */
export function remove(key: string): void {
  try {
    storage.remove(key)
  } catch {}
}

/**
 * Burn it all to the ground.
 */
export function clear(): void {
  try {
    storage.clearAll()
  } catch {}
}

/**
 * Get the HH api URL stored in encrypted storage
 * @deprecated - prefer the Peers table for information on all peers
 * @returns {Promise<string | null>}
 */
export async function getHHApiUrl(): Promise<Option.Option<string>> {
  // if in dev mode, use the HIKMA_API_TESTING from the .env file
  const DEV_HIKMA_API = process.env.EXPO_PUBLIC_HIKMA_API_TESTING
  const HIKMA_API = await SecureStore.getItemAsync("HIKMA_API")
  if (__DEV__ && HIKMA_API === null) {
    return Option.fromNullable(DEV_HIKMA_API)
  }
  return Option.fromNullable(await SecureStore.getItemAsync("HIKMA_API"))
}

/**
 * Set the HH api URL stored in encrypted storage
 * @deprecated - prefer the Peers table for information on all peers
 * @param {string} url The url to store.
 */
export async function setHHApiUrl(url: string): Promise<boolean> {
  try {
    await SecureStore.setItemAsync("HIKMA_API", url)
    return true
  } catch {
    return false
  }
}
