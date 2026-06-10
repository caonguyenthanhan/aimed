import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"

vi.unmock("@/lib/pg")

const DB_ENV_KEYS = [
  "DATABASE_URL",
  "POSTGRES_URL",
  "POSTGRES_PRISMA_URL",
  "DATABASE_URL_UNPOOLED",
  "POSTGRES_URL_NON_POOLING",
  "POSTGRES_URL_NO_SSL",
]

function clearDbEnv() {
  for (const k of DB_ENV_KEYS) delete (process.env as any)[k]
}

describe("db stability contracts", () => {
  const originalEnv = { ...process.env }

  beforeEach(() => {
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    process.env = { ...originalEnv }
    vi.resetModules()
  })

  test("/api/db/ping returns 200 when DB env missing", async () => {
    clearDbEnv()
    vi.resetModules()
    const { GET } = await import("@/app/api/db/ping/route")
    const res = await GET()
    expect(res.status).toBe(200)
    expect(res.headers.get("content-type") || "").toContain("application/json")
    expect(res.headers.get("content-type") || "").toContain("charset=utf-8")
    const body = await res.json()
    expect(body.ok).toBe(false)
    expect(body.status).toBe("disabled")
    expect(body.dbEnabled).toBe(false)
  })

  test("/api/db/ping returns 200 when DB is down", async () => {
    clearDbEnv()
    process.env.POSTGRES_URL = "postgresql://example.invalid/db"
    vi.resetModules()
    vi.doMock("@/lib/pg", () => {
      return {
        resolveDatabaseConfig: () => ({ url: String(process.env.POSTGRES_URL || ""), source: "POSTGRES_URL" }),
        getPgPool: () => ({ query: vi.fn().mockRejectedValue(new Error("db_down")) }),
      }
    })
    const { GET } = await import("@/app/api/db/ping/route")
    const res = await GET()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(false)
    expect(body.status).toBe("down")
    expect(body.dbEnabled).toBe(true)
  })

  test("/api/conversations/list returns skipped when DB env missing", async () => {
    clearDbEnv()
    vi.resetModules()
    const { POST } = await import("@/app/api/conversations/list/route")
    const req = new Request("http://localhost/api/conversations/list", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: "test_token_1" }),
    })
    const res = await POST(req as any)
    expect(res.status).toBe(200)
    expect(res.headers.get("content-type") || "").toContain("charset=utf-8")
    const body = await res.json()
    expect(body.skipped).toBe(true)
    expect(body.reason).toBe("database_not_configured")
    expect(Array.isArray(body.conversations)).toBe(true)
  })

  test("/api/conversations/load returns skipped when DB env missing", async () => {
    clearDbEnv()
    vi.resetModules()
    const { POST } = await import("@/app/api/conversations/load/route")
    const req = new Request("http://localhost/api/conversations/load", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conversationId: "00000000-0000-0000-0000-000000000000" }),
    })
    const res = await POST(req as any)
    expect(res.status).toBe(200)
    expect(res.headers.get("content-type") || "").toContain("charset=utf-8")
    const body = await res.json()
    expect(body.skipped).toBe(true)
    expect(body.reason).toBe("database_not_configured")
  })

  test("/api/conversations/save returns skipped when DB env missing", async () => {
    clearDbEnv()
    vi.resetModules()
    const { POST } = await import("@/app/api/conversations/save/route")
    const req = new Request("http://localhost/api/conversations/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        conversationId: "00000000-0000-0000-0000-000000000000",
        userId: "test_token_1",
        title: "Test",
        messages: [],
      }),
    })
    const res = await POST(req as any)
    expect(res.status).toBe(200)
    expect(res.headers.get("content-type") || "").toContain("charset=utf-8")
    const body = await res.json()
    expect(body.skipped).toBe(true)
    expect(body.reason).toBe("database_not_configured")
  })
})
