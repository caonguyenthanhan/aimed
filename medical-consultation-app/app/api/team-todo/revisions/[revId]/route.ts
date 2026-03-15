import { NextRequest, NextResponse } from "next/server"
import { getNeonPool } from "@/lib/neon-db"
import { ensureTeamTodoSchema, ensureTeamTodoSeed, requireTeamTodoAuth, TEAM_TODO_DOC_ID } from "@/lib/team-todo"

export async function GET(req: NextRequest, ctx: { params: Promise<{ revId: string }> }) {
  try {
    if (!requireTeamTodoAuth(req)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    await ensureTeamTodoSchema()
    await ensureTeamTodoSeed()
    const { revId } = await ctx.params
    const id = Number(revId)
    if (!Number.isFinite(id) || id <= 0) {
      return NextResponse.json({ error: "Invalid revId" }, { status: 400 })
    }
    const pool = getNeonPool()
    const r = await pool.query(
      `
      SELECT rev_id, doc_id, content, op, created_at, created_by, base_updated_at, doc_updated_at
      FROM team_todo_revisions
      WHERE doc_id = $1 AND rev_id = $2
      LIMIT 1
    `,
      [TEAM_TODO_DOC_ID, id]
    )
    const row = r.rows[0]
    if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 })
    return NextResponse.json(row)
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Internal error" }, { status: 500 })
  }
}

