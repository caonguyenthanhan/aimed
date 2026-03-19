import { z } from "zod"

export const AgentActionSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("navigate"),
    args: z.object({
      path: z.string().min(1),
    }),
  }),
  z.object({
    type: z.literal("speak"),
    args: z.object({
      text: z.string().min(1),
    }),
  }),
  z.object({
    type: z.literal("open_screening"),
    args: z.object({}).optional(),
  }),
  z.object({
    type: z.literal("open_therapy"),
    args: z.object({}).optional(),
  }),
  z.object({
    type: z.literal("open_reminders"),
    args: z.object({}).optional(),
  }),
])

export type AgentAction = z.infer<typeof AgentActionSchema>

export const AgentResponseSchema = z
  .object({
    response: z.string(),
    actions: z.array(AgentActionSchema).optional(),
    metadata: z.record(z.any()).optional(),
    conversation_id: z.string().optional(),
  })
  .passthrough()

export type AgentResponse = z.infer<typeof AgentResponseSchema>

export function normalizeActions(raw: unknown): AgentAction[] {
  if (!raw) return []
  const parsed = z.array(AgentActionSchema).safeParse(raw)
  return parsed.success ? parsed.data : []
}

export function isAllowedPath(path: string) {
  const p = String(path || "").trim()
  if (!p.startsWith("/")) return false
  const allowPrefixes = [
    "/sang-loc",
    "/tri-lieu",
    "/nhac-nho",
    "/tin-tuc-y-khoa",
    "/tam-su",
    "/tu-van",
    "/bac-si",
    "/doctor",
    "/ke-hoach",
  ]
  return allowPrefixes.some((pre) => p === pre || p.startsWith(`${pre}/`))
}
