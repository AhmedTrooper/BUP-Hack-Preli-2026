import { describe, expect, it } from "bun:test"
import { ApiError } from "../lib/error"

describe("ApiError Global Error Handling", () => {
  it("creates ApiError with proper status and code", () => {
    const error = new ApiError(404, "NOT_FOUND", "Item does not exist")
    expect(error.status).toBe(404)
    expect(error.code).toBe("NOT_FOUND")
    expect(error.message).toBe("Item does not exist")
    expect(error instanceof Error).toBe(true)
    expect(error instanceof ApiError).toBe(true)
  })

  it("converts unknown error using fromUnknown", () => {
    const standardError = new Error("Network timeout")
    const apiErr = ApiError.fromUnknown(standardError)

    expect(apiErr.status).toBe(500)
    expect(apiErr.code).toBe("CLIENT_ERROR")
    expect(apiErr.message).toBe("Network timeout")
  })

  it("preserves existing ApiError when passed to fromUnknown", () => {
    const original = new ApiError(401, "UNAUTHORIZED", "Token expired")
    const result = ApiError.fromUnknown(original)

    expect(result.status).toBe(401)
    expect(result.code).toBe("UNAUTHORIZED")
    expect(result.message).toBe("Token expired")
  })
})
