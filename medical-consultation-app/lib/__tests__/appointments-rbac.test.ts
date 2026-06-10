import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"

describe("appointments RBAC ownership", () => {
  const originalEnv = { ...process.env }

  beforeEach(() => {
    process.env = { ...originalEnv, POSTGRES_URL: "postgresql://example.invalid/db" }
  })

  afterEach(() => {
    process.env = { ...originalEnv }
    vi.resetModules()
    vi.clearAllMocks()
  })

  test("GET list requires doctor and filters by u.user_id", async () => {
    const query = vi.fn(async (sql: any, params?: any[]) => {
      const s = String(sql || "")
      if (s.includes("CREATE TABLE") || s.includes("ALTER TABLE") || s.includes("CREATE INDEX")) return { rows: [] }
      if (s.includes("FROM doctor_appointments") && s.includes("WHERE doctor_id = $1")) {
        const doctorId = String(params?.[0] || "")
        if (doctorId !== "doc1") return { rows: [] }
        return {
          rows: [
            {
              id: "ap-1",
              doctor_id: "doc1",
              patient_id: "p1",
              patient_name: "Patient A",
              contact: {},
              scheduled_at: new Date("2026-01-01T00:00:00Z"),
              reason: "Reason",
              status: "pending",
              created_at: new Date("2026-01-01T00:00:00Z"),
            },
          ],
        }
      }
      return { rows: [] }
    })

    vi.doMock("@/lib/pg", () => ({
      resolveDatabaseConfig: () => ({ url: String(process.env.POSTGRES_URL || ""), source: "POSTGRES_URL" }),
      getPgPool: () => ({ query }),
    }))
    vi.doMock("@/lib/auth-server", () => ({
      getAuthedUser: vi.fn(async () => ({ user_id: "doc1", role: "doctor" })),
    }))

    const { GET } = await import("@/app/api/appointments/route")
    const req = new Request("http://localhost/api/appointments", { method: "GET" })
    const res = await GET(req as any)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(Array.isArray(body.items)).toBe(true)
    expect(body.items.length).toBe(1)
    expect(body.items[0].doctor_id).toBe("doc1")
  })

  test("GET by id enforces ownership (404 when not owner)", async () => {
    const query = vi.fn(async (sql: any, params?: any[]) => {
      const s = String(sql || "")
      if (s.includes("CREATE TABLE") || s.includes("ALTER TABLE") || s.includes("CREATE INDEX")) return { rows: [] }
      if (s.includes("WHERE id = $1 AND doctor_id = $2")) {
        const id = String(params?.[0] || "")
        const doctorId = String(params?.[1] || "")
        if (id === "ap-1" && doctorId === "doc1") {
          return {
            rows: [
              {
                id: "ap-1",
                doctor_id: "doc1",
                patient_id: "p1",
                patient_name: "Patient A",
                contact: {},
                scheduled_at: new Date("2026-01-01T00:00:00Z"),
                reason: "Reason",
                status: "pending",
                created_at: new Date("2026-01-01T00:00:00Z"),
              },
            ],
          }
        }
        return { rows: [] }
      }
      return { rows: [] }
    })

    vi.doMock("@/lib/pg", () => ({
      resolveDatabaseConfig: () => ({ url: String(process.env.POSTGRES_URL || ""), source: "POSTGRES_URL" }),
      getPgPool: () => ({ query }),
    }))
    vi.doMock("@/lib/auth-server", () => ({
      getAuthedUser: vi.fn(async () => ({ user_id: "doc1", role: "doctor" })),
    }))

    const { GET } = await import("@/app/api/appointments/route")
    const reqWrong = new Request("http://localhost/api/appointments?id=ap-2", { method: "GET" })
    const resWrong = await GET(reqWrong as any)
    expect(resWrong.status).toBe(404)

    const reqOk = new Request("http://localhost/api/appointments?id=ap-1", { method: "GET" })
    const resOk = await GET(reqOk as any)
    expect(resOk.status).toBe(200)
    const bodyOk = await resOk.json()
    expect(bodyOk.item?.doctor_id).toBe("doc1")
    expect(bodyOk.item?.id).toBe("ap-1")
  })

  test("PATCH enforces ownership (404 when not owner)", async () => {
    const query = vi.fn(async (sql: any, params?: any[]) => {
      const s = String(sql || "")
      if (s.includes("CREATE TABLE") || s.includes("ALTER TABLE") || s.includes("CREATE INDEX")) return { rows: [] }
      if (s.includes("UPDATE doctor_appointments") && s.includes("WHERE id = $2 AND doctor_id = $3")) {
        const id = String(params?.[1] || "")
        const doctorId = String(params?.[2] || "")
        if (id === "ap-1" && doctorId === "doc1") {
          return {
            rows: [
              {
                id: "ap-1",
                doctor_id: "doc1",
                patient_id: "p1",
                patient_name: "Patient A",
                contact: {},
                scheduled_at: new Date("2026-01-01T00:00:00Z"),
                reason: "Reason",
                status: String(params?.[0] || "confirmed"),
                created_at: new Date("2026-01-01T00:00:00Z"),
              },
            ],
          }
        }
        return { rows: [] }
      }
      return { rows: [] }
    })

    vi.doMock("@/lib/pg", () => ({
      resolveDatabaseConfig: () => ({ url: String(process.env.POSTGRES_URL || ""), source: "POSTGRES_URL" }),
      getPgPool: () => ({ query }),
    }))
    vi.doMock("@/lib/auth-server", () => ({
      getAuthedUser: vi.fn(async () => ({ user_id: "doc1", role: "doctor" })),
    }))

    const { PATCH } = await import("@/app/api/appointments/route")
    const reqWrong = new Request("http://localhost/api/appointments", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: "ap-2", status: "confirmed" }),
    })
    const resWrong = await PATCH(reqWrong as any)
    expect(resWrong.status).toBe(404)

    const reqOk = new Request("http://localhost/api/appointments", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: "ap-1", status: "confirmed" }),
    })
    const resOk = await PATCH(reqOk as any)
    expect(resOk.status).toBe(200)
    const bodyOk = await resOk.json()
    expect(bodyOk.doctor_id).toBe("doc1")
    expect(bodyOk.status).toBe("confirmed")
  })

  test("POST rejects unknown doctor_id", async () => {
    const query = vi.fn(async (sql: any, params?: any[]) => {
      const s = String(sql || "")
      if (s.includes("CREATE TABLE") || s.includes("ALTER TABLE") || s.includes("CREATE INDEX")) return { rows: [] }
      if (s.includes("INSERT INTO doctor_profiles")) return { rows: [] }
      if (s.includes("FROM doctor_profiles") && s.includes("WHERE doctor_id = $1")) {
        return { rows: [] }
      }
      if (s.includes("INSERT INTO doctor_appointments")) {
        throw new Error("insert_should_not_happen")
      }
      return { rows: [] }
    })

    vi.doMock("@/lib/test-accounts", () => ({ TEST_ACCOUNTS: { doctors: [] } }))
    vi.doMock("@/lib/pg", () => ({
      resolveDatabaseConfig: () => ({ url: String(process.env.POSTGRES_URL || ""), source: "POSTGRES_URL" }),
      getPgPool: () => ({ query }),
    }))
    vi.doMock("@/lib/auth-server", () => ({ getAuthedUser: vi.fn(async () => null) }))

    const { POST } = await import("@/app/api/appointments/route")
    const req = new Request("http://localhost/api/appointments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        doctor_id: "unknown-doctor",
        patient_name: "Patient",
        reason: "Reason",
        scheduled_at: "2026-01-01T00:00:00Z",
        contact: { phone: "123" },
      }),
    })
    const res = await POST(req as any)
    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.error).toBe("Doctor not found")
  })

  test("POST accepts known doctor_id from TEST_ACCOUNTS", async () => {
    const query = vi.fn(async (sql: any, params?: any[]) => {
      const s = String(sql || "")
      if (s.includes("CREATE TABLE") || s.includes("ALTER TABLE") || s.includes("CREATE INDEX")) return { rows: [] }
      if (s.includes("INSERT INTO doctor_profiles")) return { rows: [] }
      if (s.includes("FROM doctor_profiles") && s.includes("WHERE doctor_id = $1")) {
        const id = String(params?.[0] || "")
        if (id === "doc-demo") return { rows: [{ ok: 1 }] }
        return { rows: [] }
      }
      if (s.includes("INSERT INTO doctor_appointments")) {
        const doctorId = String(params?.[1] || "")
        return {
          rows: [
            {
              id: "ap-1",
              doctor_id: doctorId,
              patient_id: null,
              patient_name: String(params?.[3] || ""),
              contact: JSON.parse(String(params?.[4] || "{}")),
              scheduled_at: new Date(String(params?.[5] || "2026-01-01T00:00:00Z")),
              reason: String(params?.[6] || ""),
              status: "pending",
              created_at: new Date("2026-01-01T00:00:00Z"),
            },
          ],
        }
      }
      return { rows: [] }
    })

    vi.doMock("@/lib/test-accounts", () => ({ TEST_ACCOUNTS: { doctors: [{ id: "doc-demo" }] } }))
    vi.doMock("@/lib/pg", () => ({
      resolveDatabaseConfig: () => ({ url: String(process.env.POSTGRES_URL || ""), source: "POSTGRES_URL" }),
      getPgPool: () => ({ query }),
    }))
    vi.doMock("@/lib/auth-server", () => ({ getAuthedUser: vi.fn(async () => null) }))

    const { POST } = await import("@/app/api/appointments/route")
    const req = new Request("http://localhost/api/appointments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        doctor_id: "doc-demo",
        patient_name: "Patient",
        reason: "Reason",
        scheduled_at: "2026-01-01T00:00:00Z",
        contact: { phone: "123" },
      }),
    })
    const res = await POST(req as any)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.doctor_id).toBe("doc-demo")
    expect(body.status).toBe("pending")
  })
})
