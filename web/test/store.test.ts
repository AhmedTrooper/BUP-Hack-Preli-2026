import { describe, expect, it } from "bun:test"
import { useAppStore } from "../lib/store"

describe("Zustand Store State Management", () => {
  it("initializes with clean default state", () => {
    const state = useAppStore.getState()
    expect(state.items).toEqual([])
    expect(state.streamEvents).toEqual([])
    expect(state.natsMessages).toEqual([])
    expect(state.files).toEqual([])
    expect(state.health).toBeNull()
  })

  it("updates notification state correctly", () => {
    useAppStore.getState().setNotification({
      message: "Test message",
      type: "info",
    })

    const notif = useAppStore.getState().notification
    expect(notif?.message).toBe("Test message")
    expect(notif?.type).toBe("info")
  })

  it("handles authentication state and logout cleanly", () => {
    expect(useAppStore.getState().token).toBeNull()
    expect(useAppStore.getState().currentUser).toBeNull()
    expect(useAppStore.getState().aiResult).toBeNull()

    useAppStore.getState().logout()
    expect(useAppStore.getState().token).toBeNull()
    expect(useAppStore.getState().currentUser).toBeNull()
    expect(useAppStore.getState().notification?.message).toBe("Signed out successfully")
  })
})
