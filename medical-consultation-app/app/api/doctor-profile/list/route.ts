import { NextResponse } from "next/server"
import { getPgPool, resolveDatabaseConfig } from "@/lib/pg"
import { defaultPublicProfile, normalizePublicProfile } from "@/lib/doctor-profile"
import { TEST_ACCOUNTS } from "@/lib/test-accounts"

function isDbEnabled() {
  return !!String(resolveDatabaseConfig().url || "").trim()
}

let ensured = false

async function ensureSchema() {
  if (ensured) return
  const pool = getPgPool()
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

export async function GET() {
  try {
    if (!isDbEnabled()) {
      const items = TEST_ACCOUNTS.doctors.map((d) => {
        const base = defaultPublicProfile({ displayName: d.fullName })
        return { doctor_id: d.id, public: normalizePublicProfile({ ...base, displayName: d.fullName, specialties: [d.specialty] }), updated_at: null }
      })
      return NextResponse.json({ items, metadata: { offline: true } })
    }

    await ensureSchema()
    const pool = getPgPool()
    const r = await pool.query(`SELECT doctor_id, public_json, updated_at FROM doctor_profiles ORDER BY updated_at DESC LIMIT 200`)
    const items = (r.rows || []).map((row: any) => ({
      doctor_id: String(row.doctor_id || ""),
      public: normalizePublicProfile(row.public_json || {}),
      updated_at: row.updated_at,
    }))
    return NextResponse.json({ items })
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}

