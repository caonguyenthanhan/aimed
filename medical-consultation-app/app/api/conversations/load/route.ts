import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@vercel/postgres'

export async function GET(request: NextRequest) {
  try {
    const conversationId = request.nextUrl.searchParams.get('conversationId')

    if (!conversationId) {
      return NextResponse.json(
        { error: 'conversationId is required' },
        { status: 400 }
      )
    }

    // Get conversation metadata
    const convResult = await sql`
      SELECT id, title, created_at, last_active
      FROM conversations
      WHERE id = ${conversationId}
    `

    if (convResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      )
    }

    // Get all messages for this conversation
    const messagesResult = await sql`
      SELECT 
        id,
        role,
        content,
        created_at
      FROM conversation_messages
      WHERE conv_id = ${conversationId}
      ORDER BY created_at ASC
    `

    // Map database messages to app format
    const messages = messagesResult.rows.map(msg => ({
      id: String(msg.id),
      content: msg.content,
      isUser: msg.role === 'user',
      timestamp: new Date(msg.created_at),
    }))

    return NextResponse.json({
      conversation: convResult.rows[0],
      messages,
    })
  } catch (error) {
    console.error('[v0] Error loading conversation:', error)
    return NextResponse.json(
      { error: 'Failed to load conversation' },
      { status: 500 }
    )
  }
}
