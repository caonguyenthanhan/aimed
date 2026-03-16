import { getNeonPool } from "@/lib/neon-db"

type Kind = "consultation" | "friend" | "speech_stream" | "unknown"

let ensured = false

async function ensureSchema() {
  if (ensured) return
  const pool = getNeonPool()
  await pool.query(`
    CREATE TABLE IF NOT EXISTS app_chat_sessions (
      session_id TEXT PRIMARY KEY,
      kind TEXT NOT NULL DEFAULT 'unknown',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS app_chat_messages (
      id BIGSERIAL PRIMARY KEY,
      session_id TEXT NOT NULL REFERENCES app_chat_sessions(session_id) ON DELETE CASCADE,
      role TEXT NOT NULL,
      content TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `)
  await pool.query(`CREATE INDEX IF NOT EXISTS app_chat_messages_session_id_idx ON app_chat_messages(session_id)`)
  ensured = true
}

export async function persistChatTurn(params: {
  sessionId: string
  kind?: Kind
  userText?: string
  assistantText?: string
}) {
  const sessionId = String(params.sessionId || "").trim()
  if (!sessionId) return
  const kind: Kind = (params.kind as any) || "unknown"
  const userText = String(params.userText || "")
  const assistantText = String(params.assistantText || "")

  try {
    await ensureSchema()
    const pool = getNeonPool()
    await pool.query(
      `
      INSERT INTO app_chat_sessions (session_id, kind, updated_at)
      VALUES ($1, $2, now())
      ON CONFLICT (session_id) DO UPDATE SET kind = EXCLUDED.kind, updated_at = now()
      `,
      [sessionId, kind],
    )
    if (userText.trim()) {
      await pool.query(
        `INSERT INTO app_chat_messages (session_id, role, content) VALUES ($1, 'user', $2)`,
        [sessionId, userText],
      )
    }
    if (assistantText.trim()) {
      await pool.query(
        `INSERT INTO app_chat_messages (session_id, role, content) VALUES ($1, 'assistant', $2)`,
        [sessionId, assistantText],
      )
    }
  } catch {}
}

