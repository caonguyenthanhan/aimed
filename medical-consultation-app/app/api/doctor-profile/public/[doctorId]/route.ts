import { NextRequest, NextResponse } from "next/server"
import { getNeonPool } from "@/lib/neon-db"
import { normalizePublicProfile } from "@/lib/doctor-profile"

function isDbEnabled() {
  return !!String(process.env.DATABASE_URL || "").trim()
}

let ensured = false

async function ensureSchema() {
  if (ensured) return
  const pool = getNeonPool()
  await pool.query(`
    CREATE TABLE IF NOT EXISTS doctor_profiles (
      doctor_id TEXT PRIMARY KEY,
      public_json JSONB NOT NULL DEFAULT '{}'::jsonb,
      private_json JSONB NOT NULL DEFAULT '{}'::jsonb,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `)
  ensured = true
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ doctorId: string }> }) {
  try {
    if (!isDbEnabled()) return NextResponse.json({ error: "Database not configured" }, { status: 503 })
    await ensureSchema()
    const { doctorId } = await ctx.params
    const id = String(doctorId || "").trim()
    if (!id) return NextResponse.json({ error: "Missing doctorId" }, { status: 400 })
    const pool = getNeonPool()
    const r = await pool.query(`SELECT doctor_id, public_json, updated_at FROM doctor_profiles WHERE doctor_id = $1 LIMIT 1`, [id])
    const row = r.rows[0]
    if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 })
    return NextResponse.json({
      doctor_id: row.doctor_id,
      public: normalizePublicProfile(row.public_json || {}),
      updated_at: row.updated_at,
    })
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}

