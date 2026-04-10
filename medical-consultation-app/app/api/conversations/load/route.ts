import { NextRequest, NextResponse } from 'next/server'
import { Client } from 'pg'
import { getConversationTitle, getConversationMessages } from '@/lib/db-queries'

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
    const { conversationId, limit = 1000, offset = 0 } = await request.json()

    if (!conversationId) {
      return NextResponse.json(
        { error: 'conversationId is required' },
        { status: 400 }
      )
    }

    client = await getDbClient()

    // Get conversation metadata using optimized query
    const { row: conv, error: convError } = await getConversationTitle(client, conversationId)
    if (convError || !conv) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      )
    }

    // Get messages using optimized query with index
    const { rows: messages, error: msgError } = await getConversationMessages(
      client,
      conversationId,
      Math.min(limit, 1000),
      offset
    )
    if (msgError) throw msgError

    // Map database messages to app format
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
  } catch (error) {
    console.error('[v0] Error loading conversation:', error)
    return NextResponse.json(
      { error: 'Failed to load conversation' },
      { status: 500 }
    )
  } finally {
    if (client) await client.end()
  }
}
