import { z } from "zod"

export const ServiceStatusSchema = z.object({
  postgres: z.string(),
  redis: z.string(),
  nats: z.string(),
  s3: z.string(),
})

export const ReadinessResponseSchema = z.object({
  status: z.string(),
  services: ServiceStatusStatusSchemaOptional(ServiceStatusSchema),
  uptime_seconds: z.number(),
})

function ServiceStatusStatusSchemaOptional(schema: typeof ServiceStatusSchema) {
  return schema
}

export const ItemSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1, "Title is required"),
  content: z.string().nullable().optional(),
  tags: z.array(z.string()).default([]),
  created_at: z.string(),
  updated_at: z.string(),
})

export const CreateItemSchema = z.object({
  title: z.string().min(1, "Title is required"),
  content: z.string().optional(),
  tags: z.array(z.string()).default([]),
})

export const UpdateItemSchema = z.object({
  title: z.string().optional(),
  content: z.string().optional(),
  tags: z.array(z.string()).optional(),
})

export const SetCacheSchema = z.object({
  key: z.string().min(1, "Key is required"),
  value: z.string().min(1, "Value is required"),
  ttl_seconds: z.number().positive().optional(),
})

export const PublishStreamSchema = z.object({
  stream: z.string().optional(),
  event_type: z.string().min(1, "Event type is required"),
  payload: z.string().min(1, "Payload is required"),
})

export const NatsPublishSchema = z.object({
  subject: z.string().min(1, "Subject is required"),
  message: z.string().min(1, "Message is required"),
})

export const UploadResponseSchema = z.object({
  key: z.string(),
  bucket: z.string(),
  size: z.number(),
})

export const PresignedUrlResponseSchema = z.object({
  key: z.string(),
  url: z.string().url(),
  expires_in_seconds: z.number(),
})

export const SignalingMessageSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("join"),
    payload: z.object({ room_id: z.string(), peer_id: z.string() }),
  }),
  z.object({
    type: z.literal("leave"),
    payload: z.object({ room_id: z.string(), peer_id: z.string() }),
  }),
  z.object({
    type: z.literal("offer"),
    payload: z.object({
      room_id: z.string(),
      from_peer: z.string(),
      to_peer: z.string().optional(),
      sdp: z.string(),
    }),
  }),
  z.object({
    type: z.literal("answer"),
    payload: z.object({
      room_id: z.string(),
      from_peer: z.string(),
      to_peer: z.string().optional(),
      sdp: z.string(),
    }),
  }),
  z.object({
    type: z.literal("candidate"),
    payload: z.object({
      room_id: z.string(),
      from_peer: z.string(),
      to_peer: z.string().optional(),
      candidate: z.string(),
    }),
  }),
  z.object({
    type: z.literal("peer_joined"),
    payload: z.object({ room_id: z.string(), peer_id: z.string() }),
  }),
  z.object({
    type: z.literal("peer_left"),
    payload: z.object({ room_id: z.string(), peer_id: z.string() }),
  }),
  z.object({ type: z.literal("ping") }),
  z.object({ type: z.literal("pong") }),
])

export const LoginRequestSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
})

export const LoginResponseSchema = z.object({
  token: z.string(),
  token_type: z.string(),
  user_id: z.string(),
  expires_in_minutes: z.number(),
})

export const AiGenerateRequestSchema = z.object({
  prompt: z.string().min(1, "Prompt is required"),
  model: z.string().optional(),
  temperature: z.number().min(0).max(2).optional(),
})

export const AiGenerateResponseSchema = z.object({
  text: z.string(),
  model: z.string(),
  tokens_used: z.number(),
  execution_time_ms: z.number(),
})

export type Item = z.infer<typeof ItemSchema>
export type CreateItemInput = z.infer<typeof CreateItemSchema>
export type UpdateItemInput = z.infer<typeof UpdateItemSchema>
export type ReadinessResponse = z.infer<typeof ReadinessResponseSchema>
export type SignalingMessage = z.infer<typeof SignalingMessageSchema>
export type LoginRequest = z.infer<typeof LoginRequestSchema>
export type LoginResponse = z.infer<typeof LoginResponseSchema>
export type AiGenerateRequest = z.infer<typeof AiGenerateRequestSchema>
export type AiGenerateResponse = z.infer<typeof AiGenerateResponseSchema>
