import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@vercel/postgres'
import { v4 as uuidv4 } from 'uuid'

interface Message {
  id: string
  content: string
  isUser: boolean
  timestamp: string
}

export async function POST(request: NextRequest) {
  try {
    const { conversationId, messages, title, userId } = await request.json()

    if (!conversationId || !messages || !userId) {
      return NextResponse.json(
        { error: 'conversationId, messages, and userId are required' },
        { status: 400 }
      )
    }

    // Check if conversation exists
    const existingConv = await sql`
      SELECT id FROM conversations WHERE id = ${conversationId}
    `

    if (existingConv.rows.length === 0) {
      // Create new conversation
      await sql`
        INSERT INTO conversations (id, user_id, title, created_at, last_active)
        VALUES (${conversationId}, ${userId}, ${title || 'Hội thoại mới'}, NOW(), NOW())
      `
    } else {
      // Update existing conversation title and last_active
      await sql`
        UPDATE conversations 
        SET title = ${title || 'Hội thoại'}, last_active = NOW()
        WHERE id = ${conversationId}
      `
    }

    // Delete old messages for this conversation
    await sql`DELETE FROM conversation_messages WHERE conv_id = ${conversationId}`

    // Insert all messages
    for (const msg of messages) {
      await sql`
        INSERT INTO conversation_messages (conv_id, role, content, created_at)
        VALUES (
          ${conversationId},
          ${msg.isUser ? 'user' : 'assistant'},
          ${msg.content},
          ${msg.timestamp || new Date().toISOString()}
        )
      `
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
  }
}
