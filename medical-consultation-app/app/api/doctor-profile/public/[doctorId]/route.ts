import { NextRequest, NextResponse } from "next/server"
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
  for (const d of TEST_ACCOUNTS.doctors) {
    const base = defaultPublicProfile({ displayName: d.fullName })
    const publicJson = normalizePublicProfile({ ...base, displayName: d.fullName, title: "Bác sĩ", specialties: [d.specialty], bio: "" })
    await pool.query(
      `
      INSERT INTO doctor_profiles (doctor_id, public_json, private_json, updated_at)
      VALUES ($1, $2::jsonb, '{}'::jsonb, now())
      ON CONFLICT (doctor_id) DO NOTHING
      `,
      [String(d.id), JSON.stringify(publicJson)],
    )
  }
  ensured = true
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ doctorId: string }> }) {
  try {
    const { doctorId } = await ctx.params
    const id = String(doctorId || "").trim()
    if (!id) return NextResponse.json({ error: "Missing doctorId" }, { status: 400 })
    if (!isDbEnabled()) {
      const found = TEST_ACCOUNTS.doctors.find((d) => String(d.id) === id)
      if (!found) return NextResponse.json({ error: "Not found" }, { status: 404 })
      const base = defaultPublicProfile({ displayName: found.fullName })
      return NextResponse.json({
        doctor_id: found.id,
        public: normalizePublicProfile({ ...base, displayName: found.fullName, title: "Bác sĩ", specialties: [found.specialty], bio: "" }),
        updated_at: null,
        metadata: { offline: true },
      })
    }

    await ensureSchema()
    const pool = getPgPool()
    const r = await pool.query(`SELECT doctor_id, public_json, updated_at FROM doctor_profiles WHERE doctor_id = $1 LIMIT 1`, [id])
    const row = r.rows[0]
    if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 })
    return NextResponse.json({ doctor_id: row.doctor_id, public: normalizePublicProfile(row.public_json || {}), updated_at: row.updated_at })
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
