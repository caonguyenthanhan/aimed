import { NextRequest, NextResponse } from "next/server"
import { getNeonPool } from "@/lib/neon-db"
import { defaultPublicProfile, normalizePrivateProfile, normalizePublicProfile } from "@/lib/doctor-profile"

function isDbEnabled() {
  return !!String(process.env.DATABASE_URL || "").trim()
}

function backendBaseUrl() {
  return (process.env.CPU_SERVER_URL || process.env.BACKEND_URL || "http://127.0.0.1:8000").trim().replace(/\/$/, "")
}

async function getAuthedUser(req: NextRequest): Promise<{ user_id: string; role: string; username?: string } | null> {
  const auth = (req.headers.get("authorization") || "").trim()
  if (!auth) return null
  try {
    const resp = await fetch(`${backendBaseUrl()}/v1/user`, { headers: { Authorization: auth } })
    if (!resp.ok) return null
    const j: any = await resp.json()
    const user_id = String(j?.user_id || "").trim()
    const role = String(j?.role || "").trim()
    const username = String(j?.username || "").trim() || undefined
    if (!user_id || !role) return null
    return { user_id, role, username }
  } catch {
    return null
  }
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

export async function GET(req: NextRequest) {
  try {
    const u = await getAuthedUser(req)
    if (!u) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    if (String(u.role || "").toLowerCase() !== "doctor") return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    if (!isDbEnabled()) return NextResponse.json({ error: "Database not configured" }, { status: 503 })
    await ensureSchema()
    const pool = getNeonPool()
    const r = await pool.query(
      `SELECT doctor_id, public_json, private_json, updated_at FROM doctor_profiles WHERE doctor_id = $1 LIMIT 1`,
      [u.user_id],
    )
    const row = r.rows[0]
    if (!row) {
      return NextResponse.json({
        doctor_id: u.user_id,
        public: defaultPublicProfile({ displayName: u.username || "Bác sĩ" }),
        private: {},
        updated_at: null,
      })
    }
    return NextResponse.json({
      doctor_id: row.doctor_id,
      public: normalizePublicProfile(row.public_json || {}),
      private: normalizePrivateProfile(row.private_json || {}),
      updated_at: row.updated_at,
    })
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const u = await getAuthedUser(req)
    if (!u) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    if (String(u.role || "").toLowerCase() !== "doctor") return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    if (!isDbEnabled()) return NextResponse.json({ error: "Database not configured" }, { status: 503 })
    const body: any = await req.json().catch(() => null)
    const pub = normalizePublicProfile(body?.public || {})
    const priv = normalizePrivateProfile(body?.private || {})
    if (!pub.displayName) {
      return NextResponse.json({ error: "Missing displayName" }, { status: 400 })
    }
    await ensureSchema()
    const pool = getNeonPool()
    const r = await pool.query(
      `
      INSERT INTO doctor_profiles (doctor_id, public_json, private_json, updated_at)
      VALUES ($1, $2::jsonb, $3::jsonb, now())
      ON CONFLICT (doctor_id)
      DO UPDATE SET public_json = EXCLUDED.public_json, private_json = EXCLUDED.private_json, updated_at = now()
      RETURNING doctor_id, public_json, private_json, updated_at
      `,
      [u.user_id, JSON.stringify(pub), JSON.stringify(priv)],
    )
    const row = r.rows[0]
    return NextResponse.json({
      doctor_id: row.doctor_id,
      public: normalizePublicProfile(row.public_json || {}),
      private: normalizePrivateProfile(row.private_json || {}),
      updated_at: row.updated_at,
    })
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}

