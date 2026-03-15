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
    const limitRaw = Number(url.searchParams.get("limit") || "50")
    const limit = Number.isFinite(limitRaw) ? Math.max(1, Math.min(200, limitRaw)) : 50
    const pool = getNeonPool()
    const r = await pool.query(
      `
      SELECT rev_id, op, created_at, created_by, base_updated_at, doc_updated_at
      FROM team_todo_revisions
      WHERE doc_id = $1
      ORDER BY rev_id DESC
      LIMIT $2
    `,
      [TEAM_TODO_DOC_ID, limit]
    )
    return NextResponse.json({ items: r.rows })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Internal error" }, { status: 500 })
  }
}

