import { NextRequest, NextResponse } from 'next/server'
import { Client } from 'pg'
import crypto from 'crypto'

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
    const { userId, since } = await request.json()

    if (!userId) {
      return NextResponse.json({ error: 'userId required' }, { status: 400 })
    }

    client = await getDbClient()
    const userUUID = tokenToUUID(userId)
    const sinceTime = new Date(since || 0)

    const changes = []

    // Get new conversations since last sync
    const newConvs = await client.query(`
      SELECT 
        id,
        title,
        created_at
      FROM conversations
      WHERE user_id = $1::uuid
      AND created_at > $2
      ORDER BY created_at DESC
      LIMIT 50
    `, [userUUID, sinceTime])

    newConvs.rows.forEach(conv => {
      changes.push({
        type: 'conversation-created',
        timestamp: new Date(conv.created_at).getTime(),
        data: conv,
      })
    })

    // Get new messages in user's conversations since last sync
    const newMsgs = await client.query(`
      SELECT 
        m.id,
        m.conv_id,
        m.role,
        m.content,
        m.created_at,
        c.title
      FROM conversation_messages m
      JOIN conversations c ON m.conv_id = c.id
      WHERE c.user_id = $1::uuid
      AND m.created_at > $2
      ORDER BY m.created_at DESC
      LIMIT 100
    `, [userUUID, sinceTime])

    newMsgs.rows.forEach(msg => {
      changes.push({
        type: 'message-added',
        timestamp: new Date(msg.created_at).getTime(),
        data: {
          id: msg.id,
          conversationId: msg.conv_id,
          role: msg.role,
          content: msg.content,
          conversationTitle: msg.title,
        },
      })
    })

    // Sort by timestamp descending (most recent first)
    changes.sort((a, b) => b.timestamp - a.timestamp)

    return NextResponse.json({ changes: changes.slice(0, 50) })
  } catch (error) {
    console.error('[v0] Sync error:', error)
    return NextResponse.json(
      { error: 'Sync failed', changes: [] },
      { status: 500 }
    )
  } finally {
    if (client) await client.end()
  }
}
