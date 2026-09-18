import { create } from "zustand"
import { Item, ReadinessResponse, LoginResponse, AiGenerateResponse } from "./schemas"
import { apiFetch } from "./error"

interface AppStore {
  health: ReadinessResponse | null
  healthLoading: boolean
  checkHealth: () => Promise<void>

  token: string | null
  currentUser: string | null
  authLoading: boolean
  login: (username: string, password: string) => Promise<boolean>
  logout: () => void

  aiResult: string | null
  aiLoading: boolean
  generateAi: (prompt: string, model?: string, temperature?: number) => Promise<string | null>

  items: Item[]
  itemsLoading: boolean
  fetchItems: () => Promise<void>
  createItem: (title: string, content?: string, tags?: string[]) => Promise<boolean>
  deleteItem: (id: string) => Promise<boolean>

  cacheResult: string | null
  cacheLoading: boolean
  setCache: (key: string, value: string, ttl?: number) => Promise<boolean>
  getCache: (key: string) => Promise<string | null>

  streamEvents: Array<{ id: string; eventType: string; payload: string; time: string }>
  publishStream: (eventType: string, payload: string, stream?: string) => Promise<boolean>

  natsMessages: Array<{ subject: string; message: string; time: string }>
  publishNats: (subject: string, message: string) => Promise<boolean>

  files: string[]
  filesLoading: boolean
  fetchFiles: () => Promise<void>
  deleteFile: (key: string) => Promise<boolean>

  notification: { message: string; type: "success" | "error" | "info" } | null
  setNotification: (notif: { message: string; type: "success" | "error" | "info" } | null) => void
}

export const useAppStore = create<AppStore>((set, get) => ({
  health: null,
  healthLoading: false,
  checkHealth: async () => {
    set({ healthLoading: true })
    const { data } = await apiFetch<ReadinessResponse>("/health/ready")
    set({ health: data, healthLoading: false })
  },

  token: null,
  currentUser: null,
  authLoading: false,
  login: async (username: string, password: string) => {
    set({ authLoading: true })
    const { data, error } = await apiFetch<LoginResponse>("/api/v1/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    })
    set({ authLoading: false })
    if (error || !data) {
      set({
        notification: {
          message: error?.message || "Authentication failed",
          type: "error",
        },
      })
      return false
    }
    set({
      token: data.token,
      currentUser: data.user_id,
      notification: {
        message: `Authenticated as ${data.user_id}`,
        type: "success",
      },
    })
    return true
  },
  logout: () => {
    set({
      token: null,
      currentUser: null,
      notification: { message: "Signed out successfully", type: "info" },
    })
  },

  aiResult: null,
  aiLoading: false,
  generateAi: async (prompt: string, model?: string, temperature?: number) => {
    set({ aiLoading: true, aiResult: null })
    const { data, error } = await apiFetch<AiGenerateResponse>("/api/v1/ai/generate", {
      method: "POST",
      body: JSON.stringify({ prompt, model, temperature }),
    })
    set({ aiLoading: false })
    if (error || !data) {
      set({
        notification: {
          message: error?.message || "AI generation failed",
          type: "error",
        },
      })
      return null
    }
    set({
      aiResult: data.text,
      notification: {
        message: `Generated with ${data.model} (${data.execution_time_ms}ms)`,
        type: "success",
      },
    })
    return data.text
  },

  items: [],
  itemsLoading: false,
  fetchItems: async () => {
    set({ itemsLoading: true })
    const { data } = await apiFetch<Item[]>("/api/v1/items")
    set({ items: data || [], itemsLoading: false })
  },
  createItem: async (title, content, tags) => {
    const { error } = await apiFetch<Item>("/api/v1/items", {
      method: "POST",
      body: JSON.stringify({ title, content, tags: tags || [] }),
    })
    if (!error) {
      await get().fetchItems()
      set({ notification: { message: "Item created successfully", type: "success" } })
      return true
    }
    set({ notification: { message: error.message, type: "error" } })
    return false
  },
  deleteItem: async (id) => {
    const { error } = await apiFetch(`/api/v1/items/${id}`, { method: "DELETE" })
    if (!error) {
      set({ items: get().items.filter((item) => item.id !== id) })
      set({ notification: { message: "Item deleted", type: "success" } })
      return true
    }
    set({ notification: { message: error.message, type: "error" } })
    return false
  },

  cacheResult: null,
  cacheLoading: false,
  setCache: async (key, value, ttl) => {
    set({ cacheLoading: true })
    const { error } = await apiFetch("/api/v1/cache", {
      method: "POST",
      body: JSON.stringify({ key, value, ttl_seconds: ttl }),
    })
    set({ cacheLoading: false })
    if (!error) {
      set({ notification: { message: `Cache key '${key}' saved`, type: "success" } })
      return true
    }
    set({ notification: { message: error.message, type: "error" } })
    return false
  },
  getCache: async (key) => {
    set({ cacheLoading: true })
    const { data, error } = await apiFetch<{ key: string; value: string | null }>(
      `/api/v1/cache/${encodeURIComponent(key)}`
    )
    set({ cacheLoading: false })
    if (!error && data) {
      set({ cacheResult: data.value })
      return data.value
    }
    set({ cacheResult: null })
    return null
  },

  streamEvents: [],
  publishStream: async (eventType, payload, stream) => {
    const { data, error } = await apiFetch<{ stream: string; event_id: string }>(
      "/api/v1/streams/publish",
      {
        method: "POST",
        body: JSON.stringify({ event_type: eventType, payload, stream }),
      }
    )
    if (!error && data) {
      set({
        streamEvents: [
          {
            id: data.event_id,
            eventType,
            payload,
            time: new Date().toLocaleTimeString(),
          },
          ...get().streamEvents,
        ],
        notification: { message: `Stream event published (${data.event_id})`, type: "success" },
      })
      return true
    }
    return false
  },

  natsMessages: [],
  publishNats: async (subject, message) => {
    const { error } = await apiFetch("/api/v1/nats/publish", {
      method: "POST",
      body: JSON.stringify({ subject, message }),
    })
    if (!error) {
      set({
        natsMessages: [
          { subject, message, time: new Date().toLocaleTimeString() },
          ...get().natsMessages,
        ],
        notification: { message: `Published to NATS subject: ${subject}`, type: "success" },
      })
      return true
    }
    return false
  },

  files: [],
  filesLoading: false,
  fetchFiles: async () => {
    set({ filesLoading: true })
    const { data } = await apiFetch<string[]>("/api/v1/storage/list")
    set({ files: data || [], filesLoading: false })
  },
  deleteFile: async (key) => {
    const { error } = await apiFetch(`/api/v1/storage/${encodeURIComponent(key)}`, {
      method: "DELETE",
    })
    if (!error) {
      set({ files: get().files.filter((f) => f !== key) })
      set({ notification: { message: `Deleted ${key}`, type: "success" } })
      return true
    }
    return false
  },

  notification: null,
  setNotification: (notif) => set({ notification: notif }),
}))
