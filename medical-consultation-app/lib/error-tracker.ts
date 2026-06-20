/**
 * Lightweight error tracking module.
 * Writes structured error events to data/runtime-errors.jsonl (always).
 * Optionally forwards to Sentry when SENTRY_DSN env var is set.
 *
 * WHY: avoids heavy SDK dependency for offline/hybrid deployments;
 * Sentry is opt-in via env var only.
 */
import fs from "fs"
import path from "path"

export interface ErrorEvent {
  timestamp: string
  level: "error" | "warning" | "info"
  message: string
  route?: string
  user_id?: string
  request_id?: string
  mode?: string
  provider?: string
  stack?: string
  context?: Record<string, unknown>
}

const DATA_DIR = path.join(process.cwd(), "data")
const ERRORS_PATH = path.join(DATA_DIR, "runtime-errors.jsonl")
const MAX_STACK_LEN = 2000
type SentryModule = {
  withScope: (fn: (scope: any) => void) => void
  captureException: (error: Error) => void
  captureMessage: (message: string, level?: "warning" | "error") => void
}
let sentryLoader: ((specifier: string) => Promise<SentryModule | null>) | null = null

function getOptionalImportLoader() {
  if (sentryLoader) return sentryLoader

  sentryLoader = new Function(
    "specifier",
    "return import(specifier).catch(() => null)"
  ) as (specifier: string) => Promise<SentryModule | null>

  return sentryLoader
}

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })
}

function appendToJSONL(event: ErrorEvent) {
  try {
    ensureDataDir()
    fs.appendFileSync(ERRORS_PATH, JSON.stringify(event) + "\n", "utf-8")
  } catch {
    // WHY: never throw from error tracker — would cause infinite error loops
  }
}

async function forwardToSentry(event: ErrorEvent, originalError?: unknown) {
  const dsn = process.env.SENTRY_DSN
  if (!dsn) return

  try {
    // WHY: indirect import keeps Sentry optional at bundler level too.
    const Sentry = await getOptionalImportLoader()("@sentry/nextjs")
    if (!Sentry) return

    Sentry.withScope((scope: any) => {
      if (event.user_id) scope.setUser({ id: event.user_id })
      if (event.route) scope.setTag("route", event.route)
      if (event.mode) scope.setTag("mode", event.mode)
      if (event.provider) scope.setTag("provider", event.provider)
      if (event.request_id) scope.setTag("request_id", event.request_id)
      if (event.context) scope.setExtras(event.context)

      if (originalError instanceof Error) {
        Sentry.captureException(originalError)
      } else {
        Sentry.captureMessage(event.message, event.level === "warning" ? "warning" : "error")
      }
    })
  } catch {
    // Sentry failure must never crash the app
  }
}

/**
 * Track an error event. Writes to JSONL and optionally forwards to Sentry.
 * @param message - human-readable error description
 * @param options - optional metadata (route, user_id, error object, context)
 */
export async function trackError(
  message: string,
  options?: {
    level?: ErrorEvent["level"]
    route?: string
    user_id?: string
    request_id?: string
    mode?: string
    provider?: string
    error?: unknown
    context?: Record<string, unknown>
  }
): Promise<void> {
  const err = options?.error
  const stack =
    err instanceof Error
      ? String(err.stack || "").slice(0, MAX_STACK_LEN)
      : undefined

  const event: ErrorEvent = {
    timestamp: new Date().toISOString(),
    level: options?.level ?? "error",
    message,
    route: options?.route,
    user_id: options?.user_id,
    request_id: options?.request_id,
    mode: options?.mode,
    provider: options?.provider,
    stack,
    context: options?.context,
  }

  // Strip undefined fields for clean JSONL
  const clean = Object.fromEntries(
    Object.entries(event).filter(([, v]) => v !== undefined)
  ) as ErrorEvent

  appendToJSONL(clean)
  await forwardToSentry(clean, err)
}

/**
 * Track a warning (non-fatal issue worth monitoring).
 */
export function trackWarning(
  message: string,
  options?: Omit<Parameters<typeof trackError>[1], "level">
): Promise<void> {
  return trackError(message, { ...options, level: "warning" })
}
