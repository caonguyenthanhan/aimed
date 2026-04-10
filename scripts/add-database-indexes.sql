-- Database Index Optimization for Neon
-- Adds indexes to improve query performance for conversations and messages

-- 1. Index on conversations table for user lookups
CREATE INDEX IF NOT EXISTS idx_conversations_user_id_created 
ON conversations(user_id, created_at DESC);

-- 2. Index on conversations for last_active queries (recent chats)
CREATE INDEX IF NOT EXISTS idx_conversations_last_active 
ON conversations(last_active DESC);

-- 3. Composite index for user's recent conversations
CREATE INDEX IF NOT EXISTS idx_conversations_user_last_active 
ON conversations(user_id, last_active DESC);

-- 4. Index on conversation_messages for message lookups by conversation
CREATE INDEX IF NOT EXISTS idx_conversation_messages_conv_id 
ON conversation_messages(conv_id, created_at ASC);

-- 5. Index for message queries with ordering
CREATE INDEX IF NOT EXISTS idx_conversation_messages_conv_created 
ON conversation_messages(conv_id, created_at DESC);

-- 6. Index for finding latest messages in conversation
CREATE INDEX IF NOT EXISTS idx_conversation_messages_conv_recent 
ON conversation_messages(conv_id, created_at DESC NULLS LAST);

-- 7. If users table exists, add index for auth lookups
CREATE INDEX IF NOT EXISTS idx_users_email 
ON users(email) WHERE email IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_users_created 
ON users(created_at DESC);

-- 8. Vacuum and analyze to update statistics
VACUUM ANALYZE conversations;
VACUUM ANALYZE conversation_messages;
VACUUM ANALYZE users;
