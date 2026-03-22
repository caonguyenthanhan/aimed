import { useState, useCallback } from 'react'
import type { Agent } from '@/lib/agent-registry'

interface AgentSuggestion {
  id: string
  agent: Agent
  reason: string
}

/**
 * Hook for managing agent suggestions in chat
 * Quản lý đề xuất agent trong cuộc trò chuyện
 */
export function useAgentSuggestions() {
  const [suggestions, setSuggestions] = useState<AgentSuggestion[]>([])
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null)
  const [loading, setLoading] = useState(false)

  // Get available agents
  const getAvailableAgents = useCallback(async (embeddableOnly: boolean = false) => {
    try {
      setLoading(true)
      const query = embeddableOnly ? '?embeddable=true' : ''
      const response = await fetch(`/api/agents${query}`)

      if (!response.ok) {
        throw new Error('Failed to fetch agents')
      }

      return await response.json()
    } catch (error) {
      console.error('[useAgentSuggestions] Failed to get agents:', error)
      return []
    } finally {
      setLoading(false)
    }
  }, [])

  // Suggest an agent for current conversation
  const suggestAgent = useCallback(async (
    conversationId: string,
    agentId: string,
    reason: string,
    agent: Agent
  ) => {
    try {
      setLoading(true)

      const response = await fetch('/api/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId,
          agentId,
          reason
        })
      })

      if (!response.ok) {
        throw new Error('Failed to suggest agent')
      }

      const suggestion = await response.json()

      // Add to suggestions list
      setSuggestions(prev => [...prev, {
        id: suggestion.id,
        agent,
        reason
      }])

      return suggestion
    } catch (error) {
      console.error('[useAgentSuggestions] Failed to suggest agent:', error)
      throw error
    } finally {
      setLoading(false)
    }
  }, [])

  // Record user interaction with suggestion
  const recordInteraction = useCallback(async (
    suggestionId: string,
    selection: 'embed' | 'link' | 'ignored'
  ) => {
    try {
      const response = await fetch('/api/agents/interaction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          suggestionId,
          selection
        })
      })

      if (!response.ok) {
        throw new Error('Failed to record interaction')
      }

      return await response.json()
    } catch (error) {
      console.error('[useAgentSuggestions] Failed to record interaction:', error)
      throw error
    }
  }, [])

  // Select agent for embedding
  const selectAgentForEmbedding = useCallback(async (
    agent: Agent,
    suggestionId: string
  ) => {
    try {
      setSelectedAgent(agent)
      await recordInteraction(suggestionId, 'embed')
    } catch (error) {
      console.error('[useAgentSuggestions] Failed to select agent:', error)
    }
  }, [recordInteraction])

  // Clear agent selection
  const clearSelection = useCallback(() => {
    setSelectedAgent(null)
  }, [])

  // Dismiss suggestion
  const dismissSuggestion = useCallback(async (
    suggestionId: string
  ) => {
    try {
      await recordInteraction(suggestionId, 'ignored')
      setSuggestions(prev => prev.filter(s => s.id !== suggestionId))
    } catch (error) {
      console.error('[useAgentSuggestions] Failed to dismiss suggestion:', error)
    }
  }, [recordInteraction])

  return {
    suggestions,
    selectedAgent,
    loading,
    getAvailableAgents,
    suggestAgent,
    recordInteraction,
    selectAgentForEmbedding,
    clearSelection,
    dismissSuggestion
  }
}
