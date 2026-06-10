/**
 * Simple rate limiter for API requests.
 * Prevents overloading single AI model with per-user and per-IP limiting.
 *
 * Rate limit strategy:
 * - Authenticated requests → keyed by user_id
 * - Unauthenticated requests → keyed by IP address
 * - System-wide quota: 5 free calls → requires API key beyond that
 *
 * WHY: IP-based limiting as fallback for unauthenticated requests ensures
 * even anonymous users cannot abuse the service.
 */

interface RateLimitConfig {
  maxRequests: number
  windowMs: number
}

const DEFAULT_CONFIG: RateLimitConfig = {
  maxRequests: 10, // 10 requests per window
  windowMs: 60_000, // 1 minute window
}

const DEFAULT_IP_CONFIG: RateLimitConfig = {
  maxRequests: 30, // 30 requests per minute per IP (more permissive for shared IPs)
  windowMs: 60_000,
}

// WHY: separate maps for user and IP limits — different TTLs and eviction policies
const userLimits: Map<string, { count: number; resetTime: number }> = new Map()
const ipLimits: Map<string, { count: number; resetTime: number }> = new Map()

/** Clean up expired entries to prevent memory bloat. Runs on every check. */
function pruneLimits(limits: Map<string, { count: number; resetTime: number }>, now: number) {
  if (limits.size > 10_000) {
    for (const [key, entry] of limits) {
      if (now > entry.resetTime) limits.delete(key)
    }
  }
}

export function getRateLimit(
  userId: string,
  config = DEFAULT_CONFIG
): { allowed: boolean; retryAfter?: number } {
  const now = Date.now()
  pruneLimits(userLimits, now)
  const limit = userLimits.get(userId)

  if (!limit || now > limit.resetTime) {
    userLimits.set(userId, { count: 1, resetTime: now + config.windowMs })
    return { allowed: true }
  }

  if (limit.count < config.maxRequests) {
    limit.count++
    return { allowed: true }
  }

  return { allowed: false, retryAfter: Math.ceil((limit.resetTime - now) / 1000) }
}

/** Rate limit by IP address — used for unauthenticated requests. */
export function getIpRateLimit(
  ip: string,
  config = DEFAULT_IP_CONFIG
): { allowed: boolean; retryAfter?: number } {
  const now = Date.now()
  pruneLimits(ipLimits, now)
  const limit = ipLimits.get(ip)

  if (!limit || now > limit.resetTime) {
    ipLimits.set(ip, { count: 1, resetTime: now + config.windowMs })
    return { allowed: true }
  }

  if (limit.count < config.maxRequests) {
    limit.count++
    return { allowed: true }
  }

  return { allowed: false, retryAfter: Math.ceil((limit.resetTime - now) / 1000) }
}

/** Extract client IP from request headers (handles proxies). */
export function getClientIp(req: Request): string {
  const headers = req.headers
  return (
    String(headers.get("x-forwarded-for") || "").split(",")[0].trim() ||
    String(headers.get("x-real-ip") || "").trim() ||
    String(headers.get("cf-connecting-ip") || "").trim() ||
    "unknown"
  )
}

/** Reset rate limit for a specific user. */
export function resetRateLimit(userId: string): void {
  userLimits.delete(userId)
}

/** Reset rate limit for a specific IP. */
export function resetIpRateLimit(ip: string): void {
  ipLimits.delete(ip)
}
