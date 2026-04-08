import { NextRequest, NextResponse } from 'next/server'
import { Client } from 'pg'
import crypto from 'crypto'

// Convert token string to consistent UUID using namespace hash
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

    // Check if conversation exists
    const existingConv = await client.query(
      'SELECT id FROM conversations WHERE id = $1',
      [conversationId]
    )

    if (existingConv.rows.length === 0) {
      // Create new conversation with converted UUID
      await client.query(
        'INSERT INTO conversations (id, user_id, title, created_at, last_active) VALUES ($1, $2::uuid, $3, NOW(), NOW())',
        [conversationId, userUUID, title || 'Hội thoại mới']
      )
    } else {
      // Update existing conversation title and last_active
      await client.query(
        'UPDATE conversations SET title = $1, last_active = NOW() WHERE id = $2',
        [title || 'Hội thoại', conversationId]
      )
    }

    // Delete old messages for this conversation
    await client.query('DELETE FROM conversation_messages WHERE conv_id = $1', [conversationId])

    // Insert all messages
    for (const msg of messages) {
      await client.query(
        'INSERT INTO conversation_messages (conv_id, role, content, created_at) VALUES ($1, $2, $3, $4)',
        [
          conversationId,
          msg.isUser ? 'user' : 'assistant',
          msg.content,
          msg.timestamp || new Date().toISOString()
        ]
      )
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
