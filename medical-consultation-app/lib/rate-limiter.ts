/**
 * Simple rate limiter for API requests
 * Prevents overloading single AI model
 */

interface RateLimitConfig {
  maxRequests: number
  windowMs: number
}

const DEFAULT_CONFIG: RateLimitConfig = {
  maxRequests: 10, // 10 requests per window
  windowMs: 60000, // 1 minute window
}

const userLimits: Map<string, { count: number; resetTime: number }> = new Map()

export function getRateLimit(userId: string, config = DEFAULT_CONFIG): { allowed: boolean; retryAfter?: number } {
  const now = Date.now()
  const limit = userLimits.get(userId)

  if (!limit || now > limit.resetTime) {
    // New window
    userLimits.set(userId, { count: 1, resetTime: now + config.windowMs })
    return { allowed: true }
  }

  if (limit.count < config.maxRequests) {
    limit.count++
    return { allowed: true }
  }

  // Rate limited
  const retryAfter = Math.ceil((limit.resetTime - now) / 1000)
  return { allowed: false, retryAfter }
}

export function resetRateLimit(userId: string): void {
  userLimits.delete(userId)
}
