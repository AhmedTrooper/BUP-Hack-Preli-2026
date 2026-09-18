import { describe, expect, it } from "bun:test"
import { useAppStore } from "../lib/store"

describe("GridWise Store State Management", () => {
  it("initializes with clean default state", () => {
    const state = useAppStore.getState()
    expect(state.apiConnected).toBeNull()
    expect(state.apiLatencyMs).toBeNull()
    expect(state.healthLoading).toBe(false)
    expect(state.notification).toBeNull()
  })

  it("updates notification state correctly", () => {
    useAppStore.getState().setNotification({
      message: "Optimal schedule computed",
      type: "success",
    })

    const notif = useAppStore.getState().notification
    expect(notif?.message).toBe("Optimal schedule computed")
    expect(notif?.type).toBe("success")

    useAppStore.getState().setNotification(null)
    expect(useAppStore.getState().notification).toBeNull()
  })
})
