import { NextRequest, NextResponse } from 'next/server'
import { Client } from 'pg'
import crypto from 'crypto'

// Convert token string to consistent UUID using namespace hash
function tokenToUUID(token: string): string {
  const hash = crypto.createHash('sha256').update(token).digest()
  // Create UUID v5-like format from hash
  return `${hash.toString('hex', 0, 4)}-${hash.toString('hex', 4, 6)}-${hash.toString('hex', 6, 8)}-${hash.toString('hex', 8, 10)}-${hash.toString('hex', 10, 16)}`
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
    const { userId } = await request.json()
    
    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      )
    }

    client = await getDbClient()
    const userUUID = tokenToUUID(userId)

    // Get all conversations for user, ordered by last_active DESC
    const result = await client.query(`
      SELECT 
        id,
        title,
        created_at,
        last_active
      FROM conversations
      WHERE user_id = $1::uuid
      ORDER BY last_active DESC
      LIMIT 100
    `, [userUUID])

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
