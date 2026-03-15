import { Pool } from "pg"

let pool: Pool | null = null

function normalizeDatabaseUrl(raw: string) {
  const s = raw.trim()
  if (!s) return s
  if (!/^postgres(ql)?:\/\//i.test(s)) return s
  try {
    const u = new URL(s)
    const sslmode = (u.searchParams.get("sslmode") || "").toLowerCase()
    const compat = (u.searchParams.get("uselibpqcompat") || "").toLowerCase()
    if (!compat && (sslmode === "prefer" || sslmode === "require" || sslmode === "verify-ca")) {
      u.searchParams.set("sslmode", "verify-full")
      return u.toString()
    }
    return s
  } catch {
    return s
  }
}

export function getNeonPool() {
  if (pool) return pool
  const connectionString = normalizeDatabaseUrl(process.env.DATABASE_URL || "")
  if (!connectionString) {
    throw new Error("Missing DATABASE_URL")
  }
  pool = new Pool({
    connectionString,
    max: 5,
  })
  return pool
}
