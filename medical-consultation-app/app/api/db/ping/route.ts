import { NextResponse } from "next/server"
import { getPgPool, resolveDatabaseConfig } from "@/lib/pg"

const toHeaderRecord = (headers?: HeadersInit): Record<string, string> => {
  if (!headers) return {}
  if (headers instanceof Headers) {
    const out: Record<string, string> = {}
    headers.forEach((v, k) => (out[k] = v))
    return out
  }
  if (Array.isArray(headers)) return Object.fromEntries(headers)
  return { ...(headers as Record<string, string>) }
}

const json = (data: any, init?: ResponseInit) =>
  NextResponse.json(data, {
    ...(init || {}),
    headers: {
      ...toHeaderRecord(init?.headers),
      "Content-Type": "application/json; charset=utf-8",
    },
  })

function isDbEnabled() {
  return !!String(resolveDatabaseConfig().url || "").trim()
}

export async function GET() {
  const started = Date.now()
  if (!isDbEnabled()) {
    return json({ ok: false, status: "disabled", dbEnabled: false, error: "Missing database env" })
  }
  try {
    const { source } = resolveDatabaseConfig()
    const pool = getPgPool()
    const attempts = 3
    let lastErr: any = null
    for (let i = 1; i <= attempts; i++) {
      try {
        await pool.query("SELECT 1 as ok")
        return json({ ok: true, status: "ok", dbEnabled: true, latencyMs: Date.now() - started, source, attempts: i })
      } catch (e: any) {
        lastErr = e
        if (i < attempts) {
          await new Promise((r) => setTimeout(r, 250 * i))
        }
      }
    }
    return json(
      { ok: false, status: "down", dbEnabled: true, latencyMs: Date.now() - started, source, attempts, error: String(lastErr?.message || "db_error") },
    )
  } catch (e: any) {
    const { source } = resolveDatabaseConfig()
    return json(
      { ok: false, status: "down", dbEnabled: true, latencyMs: Date.now() - started, source, error: String(e?.message || "db_error") },
    )
  }
}
