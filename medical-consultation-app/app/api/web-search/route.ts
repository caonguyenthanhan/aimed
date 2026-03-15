import { NextRequest, NextResponse } from "next/server"

type WebSearchItem = {
  title: string
  link: string
  snippet: string
  displayLink?: string
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

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const q = (url.searchParams.get("q") || "").trim()
    const numRaw = Number(url.searchParams.get("num") || "6")
    const num = Number.isFinite(numRaw) ? Math.max(1, Math.min(10, numRaw)) : 6
    if (!q) {
      return NextResponse.json({ error: "Missing q" }, { status: 400 })
    }

    const apiKey = (process.env.GOOGLE_CSE_API_KEY || "").trim()
    const cx = (process.env.GOOGLE_CSE_CX || "").trim()
    if (!apiKey || !cx) {
      const items = await searchDuckDuckGo(q, num)
      return NextResponse.json({
        query: q,
        items,
        metadata: { provider: "duckduckgo", ts: new Date().toISOString() },
      })
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
      const t = await resp.text()
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

    return NextResponse.json({
      query: q,
      items,
      metadata: { provider: "google_cse", ts: new Date().toISOString() },
    })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Internal error" }, { status: 500 })
  }
}
