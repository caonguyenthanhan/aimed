import { v4 as uuidv4 } from 'uuid'

export interface Message {
  id: string
  content: string
  isUser: boolean
  timestamp: Date
}

export interface Conversation {
  id: string
  title: string
  created_at: string
  last_active: string
}

/**
 * Sync chat messages to Neon database
 * Called periodically or after new messages
 */
export async function syncMessagesToDatabase(
  conversationId: string,
  messages: Message[],
  title: string,
  userId: string
) {
  try {
    const response = await fetch('/api/conversations/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        conversationId,
        messages: messages.map(m => ({
          ...m,
          timestamp: m.timestamp.toISOString(),
        })),
        title,
        userId,
      }),
    })

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`)
    }

    console.log('[v0] Messages synced to database')
    return await response.json()
  } catch (error) {
    console.error('[v0] Failed to sync messages:', error)
    // Don't throw - let app continue working offline
    return null
  }
}

/**
 * Load conversation from Neon database
 */
export async function loadConversationFromDatabase(
  conversationId: string
): Promise<{ conversation: Conversation; messages: Message[] } | null> {
  try {
    const response = await fetch(
      `/api/conversations/load?conversationId=${conversationId}`
    )

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`)
    }

    const data = await response.json()
    return {
      conversation: data.conversation,
      messages: data.messages.map((m: any) => ({
        ...m,
        timestamp: new Date(m.timestamp),
      })),
    }
  } catch (error) {
    console.error('[v0] Failed to load conversation:', error)
    return null
  }
}

/**
 * List all conversations from Neon database
 */
export async function listConversationsFromDatabase(
  userId: string
): Promise<Conversation[] | null> {
  try {
    const response = await fetch(
      `/api/conversations/list?userId=${userId}`
    )

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`)
    }

    const data = await response.json()
    return data.conversations
  } catch (error) {
    console.error('[v0] Failed to list conversations:', error)
    return null
  }
}

/**
 * Fallback: Load conversations from localStorage if database unavailable
 */
export function loadConversationsFromLocalStorage(): Conversation[] {
  if (typeof window === 'undefined') return []

  try {
    const items: Conversation[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i) || ''
      if (key.startsWith('conv_messages_')) {
        const id = key.slice('conv_messages_'.length)
        const title = localStorage.getItem(`conv_title_${id}`) || 'Hội thoại'
        const raw = localStorage.getItem(`conv_messages_${id}`)

        if (raw) {
          try {
            const arr = JSON.parse(raw)
            const lastActive =
              Array.isArray(arr) && arr.length
                ? new Date(arr[arr.length - 1].timestamp).toISOString()
                : new Date().toISOString()
            items.push({
              id,
              title,
              created_at: new Date().toISOString(),
              last_active: lastActive,
            })
          } catch {}
        }
      }
    }
    items.sort((a, b) =>
      a.last_active > b.last_active ? -1 : 1
    )
    return items
  } catch {
    return []
  }
}

/**
 * Fallback: Load messages from localStorage if database unavailable
 */
export function loadMessagesFromLocalStorage(
  conversationId: string
): Message[] {
  if (typeof window === 'undefined') return []

  try {
    const raw = localStorage.getItem(`conv_messages_${conversationId}`)
    if (!raw) return []

    const arr = JSON.parse(raw)
    return arr.map((m: any) => ({
      ...m,
      timestamp: new Date(m.timestamp),
    }))
  } catch {
    return []
  }
}
