import { describe, it, expect, beforeEach } from "vitest"
import { getRateLimit, resetRateLimit } from "../rate-limiter"

describe("rate-limiter", () => {
  beforeEach(() => {
    resetRateLimit("user_test")
    resetRateLimit("user_a")
    resetRateLimit("user_b")
  })

  it("allows first request", () => {
    const result = getRateLimit("user_test")
    expect(result.allowed).toBe(true)
    expect(result.retryAfter).toBeUndefined()
  })

  it("allows up to maxRequests within window", () => {
    const config = { maxRequests: 3, windowMs: 60000 }
    expect(getRateLimit("user_a", config).allowed).toBe(true)
    expect(getRateLimit("user_a", config).allowed).toBe(true)
    expect(getRateLimit("user_a", config).allowed).toBe(true)
  })

  it("blocks request exceeding maxRequests", () => {
    const config = { maxRequests: 3, windowMs: 60000 }
    getRateLimit("user_a", config)
    getRateLimit("user_a", config)
    getRateLimit("user_a", config)
    const result = getRateLimit("user_a", config)
    expect(result.allowed).toBe(false)
    expect(result.retryAfter).toBeGreaterThan(0)
  })

  it("resets after window expires", async () => {
    const config = { maxRequests: 1, windowMs: 50 } // 50ms window
    getRateLimit("user_b", config)
    const blocked = getRateLimit("user_b", config)
    expect(blocked.allowed).toBe(false)

    // Wait for window to expire
    await new Promise((r) => setTimeout(r, 100))

    const allowed = getRateLimit("user_b", config)
    expect(allowed.allowed).toBe(true)
  })

  it("tracks different users independently", () => {
    const config = { maxRequests: 1, windowMs: 60000 }
    getRateLimit("user_a", config)
    const blocked = getRateLimit("user_a", config)
    const fresh = getRateLimit("user_b", config)
    expect(blocked.allowed).toBe(false)
    expect(fresh.allowed).toBe(true)
  })

  it("resetRateLimit clears the limit", () => {
    const config = { maxRequests: 1, windowMs: 60000 }
    getRateLimit("user_test", config)
    getRateLimit("user_test", config) // now blocked
    resetRateLimit("user_test")
    const result = getRateLimit("user_test", config)
    expect(result.allowed).toBe(true)
  })

  it("uses default config when none provided", () => {
    // Default is 10 req/min — first request should always be allowed
    const result = getRateLimit("user_test")
    expect(result.allowed).toBe(true)
  })
})
