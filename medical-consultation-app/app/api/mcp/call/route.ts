import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { YouTubeService, youtubeService } from "@/lib/youtube-service"

type JsonObject = Record<string, unknown>

type WebSearchItem = {
  title: string
  link: string
  snippet: string
  displayLink?: string
}

type GraphFailureReason =
  | "graph_ok"
  | "graph_disabled_no_cpu_url"
  | "graph_404"
  | "graph_timeout"
  | "graph_down"

type GraphStatusResult = {
  ok: boolean
  connected: boolean
  graph_connected: boolean
  status_code: number
  reason: GraphFailureReason | string
  latency: number
  latency_ms: number
  checked_at?: string
  nodes?: number
  error?: unknown
}

type GraphEvidenceResult = {
  ok: boolean
  query: string
  entities: JsonObject[]
  edges: JsonObject[]
  graph_connected: boolean
  status_code: number
  reason: GraphFailureReason | string
  latency: number
  elapsed_ms: number
  error?: unknown
}

type FetchErrorKind = "http_error" | "timeout" | "network_error"

type FetchJsonSuccess<T> = {
  ok: true
  status: number
  json: T
  attempts: number
  elapsed_ms: number
}

type FetchJsonFailure = {
  ok: false
  status: number
  json: unknown
  attempts: number
  elapsed_ms: number
  error_kind: FetchErrorKind
  error_message: string
}

type FetchJsonResult<T> = FetchJsonSuccess<T> | FetchJsonFailure

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

function nowMs() {
  return Date.now()
}

function resolveToolTimeoutMs(toolName: string) {
  const envDefault = Number(process.env.AGENT_CHAT_MCP_TOOL_TIMEOUT_MS || process.env.FOZA_MCP_TOOL_TIMEOUT_MS || "8000")
  const base = Number.isFinite(envDefault) ? envDefault : 8000
  if (toolName === "graph.status") return Math.max(800, Math.min(3000, Math.floor(base / 3)))
  if (toolName === "graph.evidence") return Math.max(2500, Math.min(12000, base))
  return base
}

function isObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function readString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined
}

function readNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined
}

function readBoolean(value: unknown): boolean | undefined {
  return typeof value === "boolean" ? value : undefined
}

function toJsonObjectArray(value: unknown): JsonObject[] {
  return Array.isArray(value) ? value.filter((item): item is JsonObject => isObject(item)) : []
}

function extractGraphError(payload: unknown, fallbackMessage?: string): unknown {
  if (isObject(payload) && "error" in payload) return payload.error
  if (fallbackMessage) return fallbackMessage
  return payload
}

function normalizeGraphReason(value: unknown): GraphFailureReason | undefined {
  const reason = readString(value)
  if (
    reason === "graph_ok" ||
    reason === "graph_disabled_no_cpu_url" ||
    reason === "graph_404" ||
    reason === "graph_timeout" ||
    reason === "graph_down"
  ) {
    return reason
  }
  return undefined
}

function normalizeGraphStatusCode(payload: unknown, fallbackStatus: number): number {
  if (isObject(payload)) {
    const statusCode = readNumber(payload.status_code)
    if (typeof statusCode === "number") return statusCode
  }
  return fallbackStatus
}

function mapGraphFailureReason(params: {
  status: number
  payload: unknown
  errorKind?: FetchErrorKind
  errorMessage?: string
}): GraphFailureReason {
  const payloadReason = isObject(params.payload) ? normalizeGraphReason(params.payload.reason) : undefined
  if (payloadReason && payloadReason !== "graph_ok") return payloadReason

  const statusCode = normalizeGraphStatusCode(params.payload, params.status)
  if (statusCode === 404) return "graph_404"
  if (params.errorKind === "timeout") return "graph_timeout"

  const combined = `${String(params.errorMessage || "")} ${JSON.stringify(params.payload ?? "")}`.toLowerCase()
  if (
    combined.includes("abort") ||
    combined.includes("timeout") ||
    combined.includes("timed out") ||
    combined.includes("deadline")
  ) {
    return "graph_timeout"
  }

  return "graph_down"
}

