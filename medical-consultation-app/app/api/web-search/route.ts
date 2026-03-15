import { NextRequest, NextResponse } from "next/server"

type WebSearchItem = {
  title: string
  link: string
  snippet: string
  displayLink?: string
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
      return NextResponse.json({ error: "Missing GOOGLE_CSE_API_KEY or GOOGLE_CSE_CX" }, { status: 500 })
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

