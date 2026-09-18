import { describe, expect, it } from "bun:test"
import {
  AiGenerateRequestSchema,
  CreateItemSchema,
  ItemSchema,
  LoginRequestSchema,
  NatsPublishSchema,
  PublishStreamSchema,
  SetCacheSchema,
} from "../lib/schemas"

describe("Zod Schemas Validation", () => {
  it("validates valid Item correctly", () => {
    const validItem = {
      id: "123e4567-e89b-12d3-a456-426614174000",
      title: "Real-time task",
      content: "Task description",
      tags: ["dev", "rust"],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    const parsed = ItemSchema.safeParse(validItem)
    expect(parsed.success).toBe(true)
  })

  it("fails when Item title is missing", () => {
    const invalidItem = {
      id: "123e4567-e89b-12d3-a456-426614174000",
      title: "",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    const parsed = ItemSchema.safeParse(invalidItem)
    expect(parsed.success).toBe(false)
  })

  it("validates CreateItemInput", () => {
    const input = { title: "Deploy MinIO", tags: ["storage"] }
    const parsed = CreateItemSchema.safeParse(input)
    expect(parsed.success).toBe(true)
    if (parsed.success) {
      expect(parsed.data.title).toBe("Deploy MinIO")
    }
  })

  it("validates SetCacheSchema with TTL", () => {
    const cacheData = { key: "user:1", value: "active", ttl_seconds: 60 }
    const parsed = SetCacheSchema.safeParse(cacheData)
    expect(parsed.success).toBe(true)
  })

  it("validates PublishStreamSchema", () => {
    const streamPayload = {
      event_type: "ORDER_CREATED",
      payload: JSON.stringify({ amount: 99 }),
    }
    const parsed = PublishStreamSchema.safeParse(streamPayload)
    expect(parsed.success).toBe(true)
  })

  it("validates NatsPublishSchema", () => {
    const natsPayload = { subject: "orders.new", message: "Hello NATS" }
    const parsed = NatsPublishSchema.safeParse(natsPayload)
    expect(parsed.success).toBe(true)
  })

  it("validates LoginRequestSchema and rejects empty credentials", () => {
    const valid = LoginRequestSchema.safeParse({ username: "dev", password: "pwd" })
    expect(valid.success).toBe(true)

    const invalid = LoginRequestSchema.safeParse({ username: "", password: "" })
    expect(invalid.success).toBe(false)
  })

  it("validates AiGenerateRequestSchema and rejects empty prompt", () => {
    const valid = AiGenerateRequestSchema.safeParse({ prompt: "Analyze telemetry", model: "gemini-1.5-flash" })
    expect(valid.success).toBe(true)

    const invalid = AiGenerateRequestSchema.safeParse({ prompt: "" })
    expect(invalid.success).toBe(false)
  })
})
