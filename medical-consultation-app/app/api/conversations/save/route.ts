import { NextRequest, NextResponse } from 'next/server'
import { Client } from 'pg'
import crypto from 'crypto'
import { upsertConversation, insertMessage } from '@/lib/db-queries'

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

interface Message {
  id: string
  content: string
  isUser: boolean
  timestamp: string
}

async function getDbClient() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not set')
  }
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  })
  await client.connect()
  return client
}

export async function POST(request: NextRequest) {
  let client
  try {
    let body: any
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const conversationId =
      typeof body?.conversationId === 'string' ? body.conversationId.trim() : ''
    const userId = typeof body?.userId === 'string' ? body.userId.trim() : ''
    const title = typeof body?.title === 'string' ? body.title : undefined
    const messages = Array.isArray(body?.messages) ? body.messages : null

    if (!conversationId || !userId || !messages) {
      return NextResponse.json(
        { error: 'conversationId, messages, and userId are required' },
        { status: 400 }
      )
    }

    if (!process.env.DATABASE_URL) {
      return NextResponse.json(
        { success: false, skipped: true, reason: 'database_not_configured', conversationId },
        { status: 200 }
      )
    }

    client = await getDbClient()
    const userUUID = normalizeUserUUID(userId)

    await client.query('BEGIN')

    const { error: convError } = await upsertConversation(
      client,
      conversationId,
      userUUID,
      title || 'Hội thoại mới'
    )
    if (convError) throw convError

    await client.query('DELETE FROM conversation_messages WHERE conv_id = $1', [conversationId])

    for (const msg of messages) {
      if (!msg || typeof msg.content !== 'string') continue
      const { error: msgError } = await insertMessage(
        client,
        conversationId,
        msg.isUser ? 'user' : 'assistant',
        msg.content
      )
      if (msgError) throw msgError
    }

    await client.query('COMMIT')

    return NextResponse.json({ 
      success: true, 
      conversationId 
    })
  } catch (error) {
    try {
      await client?.query('ROLLBACK')
    } catch {}

    const code =
      error && typeof error === 'object' && 'code' in error
        ? (error as any).code
        : undefined
    if (code === '22P02') {
      return NextResponse.json(
        { error: 'Invalid conversationId/userId format' },
        { status: 400 }
      )
    }
    console.error('[v0] Error saving conversation:', error)
    return NextResponse.json(
      { error: 'Failed to save conversation' },
      { status: 500 }
    )
  } finally {
    if (client) await client.end()
  }
}
