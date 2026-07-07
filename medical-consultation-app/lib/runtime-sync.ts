export const RUNTIME_MODE_EVENT = "runtime_mode_changed"

export type RuntimeProvider = "server" | "gemini" | "foza"
export type RuntimeTarget = "cpu" | "gpu"

export type SystemState = {
  provider: RuntimeProvider
  mode: RuntimeTarget
  graph_connected: boolean
  graph_injected: boolean
  graph_reason: string | null
  db_ok: boolean | null
  fallback: string | null
  error: string | null
  demo_mode: boolean
  fallback_chain?: string[]
  graph_endpoint?: string | null
  graph_status_code?: number | null
  graph_latency_ms?: number | null
  db_latency_ms?: number | null
  internal_pass_matched?: boolean
}

export type RuntimeModeDetail = {
  provider?: RuntimeProvider
  target?: RuntimeTarget
  gpu_url?: string
  source?: string
  demo_mode?: boolean
  system_state?: SystemState
}

const coerceOptionalString = (value: unknown): string | null => {
  const normalized = String(value ?? "").trim()
  return normalized || null
}

const coerceOptionalNumber = (value: unknown): number | null => {
  return typeof value === "number" && Number.isFinite(value) ? value : null
}

export const normalizeRuntimeProvider = (value: unknown): RuntimeProvider => {
  const raw = String(value || "").trim().toLowerCase()
  if (raw === "gemini") return "gemini"
  if (raw === "foza") return "foza"
  return "server"
}

export const normalizeRuntimeTarget = (value: unknown, fallback: RuntimeTarget = "cpu"): RuntimeTarget => {
  const raw = String(value || "").trim().toLowerCase()
  if (raw === "gpu" || raw === "cloud") return "gpu"
  if (raw === "cpu") return "cpu"
  return fallback
}

export const emptySystemState = (overrides?: Partial<SystemState>): SystemState => ({
  provider: normalizeRuntimeProvider(overrides?.provider),
  mode: normalizeRuntimeTarget(overrides?.mode, "cpu"),
  graph_connected: Boolean(overrides?.graph_connected),
  graph_injected: Boolean(overrides?.graph_injected),
  graph_reason: coerceOptionalString(overrides?.graph_reason),
  db_ok: typeof overrides?.db_ok === "boolean" ? overrides.db_ok : null,
  fallback: coerceOptionalString(overrides?.fallback),
  error: coerceOptionalString(overrides?.error),
  demo_mode: Boolean(overrides?.demo_mode),
  fallback_chain: Array.isArray(overrides?.fallback_chain)
    ? overrides.fallback_chain.map((item) => String(item).trim()).filter(Boolean)
    : [],
  graph_endpoint: coerceOptionalString(overrides?.graph_endpoint),
  graph_status_code: coerceOptionalNumber(overrides?.graph_status_code),
  graph_latency_ms: coerceOptionalNumber(overrides?.graph_latency_ms),
  db_latency_ms: coerceOptionalNumber(overrides?.db_latency_ms),
  internal_pass_matched: typeof overrides?.internal_pass_matched === "boolean" ? overrides.internal_pass_matched : false,
})

export const normalizeSystemState = (value: unknown, fallback?: Partial<SystemState>): SystemState => {
  const source = value && typeof value === "object" ? (value as Partial<SystemState>) : {}
  return emptySystemState({
    ...(fallback || {}),
    ...source,
    provider: source.provider ?? fallback?.provider,
    mode: source.mode ?? fallback?.mode,
  })
}

export const mergeSystemState = (base: SystemState, next?: Partial<SystemState> | null): SystemState => {
  if (!next) return normalizeSystemState(base)
  return normalizeSystemState({ ...base, ...next })
}

export const resolveInternalDemoPass = (configured?: string | null) => {
  if (typeof configured === "string") {
    const inlineValue = configured.trim()
    return inlineValue || null
  }
  if (typeof process === "undefined" || !process?.env) return null
  const fromEnv = String(process.env.INTERNAL_DEMO_PASS || process.env.AGENT_KEY_PASS || "").trim()
  return fromEnv || null
}

export const hasInternalDemoPass = (configured?: string | null) => !!resolveInternalDemoPass(configured)

export const isInternalDemoPass = (candidate: unknown, configured?: string | null) => {
  const expected = resolveInternalDemoPass(configured)
  const value = String(candidate || "").trim()
  if (!value || !expected) return false
  return value === expected
}

export const buildSystemState = (input?: Partial<SystemState>): SystemState => {
  return normalizeSystemState(input, emptySystemState())
}

export const getStoredProvider = (): RuntimeProvider | null => {
  if (typeof window === "undefined") return null
  try {
    return normalizeRuntimeProvider(window.localStorage.getItem("llm_provider"))
  } catch {
    return null
  }
}

export const setStoredProvider = (provider: RuntimeProvider) => {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem("llm_provider", provider)
  } catch {}
}

export const dispatchRuntimeModeChanged = (detail: RuntimeModeDetail) => {
  if (typeof window === "undefined") return
  try {
    window.dispatchEvent(new CustomEvent(RUNTIME_MODE_EVENT, { detail }))
  } catch {}
}

export const buildRuntimeDetailFromSystemState = (systemState: SystemState, gpuUrl?: string | null): RuntimeModeDetail => ({
  provider: systemState.provider,
  target: systemState.mode,
  gpu_url: systemState.mode === "gpu" ? coerceOptionalString(gpuUrl) || undefined : undefined,
  source: "system_state",
  demo_mode: systemState.demo_mode,
  system_state: systemState,
})

export const buildRuntimeDetailFromMetadata = (metadata: any, fallbackTarget: RuntimeTarget = "cpu"): RuntimeModeDetail | null => {
  if (!metadata || typeof metadata !== "object") return null
  const systemState = normalizeSystemState(metadata.system_state, {
    provider: normalizeRuntimeProvider(metadata.provider),
    mode: normalizeRuntimeTarget(metadata.mode, fallbackTarget),
    graph_connected: Boolean(metadata.graph_connected),
    graph_injected: Boolean(metadata.graph_injected),
    graph_reason: coerceOptionalString(metadata.graph_reason),
    db_ok: typeof metadata.db_ok === "boolean" ? metadata.db_ok : null,
    fallback: typeof metadata.fallback === "string" ? metadata.fallback : null,
    error: typeof metadata.error === "string" ? metadata.error : null,
    demo_mode: Boolean(metadata.demo_mode || metadata.access === "pass"),
    fallback_chain: Array.isArray(metadata.fallback_chain) ? metadata.fallback_chain : [],
  })
  const targetFallback = systemState.provider === "gemini" || systemState.provider === "foza" ? "gpu" : fallbackTarget
  return {
    provider: systemState.provider,
    target: normalizeRuntimeTarget(systemState.mode || metadata.mode, targetFallback),
    source: "agent_metadata",
    demo_mode: systemState.demo_mode,
    system_state: systemState,
  }
}
