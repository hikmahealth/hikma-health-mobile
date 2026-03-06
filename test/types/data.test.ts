import { ok, err, dataErrorMessage, DataProviderError } from "../../types/data"
import type { DataError, Result } from "../../types/data"

describe("Result helpers", () => {
  it("ok() creates a success result", () => {
    const result = ok({ id: "123" })
    expect(result.ok).toBe(true)
    expect(result.ok && result.data).toEqual({ id: "123" })
  })

  it("err() creates a failure result", () => {
    const result = err({ _tag: "NotFound" as const, entity: "Patient", id: "abc" })
    expect(result.ok).toBe(false)
    expect(!result.ok && result.error._tag).toBe("NotFound")
  })

  it("ok/err are type-narrowable via .ok discriminant", () => {
    const result: Result<string> = ok("hello")
    if (result.ok) {
      // TypeScript narrows to { ok: true; data: string }
      expect(result.data).toBe("hello")
    } else {
      fail("Should be ok")
    }
  })
})

describe("DataProviderError", () => {
  it("wraps a DataError and exposes it as .dataError", () => {
    const dataError: DataError = { _tag: "NetworkError", message: "timeout", statusCode: 0 }
    const error = new DataProviderError(dataError)
    expect(error).toBeInstanceOf(Error)
    expect(error.name).toBe("DataProviderError")
    expect(error.message).toBe("timeout")
    expect(error.dataError).toBe(dataError)
  })

  it("uses _tag as message when message is empty", () => {
    const dataError: DataError = { _tag: "Unauthorized", message: "" }
    const error = new DataProviderError(dataError)
    expect(error.message).toBe("Unauthorized")
  })
})

describe("dataErrorMessage", () => {
  it("formats NotFound with entity and id", () => {
    const e: DataError = { _tag: "NotFound", entity: "Patient", id: "abc" }
    expect(dataErrorMessage(e)).toBe("Patient not found: abc")
  })

  it("formats PermissionDenied with permission and message", () => {
    const e: DataError = {
      _tag: "PermissionDenied",
      permission: "canEditRecords",
      message: "You do not have the required permission: canEditRecords",
    }
    expect(dataErrorMessage(e)).toBe(
      "Permission denied: canEditRecords. You do not have the required permission: canEditRecords",
    )
  })

  it("DataProviderError wraps PermissionDenied correctly", () => {
    const e: DataError = {
      _tag: "PermissionDenied",
      permission: "canPrescribeMedications",
      message: "Not allowed",
    }
    const error = new DataProviderError(e)
    expect(error.message).toBe("Permission denied: canPrescribeMedications. Not allowed")
    expect(error.dataError._tag).toBe("PermissionDenied")
  })

  it("falls back to message for other variants", () => {
    const e: DataError = { _tag: "NetworkError", message: "timeout" }
    expect(dataErrorMessage(e)).toBe("timeout")
  })

  it("falls back to _tag when message is empty", () => {
    const e: DataError = { _tag: "ServerError", message: "" }
    expect(dataErrorMessage(e)).toBe("ServerError")
  })
})
