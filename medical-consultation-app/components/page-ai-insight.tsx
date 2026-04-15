'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { ChevronRight, X, Lightbulb } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface PageAiInsightProps {
  /**
   * Page context identifier (e.g., 'emotional_support', 'health_knowledge')
   */
  pageContext: string

  /**
   * Optional user question or comment to analyze
   */
  userQuestion?: string

  /**
   * Optional page data (e.g., search results, form values)
   */
  pageData?: Record<string, any>

  /**
   * Optional conversation history
   */
  conversationHistory?: Array<{ role?: string; content?: string }>

  /**
   * Custom callback when user navigates
   */
  onNavigate?: (path: string) => void

  /**
   * Custom styling classes
   */
  className?: string
}

interface InsightResponse {
  success: boolean
  cached?: boolean
  insight: {
    show_insight: boolean
    main_response: string
    suggested_page: string | null
    suggestion_reason: string | null
    insight_type: 'advice' | 'clarification' | 'guidance'
    timestamp: number
    isDismissed?: boolean
  }
  metadata?: Record<string, any>
}

const INSIGHT_ICONS: Record<string, string> = {
  advice: '💡',
  clarification: '🤔',
  guidance: '🎯',
}

const PAGE_DISPLAY_NAMES: Record<string, string> = {
  '/tam-su': 'Tâm sự',
  '/tra-cuu': 'Tra cứu',
  '/sang-loc': 'Sàng lọc',
  '/tri-lieu': 'Điều trị',
}

export function PageAiInsight({
  pageContext,
  userQuestion,
  pageData,
  conversationHistory = [],
  onNavigate,
  className,
}: PageAiInsightProps) {
  const router = useRouter()
  const [insight, setInsight] = useState<InsightResponse['insight'] | null>(
    null
  )
  const [isLoading, setIsLoading] = useState(false)
  const [isDismissed, setIsDismissed] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchInsight = useCallback(async () => {
    if (!pageContext || isDismissed) return

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/page-ai-insight', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          page_context: pageContext,
          user_question: userQuestion,
          page_data: pageData,
          conversation_history: conversationHistory,
        }),
      })

      if (!response.ok) {
        // Handle errors silently - v2
        const status = response.status
        if (status === 429 || status === 503) {
          // Rate limit or service unavailable - just skip this insight
          setError('rate_limited')
          return
        }
        // For other errors, set error state but don't throw
        console.debug('[v0] PageAiInsight API error:', status)
        setError(`API error: ${status}`)
        return
      }

      const data: InsightResponse = await response.json()

      if (data.success && data.insight) {
        setInsight(data.insight)
        if (data.insight.isDismissed) {
          setIsDismissed(true)
        }
      }
    } catch {
      // Silently handle errors - page insight is optional feature
      // Don't log to console as this is a non-critical feature
      setError('fetch_failed')
    } finally {
      setIsLoading(false)
    }
  }, [pageContext, userQuestion, pageData, conversationHistory, isDismissed])

  // Fetch insight on mount or when dependencies change - with delay to avoid rate limiting
  useEffect(() => {
    // Defer fetch by 2 seconds to avoid thundering herd on page load
    const timer = setTimeout(() => {
      fetchInsight()
    }, 2000)
    
    return () => clearTimeout(timer)
  }, [fetchInsight])

  // Don't show if dismissed or no insight
  if (isDismissed || !insight || !insight.show_insight) {
    return null
  }

  // Handle page navigation
  const handleNavigate = (path: string) => {
    if (onNavigate) {
      onNavigate(path)
    } else {
      router.push(path)
    }
  }

  const displayName =
    PAGE_DISPLAY_NAMES[insight.suggested_page || ''] ||
    insight.suggested_page ||
    ''
  const icon = INSIGHT_ICONS[insight.insight_type] || '💡'

  return (
    <div
      className={cn(
        'animate-in fade-in slide-in-from-top-4 duration-500',
        'mb-6 rounded-lg border border-amber-200/50 bg-gradient-to-br from-amber-50 to-orange-50 p-4 shadow-sm hover:shadow-md transition-shadow',
        className
      )}
    >
      {/* Header with icon and dismiss button */}
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">{icon}</span>
          <span className="text-xs font-semibold uppercase tracking-wider text-amber-700">
            AI Insight
          </span>
        </div>
        <button
          onClick={() => setIsDismissed(true)}
          className="flex-shrink-0 rounded-md p-1 text-amber-600/70 hover:bg-amber-100/50 hover:text-amber-700 transition-colors"
          aria-label="Dismiss insight"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Main response with markdown support */}
      <div className="mb-4">
        <div className="prose prose-sm max-w-none prose-p:my-1 prose-p:text-amber-900 prose-strong:text-amber-950 prose-a:text-amber-700 prose-a:underline">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {insight.main_response}
          </ReactMarkdown>
        </div>
      </div>

      {/* Suggested navigation (if applicable) */}
      {insight.suggested_page && displayName && (
        <div className="mt-4 space-y-2">
          {insight.suggestion_reason && (
            <p className="text-xs text-amber-700/80 leading-relaxed">
              <span className="font-medium">Tại sao:</span> {insight.suggestion_reason}
            </p>
          )}
          <button
            onClick={() => handleNavigate(insight.suggested_page || '')}
            className="inline-flex items-center gap-2 rounded-md bg-amber-600 px-3 py-2 text-sm font-medium text-white hover:bg-amber-700 transition-colors active:scale-95"
          >
            Chuyển sang {displayName}
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Error state */}
      {error && !isLoading && (
        <div className="mt-3 text-xs text-amber-600 bg-amber-100/30 rounded px-2 py-1">
          ⚠️ Không thể tải insight: {error}
        </div>
      )}

      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center gap-2 text-xs text-amber-700/60">
          <div className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-amber-300 border-r-amber-700" />
          Đang tải insight...
        </div>
      )}
    </div>
  )
}
