import { NextRequest, NextResponse } from 'next/server'
import { getConversationTitle, getConversationMessages } from '@/lib/db-queries'
import { resolveDatabaseConfig, withPgClientRetry } from '@/lib/pg'

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

async function loadConversation(conversationId: string, limit: number, offset: number) {
  const started = Date.now()
  const { url: dbUrl, source } = resolveDatabaseConfig()
  try {
    if (!dbUrl) {
      return json({ success: false, skipped: true, reason: 'database_not_configured', metadata: { source } }, { status: 200 })
    }

    if (!conversationId) {
      return json({ success: false, skipped: true, reason: 'missing_conversation_id' }, { status: 200 })
    }

    const out = await withPgClientRetry(async (client) => {
      const { row: conv, error: convError } = await getConversationTitle(client, conversationId)
      if (convError || !conv) return { conv: null as any, messages: [] as any[] }
      const { rows: messages, error: msgError } = await getConversationMessages(client, conversationId, Math.min(limit, 1000), offset)
      if (msgError) throw msgError
      const mappedMessages = (messages || []).map((msg: any) => ({
        id: String(msg.id),
        content: msg.content,
        isUser: msg.role === 'user',
        timestamp: new Date(msg.created_at),
      }))
      return { conv, messages: mappedMessages }
    }, { attempts: 3, baseDelayMs: 250 })
    if (!out.value.conv) {
      return json({ success: false, skipped: true, reason: 'conversation_not_found', metadata: { source, attempts: out.attempts, elapsed_ms: out.elapsed_ms, latency_ms: Date.now() - started } }, { status: 200 })
    }
    return json({ conversation: out.value.conv, messages: out.value.messages, metadata: { source, attempts: out.attempts, elapsed_ms: out.elapsed_ms, latency_ms: Date.now() - started } })
  } catch (error) {
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

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null)
  const conversationId =
    typeof body?.conversationId === 'string' ? body.conversationId : ''
  const limit = typeof body?.limit === 'number' ? body.limit : 1000
  const offset = typeof body?.offset === 'number' ? body.offset : 0
  return loadConversation(conversationId, limit, offset)
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const conversationId = url.searchParams.get('conversationId') || ''
  const limit = Number(url.searchParams.get('limit') || '1000')
  const offset = Number(url.searchParams.get('offset') || '0')
  return loadConversation(
    conversationId,
    Number.isFinite(limit) ? limit : 1000,
    Number.isFinite(offset) ? offset : 0
  )
}
