import { NextRequest, NextResponse } from "next/server"
import { getPgPool, resolveDatabaseConfig } from "@/lib/pg"
import { getAuthedUser } from "@/lib/auth-server"
import { normalizeAppointment, newAppointmentId } from "@/lib/appointments"

function isDbEnabled() {
  return !!String(resolveDatabaseConfig().url || "").trim()
}

let ensured = false

async function ensureSchema() {
  if (ensured) return
  const pool = getPgPool()
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

    const body: any = await req.json().catch(() => null)
    const doctor_id = String(body?.doctor_id || "").trim()
    const patient_name = String(body?.patient_name || "").trim()
    const reason = String(body?.reason || "").trim()
    const scheduled_at = String(body?.scheduled_at || "").trim()
    const contact = body?.contact || {}
    const phone = String(contact?.phone || "").trim()
    const email = String(contact?.email || "").trim()

    if (!doctor_id || !patient_name || !reason || !scheduled_at) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 })
    }
    const dt = new Date(scheduled_at)
    if (!Number.isFinite(dt.getTime())) {
      return NextResponse.json({ error: "Invalid scheduled_at" }, { status: 400 })
    }

    let patient_id: string | null = null
    const auth = (req.headers.get("authorization") || "").trim()
    if (auth) {
      const u = await getAuthedUser(req)
      if (!u) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      const role = String(u.role || "").toLowerCase()
      if (role === "doctor") return NextResponse.json({ error: "Forbidden" }, { status: 403 })
      patient_id = String(u.user_id || "").trim() || null
    }

    const id = newAppointmentId()
    const pool = getPgPool()
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
  } catch {
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
  } catch {
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

    const body: any = await req.json().catch(() => null)
    const id = String(body?.id || "").trim()
    const status = String(body?.status || "").trim()
    if (!id || !["pending", "confirmed", "cancelled", "completed"].includes(status)) {
      return NextResponse.json({ error: "Invalid fields" }, { status: 400 })
    }
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
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}

