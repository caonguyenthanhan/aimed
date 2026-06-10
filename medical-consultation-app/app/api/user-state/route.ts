import { NextRequest, NextResponse } from "next/server"
import { resolveDatabaseConfig, withPgClientRetry } from "@/lib/pg"

let ensured = false

function isDbEnabled() {
  return !!String(resolveDatabaseConfig().url || "").trim()
}

async function ensureSchema() {
  if (ensured) return
  await withPgClientRetry(async (client) => {
    await client.query(`
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
    await client.query(`CREATE INDEX IF NOT EXISTS app_user_state_owner_ns_idx ON app_user_state (owner_id, namespace)`)
  }, { attempts: 3, baseDelayMs: 250 })
  ensured = true
}

function getOwnerId(request: NextRequest) {
  const deviceId = (request.headers.get("x-device-id") || "").trim()
  if (!deviceId) return null
  return `device:${deviceId}`
}

function buildDisabledGetResponse(request: NextRequest, degraded = false) {
  const url = new URL(request.url)
  const namespace = (url.searchParams.get("namespace") || "").trim()
  const key = (url.searchParams.get("key") || "").trim()
  if (!namespace) return NextResponse.json({ error: "Missing namespace" }, { status: 400 })
  if (key) return NextResponse.json({ item: null, disabled: true, degraded })
  return NextResponse.json({ items: [], disabled: true, degraded })
}

export async function GET(request: NextRequest) {
  try {
    if (!isDbEnabled()) {
      return buildDisabledGetResponse(request)
    }
    const ownerId = getOwnerId(request)
    if (!ownerId) return NextResponse.json({ error: "Missing x-device-id" }, { status: 400 })
    const url = new URL(request.url)
    const namespace = (url.searchParams.get("namespace") || "").trim()
    const key = (url.searchParams.get("key") || "").trim()
    if (!namespace) return NextResponse.json({ error: "Missing namespace" }, { status: 400 })

    await ensureSchema()

    if (key) {
      const { value } = await withPgClientRetry((client) => client.query(
        `SELECT key, value, updated_at FROM app_user_state WHERE owner_id=$1 AND namespace=$2 AND key=$3`,
        [ownerId, namespace, key],
      ), { attempts: 3, baseDelayMs: 250 })
      return NextResponse.json({ item: value.rows[0] || null })
    }

    const { value } = await withPgClientRetry((client) => client.query(
      `SELECT key, value, updated_at FROM app_user_state WHERE owner_id=$1 AND namespace=$2 ORDER BY updated_at DESC`,
      [ownerId, namespace],
    ), { attempts: 3, baseDelayMs: 250 })
    return NextResponse.json({ items: value.rows })
  } catch (e: any) {
    console.warn("[user-state] falling back to disabled mode for GET", String(e?.message || e || "unknown"))
    return buildDisabledGetResponse(request, true)
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
    await withPgClientRetry((client) => client.query(
      `
      INSERT INTO app_user_state (owner_id, namespace, key, value, updated_at)
      VALUES ($1, $2, $3, $4, now())
      ON CONFLICT (owner_id, namespace, key) DO UPDATE
      SET value = EXCLUDED.value, updated_at = now()
      `,
      [ownerId, namespace, key, value],
    ), { attempts: 3, baseDelayMs: 250 })
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    console.warn("[user-state] write degraded", String(e?.message || e || "unknown"))
    return NextResponse.json({ ok: false, disabled: true, degraded: true })
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
    await withPgClientRetry((client) => client.query(
      `DELETE FROM app_user_state WHERE owner_id=$1 AND namespace=$2 AND key=$3`,
      [ownerId, namespace, key],
    ), { attempts: 3, baseDelayMs: 250 })
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    console.warn("[user-state] delete degraded", String(e?.message || e || "unknown"))
    return NextResponse.json({ ok: false, disabled: true, degraded: true })
  }
}

