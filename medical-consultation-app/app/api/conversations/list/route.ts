import { NextRequest, NextResponse } from 'next/server'
import { Client } from 'pg'
import crypto from 'crypto'
import { getConversationsList } from '@/lib/db-queries'

// Convert token string to consistent UUID
function tokenToUUID(token: string): string {
  const hash = crypto.createHash('sha256').update(token).digest()
  return `${hash.toString('hex', 0, 4)}-${hash.toString('hex', 4, 6)}-${hash.toString('hex', 6, 8)}-${hash.toString('hex', 8, 10)}-${hash.toString('hex', 10, 16)}`
}

const UUID_LIKE_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function normalizeUserUUID(userId: string): string {
  const v = String(userId || '').trim()
  if (!v) return ''
  return UUID_LIKE_RE.test(v) ? v : tokenToUUID(v)
}

async function getDbClient() {
  const dbUrl = String(process.env.DATABASE_URL || '').trim()
  if (!dbUrl) {
    throw new Error('DATABASE_URL is not set')
  }
  const client = new Client({
    connectionString: dbUrl,
  })
  await client.connect()
  return client
}

async function listConversations(userId: string, limit: number, offset: number) {
  let client
  try {
    const dbUrl = String(process.env.DATABASE_URL || '').trim()
    if (!dbUrl) {
      return NextResponse.json({ conversations: [], success: false, skipped: true, reason: 'database_not_configured' }, { status: 200 })
    }

    if (!userId) {
      return NextResponse.json(
        { conversations: [], success: false, skipped: true, reason: 'missing_user_id' },
        { status: 200 }
      )
    }

    client = await getDbClient()
    const userUUID = normalizeUserUUID(userId)

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
      { conversations: [], success: false, skipped: true, reason: 'internal_error' },
      { status: 200 }
    )
  } finally {
    if (client) await client.end()
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null)
  const userId = typeof body?.userId === 'string' ? body.userId : ''
  const limit = typeof body?.limit === 'number' ? body.limit : 100
  const offset = typeof body?.offset === 'number' ? body.offset : 0
  return listConversations(userId, limit, offset)
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const userId = url.searchParams.get('userId') || ''
  const limit = Number(url.searchParams.get('limit') || '100')
  const offset = Number(url.searchParams.get('offset') || '0')
  return listConversations(
    userId,
    Number.isFinite(limit) ? limit : 100,
    Number.isFinite(offset) ? offset : 0
  )
}
