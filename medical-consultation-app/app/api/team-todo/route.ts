import { NextRequest, NextResponse } from "next/server"
import { getNeonPool } from "@/lib/neon-db"
import {
  ensureTeamTodoSchema,
  ensureTeamTodoSeed,
  readTeamTodoSeedFile,
  requireTeamTodoAuth,
  TEAM_TODO_DOC_ID,
} from "@/lib/team-todo"

function isDbEnabled() {
  return !!String(process.env.DATABASE_URL || "").trim()
}

export async function POST(req: NextRequest) {
  try {
    if (!requireTeamTodoAuth(req)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    if (!isDbEnabled()) {
      return NextResponse.json({ error: "Database not configured" }, { status: 503 })
    }
    await ensureTeamTodoSchema()
    await ensureTeamTodoSeed()
    const content = readTeamTodoSeedFile()
    const pool = getNeonPool()
    const client = await pool.connect()
    try {
      await client.query("BEGIN")
      const upd = await client.query(
        `
        INSERT INTO team_todo_docs (id, content, updated_at, updated_by)
        VALUES ($1, $2, now(), $3)
        ON CONFLICT (id)
        DO UPDATE SET content = EXCLUDED.content, updated_at = now(), updated_by = EXCLUDED.updated_by
        RETURNING id, content, updated_at, updated_by
      `,
        [TEAM_TODO_DOC_ID, content, "seed"]
      )
      const doc = upd.rows[0]
      await client.query(
        `
        INSERT INTO team_todo_revisions (doc_id, content, op, created_by, base_updated_at, doc_updated_at)
        VALUES ($1, $2, $3, $4, NULL, $5)
      `,
        [TEAM_TODO_DOC_ID, doc.content, "seed_sync", doc.updated_by || null, doc.updated_at]
      )
      await client.query("COMMIT")
      return NextResponse.json(doc)
    } catch (e) {
      try { await client.query("ROLLBACK") } catch {}
      throw e
    } finally {
      client.release()
    }
  } catch (e: any) {
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  try {
    if (!requireTeamTodoAuth(req)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    if (!isDbEnabled()) {
      return NextResponse.json({ error: "Database not configured" }, { status: 503 })
    }
    await ensureTeamTodoSchema()
    await ensureTeamTodoSeed()
    const pool = getNeonPool()
    const row = await pool.query("SELECT id, content, updated_at, updated_by FROM team_todo_docs WHERE id = $1", [TEAM_TODO_DOC_ID])
    const doc = row.rows[0]
    return NextResponse.json({
      id: doc.id,
      content: doc.content,
      updated_at: doc.updated_at,
      updated_by: doc.updated_by || null,
    })
  } catch (e: any) {
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    if (!requireTeamTodoAuth(req)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    if (!isDbEnabled()) {
      return NextResponse.json({ error: "Database not configured" }, { status: 503 })
    }
    await ensureTeamTodoSchema()
    await ensureTeamTodoSeed()
    const body = await req.json()
    const content = typeof body?.content === "string" ? body.content : ""
    const updatedBy = typeof body?.updated_by === "string" ? body.updated_by.trim() : ""
    const baseUpdatedAt = typeof body?.base_updated_at === "string" ? body.base_updated_at : ""
    if (!content.trim()) {
      return NextResponse.json({ error: "Empty content" }, { status: 400 })
    }
    const pool = getNeonPool()
    const client = await pool.connect()
    if (baseUpdatedAt) {
      try {
        await client.query("BEGIN")
        const upd = await client.query(
          `
          UPDATE team_todo_docs
          SET content = $1, updated_at = now(), updated_by = $2
          WHERE id = $3 AND updated_at = $4::timestamptz
          RETURNING id, content, updated_at, updated_by
        `,
          [content, updatedBy || null, TEAM_TODO_DOC_ID, baseUpdatedAt]
        )
        if (!upd.rowCount) {
          await client.query("ROLLBACK")
          const latest = await pool.query("SELECT id, content, updated_at, updated_by FROM team_todo_docs WHERE id = $1", [TEAM_TODO_DOC_ID])
          return NextResponse.json({ error: "Conflict", latest: latest.rows[0] }, { status: 409 })
        }
        const doc = upd.rows[0]
        await client.query(
          `
          INSERT INTO team_todo_revisions (doc_id, content, op, created_by, base_updated_at, doc_updated_at)
          VALUES ($1, $2, $3, $4, $5::timestamptz, $6)
        `,
          [TEAM_TODO_DOC_ID, doc.content, "edit", doc.updated_by || null, baseUpdatedAt, doc.updated_at]
        )
        await client.query("COMMIT")
        return NextResponse.json(doc)
      } catch (e) {
        try { await client.query("ROLLBACK") } catch {}
        throw e
      } finally {
        client.release()
      }
    }
    try {
      await client.query("BEGIN")
      const upd = await client.query(
        `
        UPDATE team_todo_docs
        SET content = $1, updated_at = now(), updated_by = $2
        WHERE id = $3
        RETURNING id, content, updated_at, updated_by
      `,
        [content, updatedBy || null, TEAM_TODO_DOC_ID]
      )
      const doc = upd.rows[0]
      await client.query(
        `
        INSERT INTO team_todo_revisions (doc_id, content, op, created_by, base_updated_at, doc_updated_at)
        VALUES ($1, $2, $3, $4, NULL, $5)
      `,
        [TEAM_TODO_DOC_ID, doc.content, "force_edit", doc.updated_by || null, doc.updated_at]
      )
      await client.query("COMMIT")
      return NextResponse.json(doc)
    } catch (e) {
      try { await client.query("ROLLBACK") } catch {}
      throw e
    } finally {
      client.release()
    }
  } catch (e: any) {
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
