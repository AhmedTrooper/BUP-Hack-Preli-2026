export class ApiError extends Error {
  public readonly status: number
  public readonly code: string
  public readonly details?: unknown

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message)
    this.name = "ApiError"
    this.status = status
    this.code = code
    this.details = details
    Object.setPrototypeOf(this, ApiError.prototype)
  }

  static fromUnknown(error: unknown): ApiError {
    if (error instanceof ApiError) {
      return error
    }
    if (error instanceof Error) {
      return new ApiError(500, "CLIENT_ERROR", error.message)
    }
    return new ApiError(500, "UNKNOWN_ERROR", String(error))
  }
}

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080"

export async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<{ data: T | null; error: ApiError | null }> {
  const url = endpoint.startsWith("http")
    ? endpoint
    : `${API_BASE_URL}${endpoint.startsWith("/") ? "" : "/"}${endpoint}`

  try {
    const res = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
    })

    if (!res.ok) {
      let errorBody: { error?: string; message?: string } = {}
      try {
        errorBody = await res.json()
      } catch {
        // Ignored if non-JSON error
      }

      const code = errorBody.error || `HTTP_${res.status}`
      const message = errorBody.message || res.statusText || "Request failed"

      return {
        data: null,
        error: new ApiError(res.status, code, message, errorBody),
      }
    }

    if (res.status === 204) {
      return { data: null, error: null }
    }

    const data = (await res.json()) as T
    return { data, error: null }
  } catch (err) {
    return {
      data: null,
      error: ApiError.fromUnknown(err),
    }
  }
}
