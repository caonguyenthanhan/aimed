import { NextResponse } from "next/server"
import { getNeonPool } from "@/lib/neon-db"

function isDbEnabled() {
  return !!String(process.env.DATABASE_URL || "").trim()
}

export async function GET() {
  const started = Date.now()
  if (!isDbEnabled()) {
    return NextResponse.json({ ok: false, dbEnabled: false, error: "Missing DATABASE_URL" }, { status: 503 })
  }
  try {
    const pool = getNeonPool()
    await pool.query("SELECT 1 as ok")
    return NextResponse.json({ ok: true, dbEnabled: true, latencyMs: Date.now() - started })
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, dbEnabled: true, latencyMs: Date.now() - started, error: String(e?.message || "db_error") },
      { status: 500 },
    )
  }
}

