import { Pool } from "pg"

let pool: Pool | null = null

export function getNeonPool() {
  if (pool) return pool
  const connectionString = (process.env.DATABASE_URL || "").trim()
  if (!connectionString) {
    throw new Error("Missing DATABASE_URL")
  }
  const requireSsl = connectionString.toLowerCase().includes("sslmode=require")
  pool = new Pool({
    connectionString,
    ssl: requireSsl ? { rejectUnauthorized: false } : undefined,
    max: 5,
  })
  return pool
}

