/**
 * Exponential backoff retry mechanism for failed requests
 */

export interface RetryConfig {
  maxRetries: number
  initialDelayMs: number
  maxDelayMs: number
  backoffMultiplier: number
}

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  initialDelayMs: 500,
  maxDelayMs: 10000,
  backoffMultiplier: 2,
}

export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  config = DEFAULT_RETRY_CONFIG
): Promise<T> {
  let lastError: any = null
  let delay = config.initialDelayMs

  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        console.log(`[v0] Retry attempt ${attempt}/${config.maxRetries}, waiting ${delay}ms...`)
        await new Promise((r) => setTimeout(r, delay))
      }

      return await fn()
    } catch (error) {
      lastError = error
      console.log(`[v0] Attempt ${attempt} failed:`, error?.message || error)

      // Check if error is retryable
      const isRetryable =
        (error?.status === 503 || // Service Unavailable
          error?.status === 429 || // Rate Limited
          error?.status === 408 || // Request Timeout
          error?.message?.includes("UNAVAILABLE") ||
          error?.message?.includes("timeout") ||
          error?.message?.includes("ERR_NETWORK")) &&
        attempt < config.maxRetries

      if (!isRetryable) {
        throw error
      }

      // Calculate next delay
      delay = Math.min(delay * config.backoffMultiplier, config.maxDelayMs)
      delay = delay + Math.random() * delay * 0.1 // Add jitter
    }
  }

  throw lastError
}
