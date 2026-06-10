/**
 * Simple in-memory TTL cache for Next.js Edge/API route usage.
 * WHY: avoids repeated DB/llm lookups for stable data within a short window.
 * Does NOT persist across cold starts (acceptable for this app's scale).
 *
 * Strategy: LRU eviction when max entries exceeded.
 * Suitable for: conversation list, user profile, conversation lookup.
 * NOT suitable for: high-cardinality keys, very large payloads.
 */
type CacheEntry<T> = { value: T; expiresAt: number }

export class TTLCache<T> {
  private readonly store = new Map<string, CacheEntry<T>>()
  private readonly defaultTTL: number
  private readonly maxEntries: number

  constructor(options: { ttlMs?: number; maxEntries?: number } = {}) {
    this.defaultTTL = options.ttlMs ?? 30_000 // 30s default
    this.maxEntries = options.maxEntries ?? 500
  }

  /** Get a cached value, returns undefined if absent or expired. */
  get(key: string): T | undefined {
    const entry = this.store.get(key)
    if (!entry) return undefined
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key)
      return undefined
    }
    return entry.value
  }

  /** Set a value with optional custom TTL (ms). */
  set(key: string, value: T, ttlMs?: number): void {
    // LRU eviction: remove oldest entries if at capacity
    if (this.store.size >= this.maxEntries && !this.store.has(key)) {
      const oldestKey = this.store.keys().next().value
      if (oldestKey) this.store.delete(oldestKey)
    }
    this.store.set(key, {
      value,
      expiresAt: Date.now() + (ttlMs ?? this.defaultTTL),
    })
  }

  /** Delete a specific key. */
  delete(key: string): boolean {
    return this.store.delete(key)
  }

  /** Invalidate all entries whose key starts with a prefix. */
  invalidatePrefix(prefix: string): void {
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) this.store.delete(key)
    }
  }

  /** Clear all entries. */
  clear(): void {
    this.store.clear()
  }

  /** Get cache stats (for debugging/monitoring). */
  get stats() {
    const now = Date.now()
    let active = 0
    for (const e of this.store.values()) {
      if (now <= e.expiresAt) active++
    }
    return { total: this.store.size, active, max: this.maxEntries }
  }
}

// ── Shared cache instances ────────────────────────────────────────────────────

/** Cache for conversation list lookups (30s TTL). */
export const conversationListCache = new TTLCache<unknown>({
  ttlMs: 30_000,
  maxEntries: 200,
})

/** Cache for individual conversation/message lookups (60s TTL). */
export const conversationCache = new TTLCache<unknown>({
  ttlMs: 60_000,
  maxEntries: 300,
})

/** Cache for doctor profile lookups (5min TTL — stable data). */
export const doctorProfileCache = new TTLCache<unknown>({
  ttlMs: 300_000,
  maxEntries: 50,
})
