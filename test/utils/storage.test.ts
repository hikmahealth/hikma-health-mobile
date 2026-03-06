import fc from "fast-check"

// Mock react-native-mmkv with an in-memory Map-based implementation
const mockStore = new Map<string, string>()
jest.mock("react-native-mmkv", () => ({
  createMMKV: () => ({
    getString: (key: string) => mockStore.get(key),
    set: (key: string, value: string) => mockStore.set(key, value),
    remove: (key: string) => mockStore.delete(key),
    clearAll: () => mockStore.clear(),
  }),
}))

// Mock expo-secure-store
jest.mock("expo-secure-store", () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
}))

// Mock react-native-config
jest.mock("react-native-config", () => ({}))

import { loadString, saveString, load, save, remove, clear } from "../../app/utils/storage"

describe("storage utilities", () => {
  beforeEach(() => {
    mockStore.clear()
  })

  // ── saveString / loadString ──────────────────────────────────────────────

  describe("saveString / loadString", () => {
    it("round-trips a string value", () => {
      expect(saveString("key1", "hello")).toBe(true)
      expect(loadString("key1")).toBe("hello")
    })

    it("returns null for missing keys", () => {
      expect(loadString("nonexistent")).toBeNull()
    })

    it("overwrites existing values", () => {
      saveString("k", "first")
      saveString("k", "second")
      expect(loadString("k")).toBe("second")
    })

    it("handles empty string values", () => {
      saveString("empty", "")
      expect(loadString("empty")).toBe("")
    })

    it("round-trips arbitrary strings", () => {
      fc.assert(
        fc.property(fc.string({ minLength: 1 }), fc.string(), (key, value) => {
          saveString(key, value)
          expect(loadString(key)).toBe(value)
        }),
        { numRuns: 50 },
      )
    })
  })

  // ── save / load ──────────────────────────────────────────────────────────

  describe("save / load", () => {
    it("round-trips objects", () => {
      const obj = { name: "test", count: 42, nested: { a: 1 } }
      expect(save("obj", obj)).toBe(true)
      expect(load("obj")).toEqual(obj)
    })

    it("round-trips arrays", () => {
      const arr = [1, "two", { three: 3 }]
      save("arr", arr)
      expect(load("arr")).toEqual(arr)
    })

    it("round-trips primitives", () => {
      save("num", 42)
      expect(load("num")).toBe(42)

      save("bool", true)
      expect(load("bool")).toBe(true)

      save("null", null)
      expect(load("null")).toBeNull()
    })

    it("returns null for missing keys", () => {
      expect(load("missing")).toBeNull()
    })

    it("round-trips any JSON-serializable value", () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1 }),
          fc.jsonValue(),
          (key, value) => {
            save(key, value)
            const loaded = load(key)
            expect(loaded).toEqual(value)
          },
        ),
        { numRuns: 50 },
      )
    })
  })

  // ── remove ──────────────────────────────────────────────────────────────

  describe("remove", () => {
    it("removes an existing key", () => {
      saveString("toRemove", "value")
      remove("toRemove")
      expect(loadString("toRemove")).toBeNull()
    })

    it("does not throw when removing a nonexistent key", () => {
      expect(() => remove("nonexistent")).not.toThrow()
    })
  })

  // ── clear ──────────────────────────────────────────────────────────────

  describe("clear", () => {
    it("removes all keys", () => {
      saveString("a", "1")
      saveString("b", "2")
      saveString("c", "3")
      clear()
      expect(loadString("a")).toBeNull()
      expect(loadString("b")).toBeNull()
      expect(loadString("c")).toBeNull()
    })

    it("does not throw when storage is already empty", () => {
      clear()
      expect(() => clear()).not.toThrow()
    })
  })
})
