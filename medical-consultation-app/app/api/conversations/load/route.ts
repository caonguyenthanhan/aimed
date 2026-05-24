import { NextRequest, NextResponse } from 'next/server'
import { getConversationTitle, getConversationMessages } from '@/lib/db-queries'
import { resolveDatabaseConfig, withPgClientRetry } from '@/lib/pg'

async function loadConversation(conversationId: string, limit: number, offset: number) {
  const started = Date.now()
  try {
    const { url: dbUrl, source } = resolveDatabaseConfig()
    if (!dbUrl) {
      return NextResponse.json({ success: false, skipped: true, reason: 'database_not_configured', metadata: { source } }, { status: 200 })
    }

    if (!conversationId) {
      return NextResponse.json({ success: false, skipped: true, reason: 'missing_conversation_id' }, { status: 200 })
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
    })
    if (!out.value.conv) {
      return NextResponse.json({ success: false, skipped: true, reason: 'conversation_not_found', metadata: { source, attempts: out.attempts, elapsed_ms: out.elapsed_ms, latency_ms: Date.now() - started } }, { status: 200 })
    }
    return NextResponse.json({ conversation: out.value.conv, messages: out.value.messages, metadata: { source, attempts: out.attempts, elapsed_ms: out.elapsed_ms, latency_ms: Date.now() - started } })
  } catch (error) {
    console.error('[v0] Error loading conversation:', error)
    return NextResponse.json(
      { success: false, skipped: true, reason: 'internal_error', metadata: { latency_ms: Date.now() - started } },
      { status: 200 }
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