function buildGraphStatusFailure(
  reason: GraphFailureReason,
  statusCode: number,
  error: unknown,
  elapsedMs: number,
): GraphStatusResult {
  return {
    ok: false,
    connected: false,
    graph_connected: false,
    status_code: statusCode,
    reason,
    latency: elapsedMs,
    latency_ms: elapsedMs,
    error,
  }
}

function normalizeGraphStatusPayload(payload: unknown, elapsedMs: number): GraphStatusResult {
  const source = isObject(payload) ? payload : {}
  const graphConnected = readBoolean(source.graph_connected) ?? readBoolean(source.connected) ?? false
  const latency = readNumber(source.latency) ?? readNumber(source.latency_ms) ?? elapsedMs
  const statusCode = normalizeGraphStatusCode(source, graphConnected ? 200 : 503)
  const reason = normalizeGraphReason(source.reason) ?? (graphConnected ? "graph_ok" : "graph_down")

  return {
    ok: readBoolean(source.ok) ?? graphConnected,
    connected: readBoolean(source.connected) ?? graphConnected,
    graph_connected: graphConnected,
    status_code: statusCode,
    reason,
    latency,
    latency_ms: latency,
    checked_at: readString(source.checked_at),
    nodes: readNumber(source.nodes),
    error: extractGraphError(source),
  }
}

function buildGraphEvidenceFailure(
  query: string,
  reason: GraphFailureReason,
  statusCode: number,
  error: unknown,
  elapsedMs: number,
): GraphEvidenceResult {
  return {
    ok: false,
    query,
    entities: [],
    edges: [],
    graph_connected: false,
    status_code: statusCode,
    reason,
    latency: elapsedMs,
    elapsed_ms: elapsedMs,
    error,
  }
}

function normalizeGraphEvidencePayload(payload: unknown, query: string, elapsedMs: number): GraphEvidenceResult {
  const source = isObject(payload) ? payload : {}
  const graphConnected = readBoolean(source.graph_connected) ?? readBoolean(source.connected) ?? (readBoolean(source.ok) ?? false)
  const latency = readNumber(source.latency) ?? readNumber(source.elapsed_ms) ?? elapsedMs
  const statusCode = normalizeGraphStatusCode(source, graphConnected ? 200 : 503)
  const reason = normalizeGraphReason(source.reason) ?? (graphConnected ? "graph_ok" : "graph_down")

  return {
    ok: readBoolean(source.ok) ?? graphConnected,
    query: readString(source.query) ?? query,
    entities: toJsonObjectArray(source.entities),
    edges: toJsonObjectArray(source.edges),
    graph_connected: graphConnected,
    status_code: statusCode,
    reason,
    latency,
    elapsed_ms: readNumber(source.elapsed_ms) ?? latency,
    error: extractGraphError(source),
  }
}

function resolveCpuServerBaseUrl(): string {
  return String(process.env.CPU_SERVER_URL || "").trim().replace(/\/$/, "")
}

async function fetchJsonWithRetry<T>(url: string, init: RequestInit, opts: { tool: string; attempts: number }): Promise<FetchJsonResult<T>> {
  const timeoutMs = resolveToolTimeoutMs(opts.tool)
  const maxAttempts = Math.max(1, Math.min(3, opts.attempts))
  let lastFailure: FetchJsonFailure | null = null
  const startedAt = nowMs()
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const controller = new AbortController()
    const t = setTimeout(() => controller.abort(), timeoutMs)
    try {
      const resp = await fetch(url, { ...init, signal: controller.signal })
      clearTimeout(t)
      const json = (await resp.json().catch(() => null)) as T
      if (resp.ok) {
        return { ok: true as const, status: resp.status, json, attempts: attempt, elapsed_ms: nowMs() - startedAt }
      }
      const httpFailure: FetchJsonFailure = {
        ok: false as const,
        status: resp.status,
        json,
        attempts: attempt,
        elapsed_ms: nowMs() - startedAt,
        error_kind: "http_error",
        error_message: resp.statusText || `HTTP ${resp.status}`,
      }
      if (resp.status === 400 || resp.status === 401 || resp.status === 403 || resp.status === 404) {
        return httpFailure
      }
      lastFailure = httpFailure
    } catch (e: any) {
      clearTimeout(t)
      const isTimeout = e?.name === "AbortError"
      lastFailure = {
        ok: false as const,
        status: 0,
        json: null,
        attempts: attempt,
        elapsed_ms: nowMs() - startedAt,
        error_kind: isTimeout ? "timeout" : "network_error",
        error_message: String(e?.message || e || (isTimeout ? "Request aborted" : "Network error")),
      }
    }
    if (attempt < maxAttempts) {
      const backoff = 250 * Math.pow(2, attempt - 1) + Math.floor(Math.random() * 120)
      await sleep(backoff)
    }
  }
  return lastFailure || {
    ok: false as const,
    status: 0,
    json: null,
    attempts: maxAttempts,
    elapsed_ms: nowMs() - startedAt,
    error_kind: "network_error",
    error_message: "Unknown fetch failure",
  }
}

