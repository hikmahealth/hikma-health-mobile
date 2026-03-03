import { initCrashReporting, reportCrash, ErrorType } from "../../app/utils/crashReporting"

describe("crashReporting", () => {
  describe("ErrorType enum", () => {
    it("has FATAL and HANDLED values", () => {
      expect(ErrorType.FATAL).toBe("Fatal")
      expect(ErrorType.HANDLED).toBe("Handled")
    })

    it("only contains two members", () => {
      const members = Object.values(ErrorType).filter((v) => typeof v === "string")
      expect(members).toHaveLength(2)
    })
  })

  describe("initCrashReporting", () => {
    it("is a callable function that does not throw", () => {
      expect(() => initCrashReporting()).not.toThrow()
    })

    it("returns undefined (no side effects in current implementation)", () => {
      expect(initCrashReporting()).toBeUndefined()
    })
  })

  describe("reportCrash", () => {
    let consoleSpy: jest.SpyInstance
    let errorSpy: jest.SpyInstance

    beforeEach(() => {
      consoleSpy = jest.spyOn(console, "log").mockImplementation()
      errorSpy = jest.spyOn(console, "error").mockImplementation()
    })

    afterEach(() => {
      consoleSpy.mockRestore()
      errorSpy.mockRestore()
    })

    it("logs the error in dev mode", () => {
      const error = new Error("test error")
      reportCrash(error)
      expect(errorSpy).toHaveBeenCalledWith(error)
      expect(consoleSpy).toHaveBeenCalledWith("test error", ErrorType.FATAL)
    })

    it("defaults to FATAL error type", () => {
      const error = new Error("fatal test")
      reportCrash(error)
      expect(consoleSpy).toHaveBeenCalledWith("fatal test", ErrorType.FATAL)
    })

    it("respects custom error type", () => {
      const error = new Error("handled test")
      reportCrash(error, ErrorType.HANDLED)
      expect(consoleSpy).toHaveBeenCalledWith("handled test", ErrorType.HANDLED)
    })

    it("handles error with no message", () => {
      const error = new Error()
      reportCrash(error)
      // error.message is "" which is falsy, so should use "Unknown"
      expect(consoleSpy).toHaveBeenCalledWith("Unknown", ErrorType.FATAL)
    })

    it("does not throw even with unusual Error subclasses", () => {
      class CustomError extends Error {
        code = 42
      }
      expect(() => reportCrash(new CustomError("custom"))).not.toThrow()
    })
  })
})
