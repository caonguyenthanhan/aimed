/**
 * POST /api/auth/login
 * Authenticates user with username+password, returns a signed JWT.
 * In production: forwards credentials to CPU server.
 * In dev: also accepts test accounts from TEST_ACCOUNTS.
 */
import { NextRequest, NextResponse } from "next/server"
import { signJWT } from "@/lib/jwt"
import { findTestAccount } from "@/lib/test-accounts"
import { parseBody, LoginSchema } from "@/lib/api-schemas"
import { trackError } from "@/lib/error-tracker"

export async function POST(req: NextRequest) {
  const { data, error } = await parseBody(req, LoginSchema)
  if (error) return error

  const { username, password } = data

  // WHY: dev/demo accounts only allowed outside production to avoid leaking test credentials
  if (process.env.NODE_ENV !== "production") {
    const testAcc = findTestAccount(username, password)
    if (testAcc) {
      const token = await signJWT({
        user_id: String(testAcc.id),
        role: String(testAcc.role),
        username: String(testAcc.username || ""),
        full_name: String((testAcc as any).fullName || ""),
      })
      return NextResponse.json({ token, user_id: testAcc.id, role: testAcc.role })
    }
  }

  // Forward to CPU/backend server for real authentication
  const cpuBase = (process.env.CPU_SERVER_URL || process.env.BACKEND_URL || "http://127.0.0.1:8000")
    .trim()
    .replace(/\/$/, "")

  try {
    const resp = await fetch(`${cpuBase}/v1/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
      signal: AbortSignal.timeout(8000),
    })

    if (!resp.ok) {
      const errBody = await resp.json().catch(() => ({}))
      return NextResponse.json(
        { error: errBody?.detail || "Invalid credentials" },
        { status: resp.status === 401 ? 401 : 502 }
      )
    }

    const j: any = await resp.json().catch(() => null)
    const user_id = String(j?.user_id || "").trim()
    const role = String(j?.role || "").trim()
    const uname = String(j?.username || "").trim() || undefined
    const full_name = String(j?.full_name || "").trim() || undefined

    if (!user_id || !role) {
      return NextResponse.json({ error: "Backend returned invalid user data" }, { status: 502 })
    }

    const token = await signJWT({ user_id, role, username: uname, full_name })
    return NextResponse.json({ token, user_id, role })
  } catch (err: any) {
    if (err?.name === "TimeoutError") {
      await trackError("Auth server timeout", { route: "/api/auth/login", error: err, level: "warning" })
      return NextResponse.json({ error: "Auth server timeout" }, { status: 504 })
    }
    await trackError("Auth server unavailable", { route: "/api/auth/login", error: err })
    return NextResponse.json({ error: "Auth server unavailable" }, { status: 503 })
  }
}
