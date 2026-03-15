import type { NextRequest } from "next/server"
import crypto from "crypto"
import fs from "fs"
import path from "path"
import { getNeonPool } from "@/lib/neon-db"

export const TEAM_TODO_DOC_ID = "todo-list-kltn"

function safeEqual(a: string, b: string) {
  const aBuf = Buffer.from(a)
  const bBuf = Buffer.from(b)
  if (aBuf.length !== bBuf.length) return false
  return crypto.timingSafeEqual(aBuf, bBuf)
}

export function requireTeamTodoAuth(req: NextRequest) {
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

export async function ensureTeamTodoSchema() {
  const pool = getNeonPool()
  await pool.query(`
    CREATE TABLE IF NOT EXISTS team_todo_docs (
      id TEXT PRIMARY KEY,
      content TEXT NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_by TEXT
    )
  `)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS team_todo_revisions (
      rev_id BIGSERIAL PRIMARY KEY,
      doc_id TEXT NOT NULL,
      content TEXT NOT NULL,
      op TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      created_by TEXT,
      base_updated_at TIMESTAMPTZ,
      doc_updated_at TIMESTAMPTZ
    )
  `)
  await pool.query(`CREATE INDEX IF NOT EXISTS team_todo_revisions_doc_id_created_at_idx ON team_todo_revisions (doc_id, created_at DESC)`)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS team_todo_comments (
      comment_id BIGSERIAL PRIMARY KEY,
      doc_id TEXT NOT NULL,
      rev_id BIGINT,
      content TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      created_by TEXT,
      resolved BOOLEAN NOT NULL DEFAULT false
    )
  `)
  await pool.query(`CREATE INDEX IF NOT EXISTS team_todo_comments_doc_id_created_at_idx ON team_todo_comments (doc_id, created_at DESC)`)
  await pool.query(`CREATE INDEX IF NOT EXISTS team_todo_comments_rev_id_created_at_idx ON team_todo_comments (rev_id, created_at DESC)`)
}

export async function ensureTeamTodoSeed() {
  const pool = getNeonPool()
  const r = await pool.query("SELECT id FROM team_todo_docs WHERE id = $1", [TEAM_TODO_DOC_ID])
  if (r.rowCount) return
  const seedPath = path.join(process.cwd(), "data", "team-todo.md")
  const content = fs.readFileSync(seedPath, "utf-8")
  await pool.query("INSERT INTO team_todo_docs (id, content, updated_by) VALUES ($1, $2, $3)", [TEAM_TODO_DOC_ID, content, "seed"])
  await pool.query(
    `
    INSERT INTO team_todo_revisions (doc_id, content, op, created_by, base_updated_at, doc_updated_at)
    VALUES ($1, $2, $3, $4, NULL, now())
  `,
    [TEAM_TODO_DOC_ID, content, "seed_init", "seed"]
  )
}

export function readTeamTodoSeedFile() {
  const seedPath = path.join(process.cwd(), "data", "team-todo.md")
  return fs.readFileSync(seedPath, "utf-8")
}

