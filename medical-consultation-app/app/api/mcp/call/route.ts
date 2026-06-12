import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { YouTubeService, youtubeService } from "@/lib/youtube-service"

type WebSearchItem = {
  title: string
  link: string
  snippet: string
  displayLink?: string
}

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

async function fetchJsonWithRetry(url: string, init: RequestInit, opts: { tool: string; attempts: number }) {
  const timeoutMs = resolveToolTimeoutMs(opts.tool)
  const maxAttempts = Math.max(1, Math.min(3, opts.attempts))
  let lastErr: any = null
  const startedAt = nowMs()
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const controller = new AbortController()
    const t = setTimeout(() => controller.abort(), timeoutMs)
    try {
      const resp = await fetch(url, { ...init, signal: controller.signal })
      clearTimeout(t)
      const json = await resp.json().catch(() => null)
      if (resp.ok) {
        return { ok: true as const, status: resp.status, json, attempts: attempt, elapsed_ms: nowMs() - startedAt }
      }
      if (resp.status === 401 || resp.status === 403 || resp.status === 400) {
        return { ok: false as const, status: resp.status, json, attempts: attempt, elapsed_ms: nowMs() - startedAt }
      }
      lastErr = { status: resp.status, json }
    } catch (e: any) {
      clearTimeout(t)
      lastErr = e
    }
    if (attempt < maxAttempts) {
      const backoff = 250 * Math.pow(2, attempt - 1) + Math.floor(Math.random() * 120)
      await sleep(backoff)
    }
  }
  return { ok: false as const, status: 0, json: lastErr, attempts: maxAttempts, elapsed_ms: nowMs() - startedAt }
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
  args: z.record(z.any()).optional(),
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
      const cpuBaseRaw = (process.env.CPU_SERVER_URL || process.env.BACKEND_URL || "").trim().replace(/\/$/, "")
      const isProd = process.env.VERCEL === "1" || process.env.NODE_ENV === "production"
      if (!cpuBaseRaw && isProd) {
        return NextResponse.json({
          result: { ok: false, connected: false, reason: "graph_disabled_no_cpu_url" },
          metadata: { tool: name, upstream: null, reason: "graph_disabled_no_cpu_url" },
        })
      }
      const cpuBase = cpuBaseRaw || "http://127.0.0.1:8000"
      const url = `${cpuBase}/v1/graph/status`
      const apiKey = (process.env.GRAPH_API_KEY || "").trim()
      const out = await fetchJsonWithRetry(
        url,
        { method: "GET", headers: apiKey ? { "x-api-key": apiKey } : undefined },
        { tool: name, attempts: 3 }
      )
      if (!out.ok) {
        return NextResponse.json({
          result: { ok: false, connected: false, error: out.json || (out.status ? `HTTP ${out.status}` : "Upstream error") },
          metadata: { tool: name, upstream: url, attempts: out.attempts, elapsed_ms: out.elapsed_ms },
        })
      }
      return NextResponse.json({ result: out.json, metadata: { tool: name, upstream: url, attempts: out.attempts, elapsed_ms: out.elapsed_ms } })
    }

    if (name === "graph.evidence") {
      const q = String(args.query || "").trim()
      if (!q) return NextResponse.json({ result: { ok: true, query: q, entities: [], edges: [] }, metadata: { tool: name } })
      const limitRaw = Number(args.limit ?? 60)
      const limit = Number.isFinite(limitRaw) ? Math.max(1, Math.min(500, limitRaw)) : 60
      const entityLimitRaw = Number(args.entity_limit ?? args.entityLimit ?? 5)
      const entity_limit = Number.isFinite(entityLimitRaw) ? Math.max(1, Math.min(20, entityLimitRaw)) : 5
      const rel_types = Array.isArray(args.rel_types) ? args.rel_types.map((x: any) => String(x).trim()).filter(Boolean) : undefined

      const cpuBaseRaw = (process.env.CPU_SERVER_URL || process.env.BACKEND_URL || "").trim().replace(/\/$/, "")
      const isProd = process.env.VERCEL === "1" || process.env.NODE_ENV === "production"
      if (!cpuBaseRaw && isProd) {
        return NextResponse.json({
          result: { ok: false, query: q, entities: [], edges: [], reason: "graph_disabled_no_cpu_url" },
          metadata: { tool: name, upstream: null, reason: "graph_disabled_no_cpu_url", status_code: 0 },
        })
      }
      const cpuBase = cpuBaseRaw || "http://127.0.0.1:8000"
      const url = `${cpuBase}/v1/graph/evidence`
      const apiKey = (process.env.GRAPH_API_KEY || "").trim()
      const body = JSON.stringify({ query: q, limit, entity_limit, ...(rel_types?.length ? { rel_types } : {}) })
      const out = await fetchJsonWithRetry(
        url,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", ...(apiKey ? { "x-api-key": apiKey } : {}) },
          body,
        },
        { tool: name, attempts: 3 }
      )
      if (!out.ok) {
        const graphReason = out.status === 404 ? "graph_404"
          : (out.status === 0 || String(out.json || "").includes("abort") || String(out.json || "").includes("timeout")) ? "graph_timeout"
          : "graph_down"
        return NextResponse.json({
          result: { ok: false, query: q, entities: [], edges: [], reason: graphReason, error: out.json || (out.status ? `HTTP ${out.status}` : "Upstream error") },
          metadata: { tool: name, upstream: url, attempts: out.attempts, elapsed_ms: out.elapsed_ms, reason: graphReason, status_code: out.status ?? 0 },
        })
      }
      return NextResponse.json({ result: out.json, metadata: { tool: name, upstream: url, attempts: out.attempts, elapsed_ms: out.elapsed_ms } })
    }

    return NextResponse.json({ error: "Unknown tool" }, { status: 400 })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Internal error" }, { status: 500 })
  }
}

