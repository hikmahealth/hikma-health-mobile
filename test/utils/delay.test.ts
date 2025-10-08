import { delay } from "../../app/utils/delay"

describe("delay", () => {
  beforeEach(() => {
    jest.clearAllTimers()
    jest.useRealTimers()
  })

  it("should return a promise", () => {
    const result = delay(100)
    expect(result).toBeInstanceOf(Promise)
  })

  it("should resolve after the specified time", async () => {
    const startTime = Date.now()
    await delay(100)
    const endTime = Date.now()
    const elapsed = endTime - startTime

    // Allow for some timing variance (50ms tolerance)
    expect(elapsed).toBeGreaterThanOrEqual(100)
    expect(elapsed).toBeLessThan(150)
  })

  it("should work with different delay values", async () => {
    const testCases = [0, 50, 100, 200, 500]

    for (const ms of testCases) {
      const startTime = Date.now()
      await delay(ms)
      const endTime = Date.now()
      const elapsed = endTime - startTime

      // For 0ms delay, it should resolve almost immediately
      if (ms === 0) {
        expect(elapsed).toBeLessThan(50)
      } else {
        expect(elapsed).toBeGreaterThanOrEqual(ms)
        expect(elapsed).toBeLessThan(ms + 100) // 100ms tolerance
      }
    }
  })

  it("should work with fake timers", async () => {
    jest.useFakeTimers()

    const delayPromise = delay(1000)

    // Fast-forward time
    jest.advanceTimersByTime(1000)

    // Wait for promise to resolve
    await delayPromise

    jest.useRealTimers()
  })

  it("should handle multiple concurrent delays", async () => {
    const startTime = Date.now()

    const promises = [
      delay(100),
      delay(200),
      delay(300)
    ]

    await Promise.all(promises)

    const endTime = Date.now()
    const elapsed = endTime - startTime

    // Should wait for the longest delay (300ms)
    expect(elapsed).toBeGreaterThanOrEqual(300)
    expect(elapsed).toBeLessThan(400)
  })

  it("should handle sequential delays", async () => {
    const startTime = Date.now()

    await delay(100)
    await delay(100)
    await delay(100)

    const endTime = Date.now()
    const elapsed = endTime - startTime

    // Should take approximately 300ms total
    expect(elapsed).toBeGreaterThanOrEqual(300)
    expect(elapsed).toBeLessThan(400)
  })

  it("should work in async/await context", async () => {
    const sequence: number[] = []

    sequence.push(1)
    await delay(50)
    sequence.push(2)
    await delay(50)
    sequence.push(3)

    expect(sequence).toEqual([1, 2, 3])
  })

  it("should work with .then() chaining", (done) => {
    let value = 0

    delay(50)
      .then(() => {
        value = 1
        return delay(50)
      })
      .then(() => {
        value = 2
        expect(value).toBe(2)
        done()
      })
  })

  it("should handle zero delay", async () => {
    const startTime = Date.now()
    await delay(0)
    const endTime = Date.now()
    const elapsed = endTime - startTime

    // Should resolve almost immediately
    expect(elapsed).toBeLessThan(50)
  })

  it("should handle negative values as zero delay", async () => {
    const startTime = Date.now()
    await delay(-100)
    const endTime = Date.now()
    const elapsed = endTime - startTime

    // Should resolve almost immediately (setTimeout treats negative as 0)
    expect(elapsed).toBeLessThan(50)
  })

  it("should handle very large delay values", async () => {
    jest.useFakeTimers()

    const largeDelay = 60000 // 1 minute
    const delayPromise = delay(largeDelay)

    // Fast-forward time
    jest.advanceTimersByTime(largeDelay)

    await delayPromise

    jest.useRealTimers()
  })

  it("should be usable in Promise.race", async () => {
    const result = await Promise.race([
      delay(100).then(() => "slow"),
      delay(50).then(() => "fast")
    ])

    expect(result).toBe("fast")
  })

  it("should be usable for timeout patterns", async () => {
    const timeout = (ms: number) => delay(ms).then(() => {
      throw new Error("Timeout")
    })

    const task = delay(50).then(() => "success")

    const result = await Promise.race([
      task,
      timeout(100)
    ])

    expect(result).toBe("success")

    // Test actual timeout
    const slowTask = delay(200).then(() => "never")

    await expect(
      Promise.race([
        slowTask,
        timeout(100)
      ])
    ).rejects.toThrow("Timeout")
  })

  it("should maintain execution order with microtasks", async () => {
    const order: string[] = []

    Promise.resolve().then(() => order.push("microtask"))

    await delay(0)
    order.push("after delay")

    // Even with 0 delay, it should run after microtasks
    expect(order).toEqual(["microtask", "after delay"])
  })

  it("should not block the event loop", async () => {
    let eventLoopBlocked = false

    // Set a flag after a short timeout
    setTimeout(() => {
      eventLoopBlocked = false
    }, 10)

    eventLoopBlocked = true

    // Create a longer delay
    await delay(100)

    // The event loop should have processed the timeout
    expect(eventLoopBlocked).toBe(false)
  })
})
