import { z } from "zod"
import { ChatDeliveryMessageSchema, ChatDeliverySchema } from "@/lib/chat-delivery-schema"

export const LlmRoleSchema = z.union([z.literal("system"), z.literal("user"), z.literal("assistant")])

export const LlmMessageSchema = z.object({
  role: LlmRoleSchema,
  content: z.string(),
})

export const LlmModeSchema = z.union([z.literal("cpu"), z.literal("gpu")])

export const LlmTierSchema = z.union([z.literal("flash"), z.literal("pro")])

export const LlmChatMetadataSchema = z
  .object({
    context: z.string().optional(),
    mode: LlmModeSchema.optional(),
    tier: LlmTierSchema.optional(),
    fallback: z.boolean().optional(),
    provider: z.string().optional(),
    duration_ms: z.number().optional(),
    model_init: z.boolean().optional(),
    rag: z.unknown().optional(),
    timestamp: z.string().optional(),
  })
  .passthrough()

export const LlmChatResponseSchema = z
  .object({
    response: z.string(),
    messages: z.array(ChatDeliveryMessageSchema).optional(),
    delivery: ChatDeliverySchema.optional(),
    context: z.string().optional(),
    metadata: LlmChatMetadataSchema.optional(),
    conversation_id: z.union([z.string(), z.null()]).optional(),
    mode_used: LlmModeSchema.optional(),
  })
  .passthrough()

export type LlmMessageDto = z.infer<typeof LlmMessageSchema>
export type LlmChatResponseDto = z.infer<typeof LlmChatResponseSchema>

