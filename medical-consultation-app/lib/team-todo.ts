import type { NextRequest } from "next/server"
import crypto from "crypto"
import fs from "fs"
import path from "path"
import { getNeonPool } from "@/lib/neon-db"

export const TEAM_TODO_DOC_ID = "todo-list-kltn"

type TeamTodoSeed = {
  title: string
  strategy?: string
  duration?: string
  team?: string[]
  legend?: Array<{ type: string; emoji?: string; label?: string; desc?: string }>
  sprints?: Array<{
    id?: number | string
    name: string
    time?: string
    goal?: string
    tasks?: Array<{ id?: string; type?: string; text: string; completed?: boolean }>
  }>
}

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
  const content = readTeamTodoSeedFile()
  await pool.query("INSERT INTO team_todo_docs (id, content, updated_by) VALUES ($1, $2, $3)", [TEAM_TODO_DOC_ID, content, "seed"])
  await pool.query(
    `
    INSERT INTO team_todo_revisions (doc_id, content, op, created_by, base_updated_at, doc_updated_at)
    VALUES ($1, $2, $3, $4, NULL, now())
  `,
    [TEAM_TODO_DOC_ID, content, "seed_init", "seed"]
  )
}

function escapeMdBrackets(s: string) {
  return s.replace(/\[/g, "\\[").replace(/\]/g, "\\]")
}

function renderTeamTodoMarkdown(seed: TeamTodoSeed) {
  const title = String(seed?.title || "").trim() || "TODO LIST"
  const strategy = typeof seed?.strategy === "string" ? seed.strategy.trim() : ""
  const duration = typeof seed?.duration === "string" ? seed.duration.trim() : ""
  const team = Array.isArray(seed?.team) ? seed.team.map((x) => String(x || "").trim()).filter(Boolean) : []
  const legend = Array.isArray(seed?.legend) ? seed.legend : []
  const sprints = Array.isArray(seed?.sprints) ? seed.sprints : []

  const legendByType = new Map<string, { emoji: string; label: string; desc: string }>()
  for (const l of legend) {
    const type = String(l?.type || "").trim()
    if (!type) continue
    legendByType.set(type, {
      emoji: String(l?.emoji || "").trim(),
      label: String(l?.label || "").trim(),
      desc: String(l?.desc || "").trim(),
    })
  }

  const lines: string[] = []
  lines.push(`# **${title}**`)
  lines.push("")
  if (strategy) {
    lines.push(`*(Chiến lược: ${strategy})*`)
    lines.push("")
  }
  if (legend.length) {
    lines.push("**Bảng chú giải:**")
    lines.push("")
    for (const l of legend) {
      const emoji = String(l?.emoji || "").trim()
      const label = String(l?.label || "").trim()
      const desc = String(l?.desc || "").trim()
      const labelPart = label ? ` **${escapeMdBrackets(label)}**` : ""
      const descPart = desc ? `: ${desc}` : ""
      lines.push(`* ${emoji}${labelPart}${descPart}`.trimEnd())
    }
    lines.push("")
  }
  if (duration) {
    lines.push(`**Thời gian dự kiến:** ${duration}`)
    lines.push("")
  }
  if (team.length) {
    lines.push("**Team:**")
    lines.push("")
    for (const m of team) lines.push(`* ${m}`)
    lines.push("")
  }

  for (const s of sprints) {
    const name = String(s?.name || "").trim()
    if (!name) continue
    const time = typeof s?.time === "string" ? s.time.trim() : ""
    const goal = typeof s?.goal === "string" ? s.goal.trim() : ""
    const headingHasTime = /\(.*tuần/i.test(name)
    const heading = time && !headingHasTime ? `${name} (${time})` : name
    lines.push(`## **${heading}**`)
    lines.push("")
    if (goal) {
      lines.push(`*Mục tiêu: ${goal}*`)
      lines.push("")
    }
    const tasks = Array.isArray(s?.tasks) ? s.tasks : []
    for (const t of tasks) {
      const done = !!t?.completed
      const box = done ? "[x]" : "[ ]"
      const type = String(t?.type || "").trim()
      const text = String(t?.text || "").trim()
      if (!text) continue
      const legendItem = legendByType.get(type)
      const emoji = legendItem?.emoji ? `${legendItem.emoji} ` : ""
      const label = legendItem?.label ? ` **${escapeMdBrackets(legendItem.label)}**` : type ? ` **${escapeMdBrackets(`[${type}]`)}**` : ""
      lines.push(`* ${box} ${emoji}${label} ${text}`.replace(/\s+/g, " ").trimEnd())
    }
    lines.push("")
  }

  return lines.join("\n").trim() + "\n"
}

export function readTeamTodoSeedFile() {
  const seedJsonPath = path.join(process.cwd(), "data", "team-todo.json")
  if (fs.existsSync(seedJsonPath)) {
    const raw = fs.readFileSync(seedJsonPath, "utf-8")
    const parsed = JSON.parse(raw) as TeamTodoSeed
    return renderTeamTodoMarkdown(parsed)
  }
  const seedMdPath = path.join(process.cwd(), "data", "team-todo.md")
  return fs.readFileSync(seedMdPath, "utf-8")
}
