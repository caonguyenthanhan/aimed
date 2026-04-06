import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@vercel/postgres'

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json()
    
    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      )
    }

    // Get all conversations for user, ordered by last_active DESC
    const result = await sql`
      SELECT 
        id,
        title,
        created_at,
        last_active
      FROM conversations
      WHERE user_id = ${userId}
      ORDER BY last_active DESC
      LIMIT 100
    `

    return NextResponse.json({ conversations: result.rows })
  } catch (error) {
    console.error('[v0] Error fetching conversations:', error)
    return NextResponse.json(
      { error: 'Failed to fetch conversations' },
      { status: 500 }
    )
  }
}
