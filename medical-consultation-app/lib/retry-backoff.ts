/**
 * Exponential backoff retry mechanism for failed requests
 */

export interface RetryConfig {
  maxRetries: number
  initialDelayMs: number
  maxDelayMs: number
  backoffMultiplier: number
  onRetry?: (attempt: number, error: unknown) => void
}

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  initialDelayMs: 500,
  maxDelayMs: 10000,
  backoffMultiplier: 2,
}

type RetryableErrorLike = {
  status?: number
  message?: string
}

function toRetryableErrorLike(error: unknown): RetryableErrorLike {
  if (error instanceof Error) {
    return { message: error.message }
  }
  if (typeof error === "object" && error !== null) {
    const candidate = error as { status?: unknown; message?: unknown }
    return {
      status: typeof candidate.status === "number" ? candidate.status : undefined,
      message: typeof candidate.message === "string" ? candidate.message : undefined,
    }
  }
  return { message: typeof error === "string" ? error : undefined }
}

export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  config = DEFAULT_RETRY_CONFIG
): Promise<T> {
  let lastError: unknown = null
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
      const retryableError = toRetryableErrorLike(error)
      const errorMessage = retryableError.message || String(error)
      console.log(`[v0] Attempt ${attempt} failed:`, errorMessage)

      // Check if error is retryable
      const isRetryable =
        (retryableError.status === 503 || // Service Unavailable
          retryableError.status === 429 || // Rate Limited
          retryableError.status === 408 || // Request Timeout
          retryableError.message?.includes("UNAVAILABLE") ||
          retryableError.message?.includes("timeout") ||
          retryableError.message?.includes("ERR_NETWORK")) &&
        attempt < config.maxRetries

      if (!isRetryable) {
        throw error
      }

      config.onRetry?.(attempt, error)

      // Calculate next delay
      delay = Math.min(delay * config.backoffMultiplier, config.maxDelayMs)
      delay = delay + Math.random() * delay * 0.1 // Add jitter
    }
  }

  throw lastError
}
