import { create } from "zustand"
import { HealthResponse } from "./schemas"
import { apiFetch } from "./error"

interface AppStore {
  apiConnected: boolean | null
  apiLatencyMs: number | null
  healthLoading: boolean
  checkHealth: () => Promise<boolean>

  notification: { message: string; type: "success" | "error" | "info" } | null
  setNotification: (notif: { message: string; type: "success" | "error" | "info" } | null) => void
}

export const useAppStore = create<AppStore>((set) => ({
  apiConnected: null,
  apiLatencyMs: null,
  healthLoading: false,

  checkHealth: async () => {
    set({ healthLoading: true })
    const start = performance.now()
    const { data, error } = await apiFetch<HealthResponse>("/health")
    const latency = Math.round(performance.now() - start)
    const isOk = !error && data?.status === "ok"

    set({
      apiConnected: isOk,
      apiLatencyMs: latency,
      healthLoading: false,
    })

    return isOk
  },

  notification: null,
  setNotification: (notif) => set({ notification: notif }),
}))
