import { NextRequest, NextResponse } from "next/server"
import crypto from "crypto"
import fs from "fs"
import path from "path"
import { getNeonPool } from "@/lib/neon-db"

const DOC_ID = "todo-list-kltn"

function safeEqual(a: string, b: string) {
  const aBuf = Buffer.from(a)
  const bBuf = Buffer.from(b)
  if (aBuf.length !== bBuf.length) return false
  return crypto.timingSafeEqual(aBuf, bBuf)
}

function requireAuth(req: NextRequest) {
  const expected = (process.env.TEAM_TODO_PASSWORD || "").trim()
  if (!expected) {
    throw new Error("Missing TEAM_TODO_PASSWORD")
  }
  const header = (req.headers.get("x-team-todo-pass") || "").trim()
  const url = new URL(req.url)
  const query = (url.searchParams.get("pw") || "").trim()
  const provided = header || query
  if (!provided || !safeEqual(provided, expected)) {
    return false
  }
  return true
}

async function ensureSchema() {
  const pool = getNeonPool()
  await pool.query(`
    CREATE TABLE IF NOT EXISTS team_todo_docs (
      id TEXT PRIMARY KEY,
      content TEXT NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_by TEXT
    )
  `)
}

async function ensureSeed() {
  const pool = getNeonPool()
  const r = await pool.query("SELECT id FROM team_todo_docs WHERE id = $1", [DOC_ID])
  if (r.rowCount) return
  const seedPath = path.join(process.cwd(), "data", "team-todo.md")
  const content = fs.readFileSync(seedPath, "utf-8")
  await pool.query("INSERT INTO team_todo_docs (id, content) VALUES ($1, $2)", [DOC_ID, content])
}

export async function POST(req: NextRequest) {
  try {
    if (!requireAuth(req)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    await ensureSchema()
    const seedPath = path.join(process.cwd(), "data", "team-todo.md")
    const content = fs.readFileSync(seedPath, "utf-8")
    const pool = getNeonPool()
    const upd = await pool.query(
      `
      INSERT INTO team_todo_docs (id, content, updated_at, updated_by)
      VALUES ($1, $2, now(), $3)
      ON CONFLICT (id)
      DO UPDATE SET content = EXCLUDED.content, updated_at = now(), updated_by = EXCLUDED.updated_by
      RETURNING id, content, updated_at, updated_by
    `,
      [DOC_ID, content, "seed"]
    )
    return NextResponse.json(upd.rows[0])
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Internal error" }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  try {
    if (!requireAuth(req)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    await ensureSchema()
    await ensureSeed()
    const pool = getNeonPool()
    const row = await pool.query("SELECT id, content, updated_at, updated_by FROM team_todo_docs WHERE id = $1", [DOC_ID])
    const doc = row.rows[0]
    return NextResponse.json({
      id: doc.id,
      content: doc.content,
      updated_at: doc.updated_at,
      updated_by: doc.updated_by || null,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Internal error" }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    if (!requireAuth(req)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    await ensureSchema()
    await ensureSeed()
    const body = await req.json()
    const content = typeof body?.content === "string" ? body.content : ""
    const updatedBy = typeof body?.updated_by === "string" ? body.updated_by.trim() : ""
    const baseUpdatedAt = typeof body?.base_updated_at === "string" ? body.base_updated_at : ""
    if (!content.trim()) {
      return NextResponse.json({ error: "Empty content" }, { status: 400 })
    }
    const pool = getNeonPool()
    if (baseUpdatedAt) {
      const upd = await pool.query(
        `
        UPDATE team_todo_docs
        SET content = $1, updated_at = now(), updated_by = $2
        WHERE id = $3 AND updated_at = $4::timestamptz
        RETURNING id, content, updated_at, updated_by
      `,
        [content, updatedBy || null, DOC_ID, baseUpdatedAt]
      )
      if (!upd.rowCount) {
        const latest = await pool.query("SELECT id, content, updated_at, updated_by FROM team_todo_docs WHERE id = $1", [DOC_ID])
        return NextResponse.json({ error: "Conflict", latest: latest.rows[0] }, { status: 409 })
      }
      return NextResponse.json(upd.rows[0])
    }
    const upd = await pool.query(
      `
      UPDATE team_todo_docs
      SET content = $1, updated_at = now(), updated_by = $2
      WHERE id = $3
      RETURNING id, content, updated_at, updated_by
    `,
      [content, updatedBy || null, DOC_ID]
    )
    return NextResponse.json(upd.rows[0])
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Internal error" }, { status: 500 })
  }
}
