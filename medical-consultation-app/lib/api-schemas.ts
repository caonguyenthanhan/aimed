/**
 * Centralized Zod schemas for all API route inputs.
 * WHY: single source of truth for validation — prevents duplicate manual checks
 * and ensures consistent 400 error format across all routes.
 */
import { z } from "zod"
import { NextResponse } from "next/server"

// ── Reusable primitives ──────────────────────────────────────────────────────

const nonEmptyStr = (label: string) =>
  z.string({ required_error: `${label} is required` }).trim().min(1, `${label} cannot be empty`)

// ── Auth ─────────────────────────────────────────────────────────────────────

export const LoginSchema = z.object({
  username: nonEmptyStr("username"),
  password: nonEmptyStr("password"),
})
export type LoginInput = z.infer<typeof LoginSchema>

// ── Conversations ─────────────────────────────────────────────────────────────

const MessageSchema = z.object({
  content: z.string(),
  isUser: z.boolean().optional(),
})

export const SaveConversationSchema = z.object({
  conversationId: nonEmptyStr("conversationId"),
  userId: nonEmptyStr("userId"),
  title: z.string().optional(),
  messages: z.array(MessageSchema).min(0),
})
export type SaveConversationInput = z.infer<typeof SaveConversationSchema>

// ── Appointments ──────────────────────────────────────────────────────────────

export const CreateAppointmentSchema = z.object({
  doctor_id: nonEmptyStr("doctor_id"),
  patient_name: nonEmptyStr("patient_name").max(200),
  reason: nonEmptyStr("reason").max(1000),
  scheduled_at: z.string().datetime({ message: "scheduled_at must be ISO 8601 datetime" }),
  contact: z
    .object({
      phone: z.string().optional(),
      email: z.string().email().optional(),
    })
    .optional()
    .default({}),
})
export type CreateAppointmentInput = z.infer<typeof CreateAppointmentSchema>

export const PatchAppointmentSchema = z.object({
  id: nonEmptyStr("id"),
  status: z.enum(["pending", "confirmed", "cancelled", "completed"]),
})
export type PatchAppointmentInput = z.infer<typeof PatchAppointmentSchema>

// ── Agent chat ────────────────────────────────────────────────────────────────

export const AgentChatSchema = z.object({
  message: nonEmptyStr("message").max(10000),
  conversationId: z.string().optional(),
  profile: z.string().optional(),
  userId: z.string().optional(),
})
export type AgentChatInput = z.infer<typeof AgentChatSchema>

// ── Helper: parse body and return 400 on failure ─────────────────────────────

/**
 * Parses and validates req.json() against a Zod schema.
 * Returns { data } on success or { error: NextResponse } on failure.
 * WHY: avoids duplicating try/catch + zodError formatting in every route.
 */
export async function parseBody<T>(
  req: Request,
  schema: z.ZodSchema<T>
): Promise<{ data: T; error: null } | { data: null; error: NextResponse }> {
  let raw: unknown
  try {
    raw = await req.json()
  } catch {
    return {
      data: null,
      error: NextResponse.json({ error: "Invalid JSON body" }, { status: 400 }),
    }
  }

  const result = schema.safeParse(raw)
  if (!result.success) {
    const issues = result.error.issues.map((i) => ({
      field: i.path.join("."),
      message: i.message,
    }))
    return {
      data: null,
      error: NextResponse.json({ error: "Validation failed", issues }, { status: 400 }),
    }
  }

  return { data: result.data, error: null }
}
