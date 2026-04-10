import { NextRequest, NextResponse } from 'next/server'
import { Client } from 'pg'
import crypto from 'crypto'
import { upsertConversation, insertMessage } from '@/lib/db-queries'

// Convert token string to consistent UUID
function tokenToUUID(token: string): string {
  const hash = crypto.createHash('sha256').update(token).digest()
  return `${hash.toString('hex', 0, 4)}-${hash.toString('hex', 4, 6)}-${hash.toString('hex', 6, 8)}-${hash.toString('hex', 8, 10)}-${hash.toString('hex', 10, 16)}`
}

interface Message {
  id: string
  content: string
  isUser: boolean
  timestamp: string
}

async function getDbClient() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  })
  await client.connect()
  return client
}

export async function POST(request: NextRequest) {
  let client
  try {
    const { conversationId, messages, title, userId } = await request.json()

    if (!conversationId || !messages || !userId) {
      return NextResponse.json(
        { error: 'conversationId, messages, and userId are required' },
        { status: 400 }
      )
    }

    client = await getDbClient()
    const userUUID = tokenToUUID(userId)

    // Upsert conversation using optimized query
    const { success: convSuccess, error: convError } = await upsertConversation(
      client,
      conversationId,
      userUUID,
      title || 'Hội thoại mới'
    )
    if (convError) throw convError

    // Delete old messages for this conversation
    await client.query('DELETE FROM conversation_messages WHERE conv_id = $1', [conversationId])

    // Batch insert all messages using optimized query
    for (const msg of messages) {
      const { error: msgError } = await insertMessage(
        client,
        conversationId,
        msg.isUser ? 'user' : 'assistant',
        msg.content
      )
      if (msgError) throw msgError
    }

    return NextResponse.json({ 
      success: true, 
      conversationId 
    })
  } catch (error) {
    console.error('[v0] Error saving conversation:', error)
    return NextResponse.json(
      { error: 'Failed to save conversation' },
      { status: 500 }
    )
  } finally {
    if (client) await client.end()
  }
}
