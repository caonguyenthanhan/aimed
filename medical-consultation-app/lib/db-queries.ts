import { Client } from 'pg'

/**
 * Optimized database queries with proper indexing support
 * Uses indexes created in add-database-indexes.sql
 */

// Cache for prepared statements
const stmtCache = new Map<string, string>()

export async function getConversationsList(
  client: Client,
  userUUID: string,
  limit: number = 100,
  offset: number = 0
) {
  // Uses: idx_conversations_user_last_active index
  const query = `
    SELECT 
      id,
      title,
      created_at,
      last_active
    FROM conversations
    WHERE user_id = $1::uuid
    ORDER BY last_active DESC NULLS LAST
    LIMIT $2 OFFSET $3
  `
  
  try {
    const result = await client.query(query, [userUUID, limit, offset])
    return { rows: result.rows, error: null }
  } catch (error) {
    return { rows: [], error }
  }
}

export async function getConversationMessages(
  client: Client,
  conversationId: string,
  limit: number = 1000,
  offset: number = 0
) {
  // Uses: idx_conversation_messages_conv_created index
  const query = `
    SELECT 
      id,
      role,
      content,
      created_at
    FROM conversation_messages
    WHERE conv_id = $1
    ORDER BY created_at ASC
    LIMIT $2 OFFSET $3
  `
  
  try {
    const result = await client.query(query, [conversationId, limit, offset])
    return { rows: result.rows, error: null }
  } catch (error) {
    return { rows: [], error }
  }
}

export async function getConversationTitle(
  client: Client,
  conversationId: string
) {
  const query = `
    SELECT title, last_active
    FROM conversations
    WHERE id = $1
  `
  
  try {
    const result = await client.query(query, [conversationId])
    return { row: result.rows[0] || null, error: null }
  } catch (error) {
    return { row: null, error }
  }
}

export async function upsertConversation(
  client: Client,
  conversationId: string,
  userUUID: string,
  title: string
) {
  // Insert or update with minimal round trips
  const query = `
    INSERT INTO conversations (id, user_id, title, created_at, last_active)
    VALUES ($1, $2::uuid, $3, NOW(), NOW())
    ON CONFLICT (id) DO UPDATE
    SET title = EXCLUDED.title, last_active = NOW()
    RETURNING id
  `
  
  try {
    const result = await client.query(query, [conversationId, userUUID, title])
    return { success: true, error: null }
  } catch (error) {
    return { success: false, error }
  }
}

export async function insertMessage(
  client: Client,
  conversationId: string,
  role: 'user' | 'assistant',
  content: string
) {
  const query = `
    INSERT INTO conversation_messages (conv_id, role, content, created_at)
    VALUES ($1, $2, $3, NOW())
    RETURNING id
  `
  
  try {
    const result = await client.query(query, [conversationId, role, content])
    return { id: result.rows[0]?.id, error: null }
  } catch (error) {
    return { id: null, error }
  }
}

export async function deleteOldMessages(
  client: Client,
  conversationId: string
) {
  const query = `
    DELETE FROM conversation_messages
    WHERE conv_id = $1
    AND created_at < NOW() - INTERVAL '365 days'
  `
  
  try {
    const result = await client.query(query, [conversationId])
    return { deletedCount: result.rowCount || 0, error: null }
  } catch (error) {
    return { deletedCount: 0, error }
  }
}

export async function getConversationStats(
  client: Client,
  userUUID: string
) {
  // Efficient stats query
  const query = `
    SELECT 
      COUNT(DISTINCT c.id) as total_conversations,
      COUNT(m.id) as total_messages,
      MAX(c.last_active) as last_activity
    FROM conversations c
    LEFT JOIN conversation_messages m ON c.id = m.conv_id
    WHERE c.user_id = $1::uuid
  `
  
  try {
    const result = await client.query(query, [userUUID])
    return { stats: result.rows[0], error: null }
  } catch (error) {
    return { stats: null, error }
  }
}
