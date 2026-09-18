export const NEXT_PUBLIC_API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080"

export const NEXT_PUBLIC_WS_URL =
  process.env.NEXT_PUBLIC_WS_URL ||
  (NEXT_PUBLIC_API_URL.startsWith("https://")
    ? NEXT_PUBLIC_API_URL.replace("https://", "wss://")
    : NEXT_PUBLIC_API_URL.replace("http://", "ws://"))

export const IS_PRODUCTION = process.env.NODE_ENV === "production"
