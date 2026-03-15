import { NextRequest, NextResponse } from "next/server"
import { getNeonPool } from "@/lib/neon-db"
import { ensureTeamTodoSchema, ensureTeamTodoSeed, requireTeamTodoAuth, TEAM_TODO_DOC_ID } from "@/lib/team-todo"

export async function POST(req: NextRequest) {
  try {
    if (!requireTeamTodoAuth(req)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    await ensureTeamTodoSchema()
    await ensureTeamTodoSeed()
    const body = await req.json()
    const revId = Number(body?.rev_id)
    const updatedBy = typeof body?.updated_by === "string" ? body.updated_by.trim() : ""
    if (!Number.isFinite(revId) || revId <= 0) {
      return NextResponse.json({ error: "Invalid rev_id" }, { status: 400 })
    }
    const pool = getNeonPool()
    const client = await pool.connect()
    try {
      await client.query("BEGIN")
      const rev = await client.query(
        `
        SELECT rev_id, content
        FROM team_todo_revisions
        WHERE doc_id = $1 AND rev_id = $2
        LIMIT 1
      `,
        [TEAM_TODO_DOC_ID, revId]
      )
      const row = rev.rows[0]
      if (!row) {
        await client.query("ROLLBACK")
        return NextResponse.json({ error: "Not found" }, { status: 404 })
      }
      const cur = await client.query("SELECT updated_at FROM team_todo_docs WHERE id = $1", [TEAM_TODO_DOC_ID])
      const baseUpdatedAt = cur.rows?.[0]?.updated_at || null
      const upd = await client.query(
        `
        UPDATE team_todo_docs
        SET content = $1, updated_at = now(), updated_by = $2
        WHERE id = $3
        RETURNING id, content, updated_at, updated_by
      `,
        [row.content, updatedBy || null, TEAM_TODO_DOC_ID]
      )
      const doc = upd.rows[0]
      await client.query(
        `
        INSERT INTO team_todo_revisions (doc_id, content, op, created_by, base_updated_at, doc_updated_at)
        VALUES ($1, $2, $3, $4, $5, $6)
      `,
        [TEAM_TODO_DOC_ID, doc.content, "restore", doc.updated_by || null, baseUpdatedAt, doc.updated_at]
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
    return NextResponse.json({ error: e?.message || "Internal error" }, { status: 500 })
  }
}

