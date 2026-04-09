import { NextRequest, NextResponse } from 'next/server'
import { Client } from 'pg'
import crypto from 'crypto'
import { getConversationsList } from '@/lib/db-queries'

// Convert token string to consistent UUID
function tokenToUUID(token: string): string {
  const hash = crypto.createHash('sha256').update(token).digest()
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
    const { userId, limit = 100, offset = 0 } = await request.json()
    
    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      )
    }

    client = await getDbClient()
    const userUUID = tokenToUUID(userId)

    // Use optimized query with indexes
    const { rows, error } = await getConversationsList(
      client,
      userUUID,
      Math.min(limit, 100),
      offset
    )

    if (error) throw error

    return NextResponse.json({ conversations: rows })
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
