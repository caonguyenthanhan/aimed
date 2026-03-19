import { NextRequest, NextResponse } from "next/server"
import { getNeonPool } from "@/lib/neon-db"

let ensured = false

function isDbEnabled() {
  return !!String(process.env.DATABASE_URL || "").trim()
}

async function ensureSchema() {
  if (ensured) return
  const pool = getNeonPool()
  await pool.query(`
    CREATE TABLE IF NOT EXISTS app_user_state (
      owner_id TEXT NOT NULL,
      namespace TEXT NOT NULL,
      key TEXT NOT NULL,
      value JSONB NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      PRIMARY KEY (owner_id, namespace, key)
    )
  `)
  await pool.query(`CREATE INDEX IF NOT EXISTS app_user_state_owner_ns_idx ON app_user_state (owner_id, namespace)`)
  ensured = true
}

function getOwnerId(request: NextRequest) {
  const deviceId = (request.headers.get("x-device-id") || "").trim()
  if (!deviceId) return null
  return `device:${deviceId}`
}

export async function GET(request: NextRequest) {
  try {
    if (!isDbEnabled()) {
      const url = new URL(request.url)
      const namespace = (url.searchParams.get("namespace") || "").trim()
      const key = (url.searchParams.get("key") || "").trim()
      if (!namespace) return NextResponse.json({ error: "Missing namespace" }, { status: 400 })
      if (key) return NextResponse.json({ item: null, disabled: true })
      return NextResponse.json({ items: [], disabled: true })
    }
    const ownerId = getOwnerId(request)
    if (!ownerId) return NextResponse.json({ error: "Missing x-device-id" }, { status: 400 })
    const url = new URL(request.url)
    const namespace = (url.searchParams.get("namespace") || "").trim()
    const key = (url.searchParams.get("key") || "").trim()
    if (!namespace) return NextResponse.json({ error: "Missing namespace" }, { status: 400 })

    await ensureSchema()
    const pool = getNeonPool()

    if (key) {
      const { rows } = await pool.query(
        `SELECT key, value, updated_at FROM app_user_state WHERE owner_id=$1 AND namespace=$2 AND key=$3`,
        [ownerId, namespace, key],
      )
      return NextResponse.json({ item: rows[0] || null })
    }

    const { rows } = await pool.query(
      `SELECT key, value, updated_at FROM app_user_state WHERE owner_id=$1 AND namespace=$2 ORDER BY updated_at DESC`,
      [ownerId, namespace],
    )
    return NextResponse.json({ items: rows })
  } catch (e: any) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!isDbEnabled()) {
      return NextResponse.json({ ok: false, disabled: true })
    }
    const ownerId = getOwnerId(request)
    if (!ownerId) return NextResponse.json({ error: "Missing x-device-id" }, { status: 400 })
    const body = await request.json().catch(() => null)
    const namespace = String(body?.namespace || "").trim()
    const key = String(body?.key || "").trim()
    const value = body?.value
    if (!namespace || !key) return NextResponse.json({ error: "Missing namespace or key" }, { status: 400 })
    if (value === undefined) return NextResponse.json({ error: "Missing value" }, { status: 400 })

    await ensureSchema()
    const pool = getNeonPool()
    await pool.query(
      `
      INSERT INTO app_user_state (owner_id, namespace, key, value, updated_at)
      VALUES ($1, $2, $3, $4, now())
      ON CONFLICT (owner_id, namespace, key) DO UPDATE
      SET value = EXCLUDED.value, updated_at = now()
      `,
      [ownerId, namespace, key, value],
    )
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    if (!isDbEnabled()) {
      return NextResponse.json({ ok: false, disabled: true })
    }
    const ownerId = getOwnerId(request)
    if (!ownerId) return NextResponse.json({ error: "Missing x-device-id" }, { status: 400 })
    const url = new URL(request.url)
    const namespace = (url.searchParams.get("namespace") || "").trim()
    const key = (url.searchParams.get("key") || "").trim()
    if (!namespace || !key) return NextResponse.json({ error: "Missing namespace or key" }, { status: 400 })

    await ensureSchema()
    const pool = getNeonPool()
    await pool.query(
      `DELETE FROM app_user_state WHERE owner_id=$1 AND namespace=$2 AND key=$3`,
      [ownerId, namespace, key],
    )
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

