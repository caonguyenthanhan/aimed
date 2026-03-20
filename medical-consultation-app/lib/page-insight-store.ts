import crypto from 'crypto'

export interface PageInsight {
  show_insight: boolean
  main_response: string
  suggested_page: string | null
  suggestion_reason: string | null
  insight_type: 'advice' | 'clarification' | 'guidance'
  timestamp: number
  isDismissed?: boolean
}

/**
 * Session-based cache for page insights
 * Key format: page_insight_{pageContext}_{hash(userQuestion)}
 * Stored in a Map for TTL management
 */
class PageInsightStore {
  private cache: Map<string, { insight: PageInsight; expiresAt: number }> = new Map()
  private readonly TTL_MS = 30 * 60 * 1000 // 30 minutes

  private generateKey(pageContext: string, userQuestion?: string): string {
    if (!userQuestion) return `page_insight_${pageContext}_default`
    const hash = crypto
      .createHash('sha256')
      .update(userQuestion.trim().toLowerCase())
      .digest('hex')
      .slice(0, 12)
    return `page_insight_${pageContext}_${hash}`
  }

  set(
    pageContext: string,
    insight: PageInsight,
    userQuestion?: string
  ): void {
    const key = this.generateKey(pageContext, userQuestion)
    const expiresAt = Date.now() + this.TTL_MS
    this.cache.set(key, { insight, expiresAt })
  }

  get(pageContext: string, userQuestion?: string): PageInsight | null {
    const key = this.generateKey(pageContext, userQuestion)
    const cached = this.cache.get(key)

    if (!cached) return null

    // Check if expired
    if (Date.now() > cached.expiresAt) {
      this.cache.delete(key)
      return null
    }

    return cached.insight
  }

  clear(pageContext?: string): void {
    if (!pageContext) {
      this.cache.clear()
      return
    }
    // Clear entries for specific page context
    const prefix = `page_insight_${pageContext}_`
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key)
      }
    }
  }

  markDismissed(pageContext: string, userQuestion?: string): void {
    const key = this.generateKey(pageContext, userQuestion)
    const cached = this.cache.get(key)
    if (cached) {
      cached.insight.isDismissed = true
    }
  }

  isDismissed(pageContext: string, userQuestion?: string): boolean {
    const insight = this.get(pageContext, userQuestion)
    return insight?.isDismissed || false
  }
}

export const pageInsightStore = new PageInsightStore()
