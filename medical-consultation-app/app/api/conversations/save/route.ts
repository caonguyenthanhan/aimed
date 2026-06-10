import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { upsertConversation, insertMessage } from '@/lib/db-queries'
import { resolveDatabaseConfig, withPgClientRetry } from '@/lib/pg'
import { conversationListCache } from '@/lib/cache'
import { parseBody, SaveConversationSchema } from '@/lib/api-schemas'

const toHeaderRecord = (headers?: HeadersInit): Record<string, string> => {
  if (!headers) return {}
  if (headers instanceof Headers) {
    const out: Record<string, string> = {}
    headers.forEach((v, k) => (out[k] = v))
    return out
  }
  if (Array.isArray(headers)) return Object.fromEntries(headers)
  return { ...(headers as Record<string, string>) }
}

const json = (data: any, init?: ResponseInit) =>
  NextResponse.json(data, {
    ...(init || {}),
    headers: {
      ...toHeaderRecord(init?.headers),
      "Content-Type": "application/json; charset=utf-8",
    },
  })

// Convert token string to consistent UUID
function tokenToUUID(token: string): string {
  const hash = crypto.createHash('sha256').update(token).digest()
  return `${hash.toString('hex', 0, 4)}-${hash.toString('hex', 4, 6)}-${hash.toString('hex', 6, 8)}-${hash.toString('hex', 8, 10)}-${hash.toString('hex', 10, 16)}`
}

const UUID_LIKE_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function normalizeUserUUID(userId: string): string {
  const v = String(userId || '').trim()
  if (!v) return ''
  return UUID_LIKE_RE.test(v) ? v : tokenToUUID(v)
}

export async function POST(request: NextRequest) {
  const started = Date.now()
  const { url: dbUrl, source } = resolveDatabaseConfig()
  try {
    if (!dbUrl) {
      return json({ success: false, skipped: true, reason: 'database_not_configured', metadata: { source } }, { status: 200 })
    }

    const { data: body, error: validationError } = await parseBody(request, SaveConversationSchema)
    if (validationError) return validationError

    const { conversationId, userId, title, messages } = body

    const userUUID = normalizeUserUUID(userId)
    const out = await withPgClientRetry(async (client) => {
      await client.query('BEGIN')
      try {
        const { error: convError } = await upsertConversation(client, conversationId, userUUID, title || 'Hội thoại mới')
        if (convError) throw convError

        await client.query('DELETE FROM conversation_messages WHERE conv_id = $1', [conversationId])

        for (const msg of messages) {
          if (!msg || typeof msg.content !== 'string') continue
          const { error: msgError } = await insertMessage(client, conversationId, msg.isUser ? 'user' : 'assistant', msg.content)
          if (msgError) throw msgError
        }

        await client.query('COMMIT')
        return true
      } catch (e) {
        try {
          await client.query('ROLLBACK')
        } catch {}
        throw e
      }
    }, { attempts: 3, baseDelayMs: 250 })

    // WHY: invalidate conversation list cache after save so next list request gets fresh data
    conversationListCache.invalidatePrefix(`convs:${userId}:`)

    return json({
      success: true,
      conversationId,
      metadata: { source, attempts: out.attempts, elapsed_ms: out.elapsed_ms, latency_ms: Date.now() - started },
    })
  } catch (error) {
    const code =
      error && typeof error === 'object' && 'code' in error
        ? (error as any).code
        : undefined
    if (code === '22P02') {
      return json(
        { success: false, skipped: true, reason: 'invalid_id_format', metadata: { source } },
        { status: 200 }
      )
    }
    const retry_attempts =
      error && typeof error === "object" && "__pg_retry_attempts" in (error as any) ? (error as any).__pg_retry_attempts : undefined
    const retry_elapsed_ms =
      error && typeof error === "object" && "__pg_retry_elapsed_ms" in (error as any) ? (error as any).__pg_retry_elapsed_ms : undefined
    return json(
      {
        success: false,
        skipped: true,
        reason: "db_unavailable",
        metadata: {
          source,
          latency_ms: Date.now() - started,
          retry_attempts,
          retry_elapsed_ms,
          error: String((error as any)?.message || "db_error"),
        },
      },
      { status: 200 },
    )
  }
}
