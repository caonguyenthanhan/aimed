import { describe, it, expect } from "vitest"
import { NextRequest } from "next/server"
import {
  LoginSchema,
  SaveConversationSchema,
  CreateAppointmentSchema,
  PatchAppointmentSchema,
  AgentChatSchema,
  parseBody,
} from "../api-schemas"

// Helper to create a fake NextRequest with JSON body
function makeReq(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/test", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
}

describe("api-schemas", () => {
  describe("LoginSchema", () => {
    it("accepts valid credentials", () => {
      const r = LoginSchema.safeParse({ username: "user1", password: "pass1" })
      expect(r.success).toBe(true)
    })

    it("rejects empty username", () => {
      const r = LoginSchema.safeParse({ username: "", password: "pass1" })
      expect(r.success).toBe(false)
    })

    it("rejects missing password", () => {
      const r = LoginSchema.safeParse({ username: "user1" })
      expect(r.success).toBe(false)
    })

    it("trims whitespace", () => {
      const r = LoginSchema.safeParse({ username: "  user1  ", password: "pass" })
      expect(r.success).toBe(true)
      if (r.success) expect(r.data.username).toBe("user1")
    })
  })

  describe("SaveConversationSchema", () => {
    const valid = {
      conversationId: "conv-123",
      userId: "user-456",
      title: "Test convo",
      messages: [{ content: "hello", isUser: true }],
    }

    it("accepts valid body", () => {
      expect(SaveConversationSchema.safeParse(valid).success).toBe(true)
    })

    it("accepts empty messages array", () => {
      expect(SaveConversationSchema.safeParse({ ...valid, messages: [] }).success).toBe(true)
    })

    it("rejects missing conversationId", () => {
      const { conversationId, ...rest } = valid
      expect(SaveConversationSchema.safeParse(rest).success).toBe(false)
    })

    it("rejects non-array messages", () => {
      expect(SaveConversationSchema.safeParse({ ...valid, messages: "bad" }).success).toBe(false)
    })

    it("title is optional", () => {
      const { title, ...rest } = valid
      expect(SaveConversationSchema.safeParse(rest).success).toBe(true)
    })
  })

  describe("CreateAppointmentSchema", () => {
    const valid = {
      doctor_id: "doctor_001",
      patient_name: "Nguyen Van A",
      reason: "Kham tong quat",
      scheduled_at: new Date(Date.now() + 86400000).toISOString(),
    }

    it("accepts valid body", () => {
      expect(CreateAppointmentSchema.safeParse(valid).success).toBe(true)
    })

    it("rejects invalid ISO datetime", () => {
      const r = CreateAppointmentSchema.safeParse({ ...valid, scheduled_at: "not-a-date" })
      expect(r.success).toBe(false)
    })

    it("rejects empty patient_name", () => {
      expect(CreateAppointmentSchema.safeParse({ ...valid, patient_name: "" }).success).toBe(false)
    })

    it("accepts optional contact with email", () => {
      const r = CreateAppointmentSchema.safeParse({
        ...valid,
        contact: { phone: "0901234567", email: "test@example.com" },
      })
      expect(r.success).toBe(true)
    })

    it("rejects invalid email in contact", () => {
      const r = CreateAppointmentSchema.safeParse({
        ...valid,
        contact: { email: "not-an-email" },
      })
      expect(r.success).toBe(false)
    })
  })

  describe("PatchAppointmentSchema", () => {
    it("accepts valid status values", () => {
      for (const status of ["pending", "confirmed", "cancelled", "completed"]) {
        expect(PatchAppointmentSchema.safeParse({ id: "ap1", status }).success).toBe(true)
      }
    })

    it("rejects invalid status", () => {
      expect(PatchAppointmentSchema.safeParse({ id: "ap1", status: "unknown" }).success).toBe(false)
    })

    it("rejects missing id", () => {
      expect(PatchAppointmentSchema.safeParse({ status: "confirmed" }).success).toBe(false)
    })
  })

  describe("AgentChatSchema", () => {
    it("accepts valid message", () => {
      expect(AgentChatSchema.safeParse({ message: "xin chao" }).success).toBe(true)
    })

    it("rejects empty message", () => {
      expect(AgentChatSchema.safeParse({ message: "" }).success).toBe(false)
    })

    it("rejects message over 10000 chars", () => {
      expect(AgentChatSchema.safeParse({ message: "a".repeat(10001) }).success).toBe(false)
    })

    it("optional fields are accepted", () => {
      const r = AgentChatSchema.safeParse({
        message: "hello",
        conversationId: "c1",
        profile: "triage",
        userId: "u1",
      })
      expect(r.success).toBe(true)
    })
  })

  describe("parseBody", () => {
    it("returns data on valid body", async () => {
      const req = makeReq({ username: "u", password: "p" })
      const result = await parseBody(req, LoginSchema)
      expect(result.error).toBeNull()
      expect(result.data?.username).toBe("u")
    })

    it("returns 400 NextResponse on invalid body", async () => {
      const req = makeReq({ username: "" })
      const result = await parseBody(req, LoginSchema)
      expect(result.data).toBeNull()
      expect(result.error).not.toBeNull()
      expect(result.error?.status).toBe(400)
    })

    it("returns 400 on invalid JSON", async () => {
      const req = new NextRequest("http://localhost/api/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "not json{{",
      })
      const result = await parseBody(req, LoginSchema)
      expect(result.data).toBeNull()
      expect(result.error?.status).toBe(400)
    })
  })
})
