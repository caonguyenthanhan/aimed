import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { upsertConversation, insertMessage } from '@/lib/db-queries'
import { resolveDatabaseConfig, withPgClientRetry } from '@/lib/pg'

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
  try {
    const { url: dbUrl, source } = resolveDatabaseConfig()
    if (!dbUrl) {
      return NextResponse.json({ success: false, skipped: true, reason: 'database_not_configured', metadata: { source } }, { status: 200 })
    }

    let body: any
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ success: false, skipped: true, reason: 'invalid_json' }, { status: 200 })
    }

    const conversationId =
      typeof body?.conversationId === 'string' ? body.conversationId.trim() : ''
    const userId = typeof body?.userId === 'string' ? body.userId.trim() : ''
    const title = typeof body?.title === 'string' ? body.title : undefined
    const messages = Array.isArray(body?.messages) ? body.messages : null

    if (!conversationId || !userId || !messages) {
      return NextResponse.json(
        { success: false, skipped: true, reason: 'missing_fields', conversationId: conversationId || undefined },
        { status: 200 }
      )
    }

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
    })

    return NextResponse.json({ 
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
      return NextResponse.json(
        { success: false, skipped: true, reason: 'invalid_id_format' },
        { status: 200 }
      )
    }
    console.error('[v0] Error saving conversation:', error)
    return NextResponse.json(
      { success: false, skipped: true, reason: 'internal_error', metadata: { latency_ms: Date.now() - started } },
      { status: 200 }
    )
  }
}
