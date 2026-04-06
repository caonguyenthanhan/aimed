import { NextRequest, NextResponse } from 'next/server'
import { Client } from 'pg'

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
    const { userId } = await request.json()
    
    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      )
    }

    client = await getDbClient()

    // Get all conversations for user, ordered by last_active DESC
    const result = await client.query(`
      SELECT 
        id,
        title,
        created_at,
        last_active
      FROM conversations
      WHERE user_id = $1
      ORDER BY last_active DESC
      LIMIT 100
    `, [userId])

    return NextResponse.json({ conversations: result.rows })
  } catch (error) {
    console.error('[v0] Error fetching conversations:', error)
    return NextResponse.json(
      { error: 'Failed to fetch conversations' },
      { status: 500 }
    )
  } finally {
    if (client) await client.end()
  }
}
