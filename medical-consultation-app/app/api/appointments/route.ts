import { NextRequest, NextResponse } from "next/server"
import { getNeonPool } from "@/lib/neon-db"
import { normalizeAppointment, newAppointmentId } from "@/lib/appointments"

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
    CREATE TABLE IF NOT EXISTS doctor_appointments (
      id TEXT PRIMARY KEY,
      doctor_id TEXT NOT NULL,
      patient_name TEXT NOT NULL,
      contact JSONB NOT NULL DEFAULT '{}'::jsonb,
      scheduled_at TIMESTAMPTZ NOT NULL,
      reason TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `)
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

    const id = newAppointmentId()
    const pool = getNeonPool()
    const r = await pool.query(
      `
      INSERT INTO doctor_appointments (id, doctor_id, patient_name, contact, scheduled_at, reason, status, created_at)
      VALUES ($1, $2, $3, $4::jsonb, $5::timestamptz, $6, 'pending', now())
      RETURNING id, doctor_id, patient_name, contact, scheduled_at, reason, status, created_at
      `,
      [id, doctor_id, patient_name, JSON.stringify({ phone: phone || undefined, email: email || undefined }), dt.toISOString(), reason],
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
    const pool = getNeonPool()
    const r = await pool.query(
      `
      SELECT id, doctor_id, patient_name, contact, scheduled_at, reason, status, created_at
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
    const pool = getNeonPool()
    const r = await pool.query(
      `
      UPDATE doctor_appointments
      SET status = $1
      WHERE id = $2 AND doctor_id = $3
      RETURNING id, doctor_id, patient_name, contact, scheduled_at, reason, status, created_at
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

