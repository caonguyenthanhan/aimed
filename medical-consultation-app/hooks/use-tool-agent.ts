import { useState, useCallback } from 'react'
import { detectToolAgent, ToolAgentType, TOOL_AGENTS } from '@/lib/tool-agents'

interface UseToolAgentOptions {
  onSuccess?: (response: string, toolAgent: ToolAgentType) => void
  onError?: (error: string) => void
}

interface ToolAgentState {
  loading: boolean
  error: string | null
  response: string | null
  toolAgent: ToolAgentType | null
}

/**
 * Hook to query and interact with tool agents
 * Automatically detects which agent should handle the query
 */
export function useToolAgent(options: UseToolAgentOptions = {}) {
  const [state, setState] = useState<ToolAgentState>({
    loading: false,
    error: null,
    response: null,
    toolAgent: null
  })

  const query = useCallback(async (message: string, context?: string) => {
    setState({ loading: true, error: null, response: null, toolAgent: null })

    try {
      // Detect which tool agent should handle this
      const toolAgent = detectToolAgent(message, context)

      if (!toolAgent) {
        const error = 'No suitable tool agent found for this query'
        setState({ loading: false, error, response: null, toolAgent: null })
        options.onError?.(error)
        return null
      }

      // Call the API
      const response = await fetch('/api/tool-agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          context,
          toolAgent
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        const error = errorData.error || 'Failed to query tool agent'
        setState({ loading: false, error, response: null, toolAgent })
        options.onError?.(error)
        return null
      }

      const data = await response.json()
      const responseText = data.response || ''

      setState({
        loading: false,
        error: null,
        response: responseText,
        toolAgent
      })

      options.onSuccess?.(responseText, toolAgent)
      return { response: responseText, toolAgent }
    } catch (error: any) {
      const errorMsg = error?.message || 'Failed to query tool agent'
      setState({ loading: false, error: errorMsg, response: null, toolAgent: null })
      options.onError?.(errorMsg)
      return null
    }
  }, [options])

  const getAgentInfo = useCallback((toolAgent: ToolAgentType) => {
    return TOOL_AGENTS[toolAgent]
  }, [])

  const reset = useCallback(() => {
    setState({ loading: false, error: null, response: null, toolAgent: null })
  }, [])

  return {
    ...state,
    query,
    getAgentInfo,
    reset,
    isToolDetectable: (message: string) => detectToolAgent(message) !== null
  }
}
