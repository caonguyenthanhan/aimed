import { z } from "zod"

export const ChatDeliveryModeSchema = z.union([z.literal("chunked"), z.literal("live")])

export const ChatMessageKindSchema = z.union([z.literal("text"), z.literal("link")])

export const ChatDeliveryMessageSchema = z
  .object({
    content: z.string().min(1),
    delay_ms: z.number().int().min(0).max(30000).optional(),
    kind: ChatMessageKindSchema.optional(),
  })
  .passthrough()

export const ChatDeliverySchema = z
  .object({
    mode: ChatDeliveryModeSchema,
  })
  .passthrough()

export type ChatDeliveryMessageDto = z.infer<typeof ChatDeliveryMessageSchema>
export type ChatDeliveryDto = z.infer<typeof ChatDeliverySchema>

