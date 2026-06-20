import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"

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

describe("Web Push Notification API contracts", () => {
  const originalEnv = { ...process.env }

  beforeEach(() => {
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    process.env = { ...originalEnv }
    vi.resetModules()
  })

  test("/api/push/subscribe returns 400 when subscription missing", async () => {
    const { POST } = await import("@/app/api/push/subscribe/route")
    const req = new Request("http://localhost/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    })
    const res = await POST(req as any)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.success).toBe(false)
    expect(body.reason).toBe("missing_subscription")
  })

  test("/api/push/subscribe falls back to client demo mode when DB not configured", async () => {
    clearDbEnv()
    vi.resetModules()
    const { POST } = await import("@/app/api/push/subscribe/route")
    const mockSubscription = {
      endpoint: "https://fcm.googleapis.com/fcm/send/test-endpoint-id",
      keys: {
        p256dh: "test-p256dh",
        auth: "test-auth",
      },
    }
    const req = new Request("http://localhost/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subscription: mockSubscription }),
    })
    const res = await POST(req as any)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.demo).toBe(true)
    expect(body.reason).toContain("database_not_configured")
  })

  test("/api/push/send returns 400 when broadcasting but DB not configured", async () => {
    clearDbEnv()
    vi.resetModules()
    const { POST } = await import("@/app/api/push/send/route")
    const req = new Request("http://localhost/api/push/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Test",
        body: "Test Body",
      }),
    })
    const res = await POST(req as any)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.success).toBe(false)
    expect(body.reason).toBe("database_not_configured_cannot_broadcast")
  })
})
