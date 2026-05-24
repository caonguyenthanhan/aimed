import { NextResponse } from "next/server"
import { getPgPool, resolveDatabaseConfig } from "@/lib/pg"

function isDbEnabled() {
  return !!String(resolveDatabaseConfig().url || "").trim()
}

export async function GET() {
  const started = Date.now()
  if (!isDbEnabled()) {
    return NextResponse.json({ ok: false, dbEnabled: false, error: "Missing database env" }, { status: 503 })
  }
  try {
    const { source } = resolveDatabaseConfig()
    const pool = getPgPool()
    const attempts = 3
    let lastErr: any = null
    for (let i = 1; i <= attempts; i++) {
      try {
        await pool.query("SELECT 1 as ok")
        return NextResponse.json({ ok: true, dbEnabled: true, latencyMs: Date.now() - started, source, attempts: i })
      } catch (e: any) {
        lastErr = e
        if (i < attempts) {
          await new Promise((r) => setTimeout(r, 250 * i))
        }
      }
    }
    return NextResponse.json(
      { ok: false, dbEnabled: true, latencyMs: Date.now() - started, source, attempts, error: String(lastErr?.message || "db_error") },
      { status: 500 },
    )
  } catch (e: any) {
    const { source } = resolveDatabaseConfig()
    return NextResponse.json(
      { ok: false, dbEnabled: true, latencyMs: Date.now() - started, source, error: String(e?.message || "db_error") },
      { status: 500 },
    )
  }
}

