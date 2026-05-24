import type { NextRequest } from "next/server"
import { TEST_ACCOUNTS } from "@/lib/test-accounts"

export type AuthedUser = { user_id: string; role: string; username?: string; full_name?: string }

function parseBearerToken(authHeader: string) {
  const raw = String(authHeader || "").trim()
  if (!raw) return ""
  const m = raw.match(/^Bearer\s+(.+)$/i)
  return String(m?.[1] || "").trim()
}

function findTestAccountById(id: string) {
  const all: any[] = [...TEST_ACCOUNTS.doctors, ...TEST_ACCOUNTS.patients]
  return all.find((x) => String(x?.id || "").trim() === id) || null
}

export async function getAuthedUser(req: NextRequest): Promise<AuthedUser | null> {
  const auth = (req.headers.get("authorization") || "").trim()
  if (!auth) return null

  const token = parseBearerToken(auth)
  if (token.startsWith("test_token_")) {
    const id = token.slice("test_token_".length).trim()
    const acc: any = findTestAccountById(id)
    if (!acc) return null
    return {
      user_id: String(acc.id),
      role: String(acc.role),
      username: String(acc.username || "").trim() || undefined,
      full_name: String(acc.fullName || "").trim() || undefined,
    }
  }

  const cpuBase = (process.env.CPU_SERVER_URL || process.env.BACKEND_URL || "http://127.0.0.1:8000").trim().replace(/\/$/, "")
  try {
    const resp = await fetch(`${cpuBase}/v1/user`, { headers: { Authorization: auth } })
    if (!resp.ok) return null
    const j: any = await resp.json().catch(() => null)
    const user_id = String(j?.user_id || "").trim()
    const role = String(j?.role || "").trim()
    const username = String(j?.username || "").trim() || undefined
    if (!user_id || !role) return null
    return { user_id, role, username }
  } catch {
    return null
  }
}

