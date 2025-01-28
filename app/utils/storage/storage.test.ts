import AsyncStorage from "@react-native-async-storage/async-storage"
import { load, loadString, save, saveString, clear, remove } from "./storage"

// Mock AsyncStorage
jest.mock("@react-native-async-storage/async-storage", () => ({
  setItem: jest.fn(() => Promise.resolve()),
  getItem: jest.fn(() => Promise.resolve()),
  removeItem: jest.fn(() => Promise.resolve()),
  clear: jest.fn(() => Promise.resolve()),
}))

// fixtures
const VALUE_OBJECT = { x: 1 }
const VALUE_STRING = JSON.stringify(VALUE_OBJECT)

beforeEach(() => {
  // Reset all mocks before each test
  jest.clearAllMocks()
  // Set up default mock implementations
  ;(AsyncStorage.getItem as jest.Mock).mockImplementation((key: string) => {
    if (key === "something") {
      return Promise.resolve(VALUE_STRING)
    }
    return Promise.resolve(null)
  })
})

describe("Storage", () => {
  test("load", async () => {
    const value = await load("something")
    expect(AsyncStorage.getItem).toHaveBeenCalledWith("something")
    expect(value).toEqual(VALUE_OBJECT)
  })

  test("loadString", async () => {
    const value = await loadString("something")
    expect(AsyncStorage.getItem).toHaveBeenCalledWith("something")
    expect(value).toEqual(VALUE_STRING)
  })

  test("save", async () => {
    await save("something", VALUE_OBJECT)
    expect(AsyncStorage.setItem).toHaveBeenCalledWith("something", VALUE_STRING)
  })

  test("saveString", async () => {
    await saveString("something", VALUE_STRING)
    expect(AsyncStorage.setItem).toHaveBeenCalledWith("something", VALUE_STRING)
  })

  test("remove", async () => {
    await remove("something")
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith("something")
  })

  test("clear", async () => {
    await clear()
    expect(AsyncStorage.clear).toHaveBeenCalled()
  })

  describe("Error handling", () => {
    test("loadString returns null on error", async () => {
      ;(AsyncStorage.getItem as jest.Mock).mockRejectedValueOnce(new Error("Failed"))
      const value = await loadString("something")
      expect(value).toBeNull()
    })

    test("save returns false on error", async () => {
      ;(AsyncStorage.setItem as jest.Mock).mockRejectedValueOnce(new Error("Failed"))
      const success = await save("something", VALUE_OBJECT)
      expect(success).toBe(false)
    })

    test("saveString returns false on error", async () => {
      ;(AsyncStorage.setItem as jest.Mock).mockRejectedValueOnce(new Error("Failed"))
      const success = await saveString("something", VALUE_STRING)
      expect(success).toBe(false)
    })
  })
})
