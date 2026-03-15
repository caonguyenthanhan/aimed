import { NextRequest, NextResponse } from "next/server"
import { getNeonPool } from "@/lib/neon-db"
import { ensureTeamTodoSchema, ensureTeamTodoSeed, requireTeamTodoAuth, TEAM_TODO_DOC_ID } from "@/lib/team-todo"

export async function GET(req: NextRequest) {
  try {
    if (!requireTeamTodoAuth(req)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    await ensureTeamTodoSchema()
    await ensureTeamTodoSeed()
    const url = new URL(req.url)
    const revRaw = url.searchParams.get("rev_id")
    const revId = revRaw ? Number(revRaw) : null
    const pool = getNeonPool()
    if (revId && Number.isFinite(revId) && revId > 0) {
      const r = await pool.query(
        `
        SELECT comment_id, doc_id, rev_id, content, created_at, created_by, resolved
        FROM team_todo_comments
        WHERE doc_id = $1 AND rev_id = $2
        ORDER BY comment_id DESC
        LIMIT 200
      `,
        [TEAM_TODO_DOC_ID, revId]
      )
      return NextResponse.json({ items: r.rows })
    }
    const r = await pool.query(
      `
      SELECT comment_id, doc_id, rev_id, content, created_at, created_by, resolved
      FROM team_todo_comments
      WHERE doc_id = $1
      ORDER BY comment_id DESC
      LIMIT 200
    `,
      [TEAM_TODO_DOC_ID]
    )
    return NextResponse.json({ items: r.rows })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Internal error" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!requireTeamTodoAuth(req)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    await ensureTeamTodoSchema()
    await ensureTeamTodoSeed()
    const body = await req.json()
    const content = typeof body?.content === "string" ? body.content.trim() : ""
    const createdBy = typeof body?.created_by === "string" ? body.created_by.trim() : ""
    const revId = body?.rev_id ? Number(body.rev_id) : null
    if (!content) {
      return NextResponse.json({ error: "Empty content" }, { status: 400 })
    }
    const pool = getNeonPool()
    const r = await pool.query(
      `
      INSERT INTO team_todo_comments (doc_id, rev_id, content, created_by)
      VALUES ($1, $2, $3, $4)
      RETURNING comment_id, doc_id, rev_id, content, created_at, created_by, resolved
    `,
      [TEAM_TODO_DOC_ID, revId && Number.isFinite(revId) && revId > 0 ? revId : null, content, createdBy || null]
    )
    return NextResponse.json(r.rows[0])
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Internal error" }, { status: 500 })
  }
}

