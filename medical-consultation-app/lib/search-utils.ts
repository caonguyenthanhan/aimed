// Message search utilities
export interface SearchResult {
  messageId: string
  conversationId: string
  content: string
  role: 'user' | 'assistant'
  timestamp: Date
  matchIndices: number[]
}

export function searchMessages(
  messages: Array<{ id: string; content: string; role: 'user' | 'assistant'; timestamp: Date }>,
  conversationId: string,
  query: string
): SearchResult[] {
  if (!query.trim()) return []
  
  const normalizedQuery = query.toLowerCase()
  const results: SearchResult[] = []
  
  messages.forEach(message => {
    const normalizedContent = message.content.toLowerCase()
    if (normalizedContent.includes(normalizedQuery)) {
      const matchIndices: number[] = []
      let idx = 0
      while ((idx = normalizedContent.indexOf(normalizedQuery, idx)) !== -1) {
        matchIndices.push(idx)
        idx += normalizedQuery.length
      }
      
      results.push({
        messageId: message.id,
        conversationId,
        content: message.content,
        role: message.role,
        timestamp: message.timestamp,
        matchIndices,
      })
    }
  })
  
  return results
}

// Highlight search results
export function highlightSearchQuery(text: string, query: string): string {
  if (!query.trim()) return text
  
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
  return text.replace(regex, '<mark>$1</mark>')
}

// Search across multiple conversations
export interface ConversationSearchResult {
  conversationId: string
  title: string
  results: SearchResult[]
}

export function searchConversations(
  conversations: Array<{ id: string; title: string; messages: SearchResult['role'][]; timestamp: Date }>,
  messages: Record<string, SearchResult[]>,
  query: string
): ConversationSearchResult[] {
  return conversations
    .map(conv => ({
      conversationId: conv.id,
      title: conv.title,
      results: messages[conv.id] || [],
    }))
    .filter(result => result.results.length > 0)
    .sort((a, b) => b.results.length - a.results.length)
}

// Fuzzy search for better UX
export function fuzzySearch(text: string, query: string): number {
  const normalizedText = text.toLowerCase()
  const normalizedQuery = query.toLowerCase()
  
  if (normalizedText === normalizedQuery) return 100
  if (normalizedText.includes(normalizedQuery)) return 80
  
  let score = 0
  let textIdx = 0
  let queryIdx = 0
  
  while (queryIdx < normalizedQuery.length && textIdx < normalizedText.length) {
    if (normalizedQuery[queryIdx] === normalizedText[textIdx]) {
      score += 1
      queryIdx++
    }
    textIdx++
  }
  
  return queryIdx === normalizedQuery.length ? Math.round((score / normalizedQuery.length) * 60) : 0
}
