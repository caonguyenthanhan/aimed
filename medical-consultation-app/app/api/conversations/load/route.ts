import { NextRequest, NextResponse } from 'next/server'
import { getConversationTitle, getConversationMessages } from '@/lib/db-queries'
import { resolveDatabaseUrl, withPgClient } from '@/lib/pg'

async function loadConversation(conversationId: string, limit: number, offset: number) {
  try {
    const dbUrl = resolveDatabaseUrl()
    if (!dbUrl) {
      return NextResponse.json({ success: false, skipped: true, reason: 'database_not_configured' }, { status: 200 })
    }

    if (!conversationId) {
      return NextResponse.json({ success: false, skipped: true, reason: 'missing_conversation_id' }, { status: 200 })
    }

    return await withPgClient(async (client) => {
      const { row: conv, error: convError } = await getConversationTitle(client, conversationId)
      if (convError || !conv) {
        return NextResponse.json(
          { success: false, skipped: true, reason: 'conversation_not_found' },
          { status: 200 }
        )
      }

      const { rows: messages, error: msgError } = await getConversationMessages(
        client,
        conversationId,
        Math.min(limit, 1000),
        offset
      )
      if (msgError) throw msgError

      const mappedMessages = messages.map(msg => ({
        id: String(msg.id),
        content: msg.content,
        isUser: msg.role === 'user',
        timestamp: new Date(msg.created_at),
      }))

      return NextResponse.json({
        conversation: conv,
        messages: mappedMessages,
      })
    })
  } catch (error) {
    console.error('[v0] Error loading conversation:', error)
    return NextResponse.json(
      { success: false, skipped: true, reason: 'internal_error' },
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
