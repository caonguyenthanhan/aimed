import { NextRequest, NextResponse } from "next/server"
import { getPgPool, resolveDatabaseConfig } from "@/lib/pg"
import { getAuthedUser } from "@/lib/auth-server"
import { normalizeAppointment, newAppointmentId } from "@/lib/appointments"
import { TEST_ACCOUNTS } from "@/lib/test-accounts"
import { defaultPublicProfile, normalizePublicProfile } from "@/lib/doctor-profile"
import { parseBody, CreateAppointmentSchema, PatchAppointmentSchema } from "@/lib/api-schemas"
import { trackError } from "@/lib/error-tracker"

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
    const publicJson = normalizePublicProfile({ ...base, displayName: d.fullName, title: "BÃ¡c sÄ©", specialties: [d.specialty], bio: "" })
    await pool.query(
      `
      INSERT INTO doctor_profiles (doctor_id, public_json, private_json, updated_at)
      VALUES ($1, $2::jsonb, '{}'::jsonb, now())
      ON CONFLICT (doctor_id) DO NOTHING
      `,
      [String(d.id), JSON.stringify(publicJson)],
    )
  }
  await pool.query(`
    CREATE TABLE IF NOT EXISTS doctor_appointments (
      id TEXT PRIMARY KEY,
      doctor_id TEXT NOT NULL,
      patient_id TEXT NULL,
      patient_name TEXT NOT NULL,
      contact JSONB NOT NULL DEFAULT '{}'::jsonb,
      scheduled_at TIMESTAMPTZ NOT NULL,
      reason TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `)
  await pool.query(`ALTER TABLE doctor_appointments ADD COLUMN IF NOT EXISTS patient_id TEXT NULL`)
  await pool.query(`CREATE INDEX IF NOT EXISTS doctor_appointments_doctor_id_scheduled_at_idx ON doctor_appointments (doctor_id, scheduled_at DESC)`)
  ensured = true
}

export async function POST(req: NextRequest) {
  try {
    if (!isDbEnabled()) return NextResponse.json({ error: "Database not configured" }, { status: 503 })
    await ensureSchema()

    const { data: body, error: validationError } = await parseBody(req, CreateAppointmentSchema)
    if (validationError) return validationError

    const { doctor_id, patient_name, reason, scheduled_at, contact } = body
    const dt = new Date(scheduled_at)
    const phone = String(contact?.phone || "").trim()
    const email = String(contact?.email || "").trim()

    let patient_id: string | null = null
    const auth = (req.headers.get("authorization") || "").trim()
    if (auth) {
      const u = await getAuthedUser(req)
      if (!u) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      const role = String(u.role || "").toLowerCase()
      if (role === "doctor") return NextResponse.json({ error: "Forbidden" }, { status: 403 })
      patient_id = String(u.user_id || "").trim() || null
    }

    const pool = getPgPool()
    const dr = await pool.query(`SELECT 1 as ok FROM doctor_profiles WHERE doctor_id = $1 LIMIT 1`, [doctor_id])
    if (!dr.rows?.[0]) return NextResponse.json({ error: "Doctor not found" }, { status: 404 })

    const id = newAppointmentId()
    const r = await pool.query(
      `
      INSERT INTO doctor_appointments (id, doctor_id, patient_id, patient_name, contact, scheduled_at, reason, status, created_at)
      VALUES ($1, $2, $3, $4, $5::jsonb, $6::timestamptz, $7, 'pending', now())
      RETURNING id, doctor_id, patient_id, patient_name, contact, scheduled_at, reason, status, created_at
      `,
      [id, doctor_id, patient_id, patient_name, JSON.stringify({ phone: phone || undefined, email: email || undefined }), dt.toISOString(), reason],
    )
    const row = r.rows[0]
    const ap = normalizeAppointment({
      ...row,
      contact: row?.contact || {},
      scheduled_at: new Date(row.scheduled_at).toISOString(),
      created_at: new Date(row.created_at).toISOString(),
    })
    if (!ap) return NextResponse.json({ error: "Invalid row" }, { status: 500 })
    return NextResponse.json(ap)
  } catch (err) {
    await trackError("POST /api/appointments failed", { route: "/api/appointments", error: err })
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  try {
    if (!isDbEnabled()) return NextResponse.json({ error: "Database not configured" }, { status: 503 })
    const u = await getAuthedUser(req)
    if (!u) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    if (String(u.role || "").toLowerCase() !== "doctor") return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    await ensureSchema()
    const pool = getPgPool()
    const url = new URL(req.url)
    const id = String(url.searchParams.get("id") || "").trim()
    if (id) {
      const r = await pool.query(
        `
        SELECT id, doctor_id, patient_id, patient_name, contact, scheduled_at, reason, status, created_at
        FROM doctor_appointments
        WHERE id = $1 AND doctor_id = $2
        LIMIT 1
        `,
        [id, u.user_id],
      )
      const row = r.rows[0]
      if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 })
      const item = normalizeAppointment({
        ...row,
        contact: row?.contact || {},
        scheduled_at: new Date(row.scheduled_at).toISOString(),
        created_at: new Date(row.created_at).toISOString(),
      })
      if (!item) return NextResponse.json({ error: "Invalid row" }, { status: 500 })
      return NextResponse.json({ item })
    }
    const r = await pool.query(
      `
      SELECT id, doctor_id, patient_id, patient_name, contact, scheduled_at, reason, status, created_at
      FROM doctor_appointments
      WHERE doctor_id = $1
      ORDER BY scheduled_at DESC
      LIMIT 200
      `,
      [u.user_id],
    )
    const items = (r.rows || [])
      .map((row: any) =>
        normalizeAppointment({
          ...row,
          contact: row?.contact || {},
          scheduled_at: new Date(row.scheduled_at).toISOString(),
          created_at: new Date(row.created_at).toISOString(),
        }),
      )
      .filter(Boolean)
    return NextResponse.json({ items })
  } catch (err) {
    await trackError("GET /api/appointments failed", { route: "/api/appointments", error: err })
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    if (!isDbEnabled()) return NextResponse.json({ error: "Database not configured" }, { status: 503 })
    const u = await getAuthedUser(req)
    if (!u) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    if (String(u.role || "").toLowerCase() !== "doctor") return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    await ensureSchema()

    const { data: body, error: validationError } = await parseBody(req, PatchAppointmentSchema)
    if (validationError) return validationError

    const { id, status } = body
    const pool = getPgPool()
    const r = await pool.query(
      `
      UPDATE doctor_appointments
      SET status = $1
      WHERE id = $2 AND doctor_id = $3
      RETURNING id, doctor_id, patient_id, patient_name, contact, scheduled_at, reason, status, created_at
      `,
      [status, id, u.user_id],
    )
    const row = r.rows[0]
    if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 })
    const ap = normalizeAppointment({
      ...row,
      contact: row?.contact || {},
      scheduled_at: new Date(row.scheduled_at).toISOString(),
      created_at: new Date(row.created_at).toISOString(),
    })
    if (!ap) return NextResponse.json({ error: "Invalid row" }, { status: 500 })
    return NextResponse.json(ap)
  } catch (err) {
    await trackError("PATCH /api/appointments failed", { route: "/api/appointments", error: err })
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}