function stripTags(input: string) {
  return input
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function decodeHtmlEntities(input: string) {
  return input
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
}

function normalizeDdqLink(rawHref: string) {
  const href = rawHref.trim()
  try {
    const u = new URL(href, "https://duckduckgo.com")
    const uddg = u.searchParams.get("uddg")
    if (uddg) return decodeURIComponent(uddg)
    return u.toString()
  } catch {
    return href
  }
}

async function searchDuckDuckGo(q: string, num: number): Promise<WebSearchItem[]> {
  const target = new URL("https://duckduckgo.com/html/")
  target.searchParams.set("q", q)
  target.searchParams.set("kl", "vn-vi")

  const resp = await fetch(target.toString(), {
    method: "GET",
    headers: {
      "user-agent": "Mozilla/5.0",
      "accept": "text/html",
    },
  })
  if (!resp.ok) return []
  const html = await resp.text()

  const results: WebSearchItem[] = []
  const blocks = html.split(/<div[^>]+class="[^"]*result[^"]*"[^>]*>/i)
  for (const block of blocks) {
    if (results.length >= num) break
    const a = block.match(/<a[^>]+class="[^"]*result__a[^"]*"[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i)
    if (!a) continue
    const link = normalizeDdqLink(decodeHtmlEntities(a[1] || ""))
    const title = stripTags(decodeHtmlEntities(a[2] || ""))
    if (!title || !link) continue

    const snippetMatch =
      block.match(/<a[^>]+class="[^"]*result__snippet[^"]*"[^>]*>([\s\S]*?)<\/a>/i) ||
      block.match(/<div[^>]+class="[^"]*result__snippet[^"]*"[^>]*>([\s\S]*?)<\/div>/i) ||
      block.match(/<span[^>]+class="[^"]*result__snippet[^"]*"[^>]*>([\s\S]*?)<\/span>/i)

    const snippet = snippetMatch ? stripTags(decodeHtmlEntities(snippetMatch[1] || "")) : ""
    let displayLink: string | undefined
    try {
      displayLink = new URL(link).hostname
    } catch {}
    results.push({ title, link, snippet, displayLink })
  }

  return results.slice(0, num)
}

const CallSchema = z.object({
  name: z.string().min(1),
  args: z.record(z.unknown()).optional(),
})

export async function POST(req: NextRequest) {
  try {
    const raw = await req.json().catch(() => null)
    const parsed = CallSchema.safeParse(raw)
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 })
    }

    const name = parsed.data.name
    const args = parsed.data.args || {}

    if (name === "youtube.video") {
      const videoId = String(args.videoId || "").trim()
      if (!YouTubeService.validateVideoId(videoId)) {
        return NextResponse.json({ error: "Invalid videoId" }, { status: 400 })
      }
      const video = await youtubeService.getVideoDetails(videoId)
      if (!video) return NextResponse.json({ result: null, metadata: { tool: name } })
      return NextResponse.json({ result: video, metadata: { tool: name } })
    }

    if (name === "youtube.search") {
      const maxResultsRaw = Number(args.maxResults ?? 6)
      const maxResults = Number.isFinite(maxResultsRaw) ? Math.max(1, Math.min(10, maxResultsRaw)) : 6
      const mood = String(args.mood || "").trim()
      const query = String(args.query || "").trim()
      const videos = mood
        ? await youtubeService.searchWellnessVideos(mood, maxResults)
        : await youtubeService.searchVideos(query || mood, maxResults)
      return NextResponse.json({ result: videos, metadata: { tool: name } })
    }

    if (name === "youtube.recommend_music") {
      const mood = String(args.mood || "calm").trim().toLowerCase()
      const maxResultsRaw = Number(args.maxResults ?? 5)
      const maxResults = Number.isFinite(maxResultsRaw) ? Math.max(1, Math.min(10, maxResultsRaw)) : 5
      const moodMap: Record<string, string> = {
        calm: "calming",
        uplifting: "motivation",
        meditation: "meditation",
        sleep: "sleep",
        focus: "breathing",
      }
      const key = moodMap[mood] || "calming"
      const videos = await youtubeService.searchWellnessVideos(key, maxResults)
      const recommendations = videos.map((v) => ({
        videoId: v.videoId,
        title: v.title,
        artist: v.channelTitle,
        thumbnail: v.thumbnailUrl,
        duration: v.duration,
        mood,
        reasons: [
          mood ? `Phù hợp mood: ${mood}` : undefined,
          v.channelTitle ? `Kênh: ${v.channelTitle}` : undefined,
        ].filter(Boolean),
      }))
      return NextResponse.json({ result: recommendations, metadata: { tool: name } })
    }

    if (name === "web.search") {
      const q = String(args.query || "").trim()
      const numRaw = Number(args.num ?? 6)
      const num = Number.isFinite(numRaw) ? Math.max(1, Math.min(10, numRaw)) : 6
      if (!q) return NextResponse.json({ error: "Missing query" }, { status: 400 })

      const apiKey = (process.env.GOOGLE_CSE_API_KEY || "").trim()
      const cx = (process.env.GOOGLE_CSE_CX || "").trim()
      if (!apiKey || !cx) {
        const items = await searchDuckDuckGo(q, num)
        return NextResponse.json({ result: { query: q, items }, metadata: { tool: name, provider: "duckduckgo" } })
      }

      const googleUrl = new URL("https://www.googleapis.com/customsearch/v1")
      googleUrl.searchParams.set("key", apiKey)
      googleUrl.searchParams.set("cx", cx)
      googleUrl.searchParams.set("q", q)
      googleUrl.searchParams.set("num", String(num))
      googleUrl.searchParams.set("hl", "vi")
      googleUrl.searchParams.set("gl", "vn")
      googleUrl.searchParams.set("safe", "active")

      const resp = await fetch(googleUrl.toString(), { method: "GET" })
      if (!resp.ok) {
        const t = await resp.text().catch(() => "")
        return NextResponse.json({ error: "Upstream error", detail: t || `HTTP ${resp.status}` }, { status: 502 })
      }
      const data = await resp.json()
      const items: WebSearchItem[] = Array.isArray(data?.items)
        ? data.items.map((it: any) => ({
            title: String(it?.title || ""),
            link: String(it?.link || ""),
            snippet: String(it?.snippet || ""),
            displayLink: it?.displayLink ? String(it.displayLink) : undefined,
          })).filter((x: WebSearchItem) => x.title && x.link)
        : []
      return NextResponse.json({ result: { query: q, items }, metadata: { tool: name, provider: "google_cse" } })
    }

    if (name === "graph.status") {
      const cpuBase = resolveCpuServerBaseUrl()
      if (!cpuBase) {
        const result = buildGraphStatusFailure("graph_disabled_no_cpu_url", 0, "CPU_SERVER_URL is not configured", 0)
        return NextResponse.json({
          result,
          metadata: { tool: name, upstream: null, reason: result.reason, status_code: result.status_code, elapsed_ms: 0 },
        })
      }
      const url = `${cpuBase}/v1/graph/status`
      const apiKey = (process.env.GRAPH_API_KEY || "").trim()
      const out = await fetchJsonWithRetry<GraphStatusResult>(
        url,
        { method: "GET", headers: apiKey ? { "x-api-key": apiKey } : undefined },
        { tool: name, attempts: 3 }
      )
      if (!out.ok) {
        const reason = mapGraphFailureReason({
          status: out.status,
          payload: out.json,
          errorKind: out.error_kind,
          errorMessage: out.error_message,
        })
        const statusCode = normalizeGraphStatusCode(out.json, out.status || (reason === "graph_timeout" ? 504 : reason === "graph_404" ? 404 : 503))
        const result = buildGraphStatusFailure(reason, statusCode, extractGraphError(out.json, out.error_message), out.elapsed_ms)
        return NextResponse.json({
          result,
          metadata: {
            tool: name,
            upstream: url,
            attempts: out.attempts,
            elapsed_ms: out.elapsed_ms,
            reason: result.reason,
            status_code: result.status_code,
            error_kind: out.error_kind,
          },
        })
      }
      const result = normalizeGraphStatusPayload(out.json, out.elapsed_ms)
      return NextResponse.json({
        result,
        metadata: {
          tool: name,
          upstream: url,
          attempts: out.attempts,
          elapsed_ms: out.elapsed_ms,
          reason: result.reason,
          status_code: result.status_code,
        },
      })
    }

    if (name === "graph.evidence") {
      const q = String(args.query || "").trim()
      if (!q) return NextResponse.json({ result: { ok: true, query: q, entities: [], edges: [] }, metadata: { tool: name } })
      const limitRaw = Number(args.limit ?? 60)
      const limit = Number.isFinite(limitRaw) ? Math.max(1, Math.min(500, limitRaw)) : 60
      const entityLimitRaw = Number(args.entity_limit ?? args.entityLimit ?? 5)
      const entity_limit = Number.isFinite(entityLimitRaw) ? Math.max(1, Math.min(20, entityLimitRaw)) : 5
      const rel_types = Array.isArray(args.rel_types) ? args.rel_types.map((x: any) => String(x).trim()).filter(Boolean) : undefined

      const cpuBase = resolveCpuServerBaseUrl()
      if (!cpuBase) {
        const result = buildGraphEvidenceFailure(q, "graph_disabled_no_cpu_url", 0, "CPU_SERVER_URL is not configured", 0)
        return NextResponse.json({
          result,
          metadata: { tool: name, upstream: null, reason: result.reason, status_code: result.status_code, elapsed_ms: 0 },
        })
      }
      const url = `${cpuBase}/v1/graph/evidence`
      const apiKey = (process.env.GRAPH_API_KEY || "").trim()
      const body = JSON.stringify({ query: q, limit, entity_limit, ...(rel_types?.length ? { rel_types } : {}) })
      const out = await fetchJsonWithRetry<GraphEvidenceResult>(
        url,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", ...(apiKey ? { "x-api-key": apiKey } : {}) },
          body,
        },
        { tool: name, attempts: 3 }
      )
      if (!out.ok) {
        const graphReason = mapGraphFailureReason({
          status: out.status,
          payload: out.json,
          errorKind: out.error_kind,
          errorMessage: out.error_message,
        })
        const statusCode = normalizeGraphStatusCode(out.json, out.status || (graphReason === "graph_timeout" ? 504 : graphReason === "graph_404" ? 404 : 503))
        const result = buildGraphEvidenceFailure(q, graphReason, statusCode, extractGraphError(out.json, out.error_message), out.elapsed_ms)
        return NextResponse.json({
          result,
          metadata: {
            tool: name,
            upstream: url,
            attempts: out.attempts,
            elapsed_ms: out.elapsed_ms,
            reason: result.reason,
            status_code: result.status_code,
            error_kind: out.error_kind,
          },
        })
      }
      const result = normalizeGraphEvidencePayload(out.json, q, out.elapsed_ms)
      return NextResponse.json({
        result,
        metadata: {
          tool: name,
          upstream: url,
          attempts: out.attempts,
          elapsed_ms: out.elapsed_ms,
          reason: result.reason,
          status_code: result.status_code,
        },
      })
    }

    return NextResponse.json({ error: "Unknown tool" }, { status: 400 })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Internal error" }, { status: 500 })
  }
}

