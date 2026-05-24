import { NextRequest, NextResponse } from "next/server"
import { getPgPool, resolveDatabaseConfig } from "@/lib/pg"
import { normalizeForumPost, newForumPostId } from "@/lib/doctor-forum"
import { scanPii } from "@/lib/pii-scan"
import { getAuthedUser } from "@/lib/auth-server"

function isDbEnabled() {
  return !!String(resolveDatabaseConfig().url || "").trim()
}

let ensured = false

async function ensureSchema() {
  if (ensured) return
  const pool = getPgPool()
  await pool.query(`
    CREATE TABLE IF NOT EXISTS doctor_forum_posts (
      id TEXT PRIMARY KEY,
      doctor_id TEXT NOT NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      tags JSONB NOT NULL DEFAULT '[]'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `)
  await pool.query(`CREATE INDEX IF NOT EXISTS doctor_forum_posts_created_at_idx ON doctor_forum_posts (created_at DESC)`)
  ensured = true
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
      `SELECT id, doctor_id, title, content, tags, created_at FROM doctor_forum_posts ORDER BY created_at DESC LIMIT 200`,
    )
    const items = (r.rows || [])
      .map((row: any) =>
        normalizeForumPost({
          ...row,
          tags: row?.tags || [],
          created_at: new Date(row.created_at).toISOString(),
        }),
      )
      .filter(Boolean)
    return NextResponse.json({ items })
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!isDbEnabled()) return NextResponse.json({ error: "Database not configured" }, { status: 503 })
    const u = await getAuthedUser(req)
    if (!u) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    if (String(u.role || "").toLowerCase() !== "doctor") return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    await ensureSchema()
    const body: any = await req.json().catch(() => null)
    const title = String(body?.title || "").trim()
    const content = String(body?.content || "").trim()
    const tagsRaw = Array.isArray(body?.tags) ? body.tags : []
    const tags = tagsRaw.map((t: any) => String(t || "").trim()).filter(Boolean).slice(0, 12)
    if (!title || !content) return NextResponse.json({ error: "Missing fields" }, { status: 400 })
    const scan = scanPii([title, content].join("\n"))
    if (scan.blocked) {
      return NextResponse.json(
        { error: "PII detected", findings: scan.findings.map((f) => ({ type: f.type, label: f.label, match: f.match })) },
        { status: 400 },
      )
    }
    const id = newForumPostId()
    const pool = getPgPool()
    const r = await pool.query(
      `
      INSERT INTO doctor_forum_posts (id, doctor_id, title, content, tags, created_at)
      VALUES ($1, $2, $3, $4, $5::jsonb, now())
      RETURNING id, doctor_id, title, content, tags, created_at
      `,
      [id, u.user_id, title, content, JSON.stringify(tags)],
    )
    const row = r.rows[0]
    const post = normalizeForumPost({
      ...row,
      tags: row?.tags || [],
      created_at: new Date(row.created_at).toISOString(),
    })
    if (!post) return NextResponse.json({ error: "Invalid row" }, { status: 500 })
    return NextResponse.json(post)
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}

