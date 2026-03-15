"use client"

import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

type WebSearchItem = {
  title: string
  link: string
  snippet: string
  displayLink?: string
}

const LAST_SCREENING_KEY = "mcs_last_screening_v1"
const DEFAULT_QUERY = "tin-tuc-y-khoa"
const DEFAULT_GOOGLE_NEWS_URL = `https://www.google.com.vn/search?tbm=nws&q=${encodeURIComponent(DEFAULT_QUERY)}`

type LastScreening = {
  assessment_id?: string
  title?: string
  score?: number
  level?: string
  ts?: number
}

export default function TinTucYKhoaPage() {
  const [q, setQ] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [items, setItems] = useState<WebSearchItem[]>([])
  const [selectedUrl, setSelectedUrl] = useState<string>("")
  const [notice, setNotice] = useState("")
  const [topics, setTopics] = useState<string[]>([])

  const canSearch = useMemo(() => q.trim().length >= 2, [q])

  const runSearch = async (forcedQuery?: string) => {
    const query = (forcedQuery ?? q).trim()
    if (!query) return
    setError("")
    setLoading(true)
    try {
      const resp = await fetch(`/api/web-search?q=${encodeURIComponent(query)}&num=8`, { method: "GET" })
      if (!resp.ok) {
        const t = await resp.text()
        throw new Error(t || `HTTP ${resp.status}`)
      }
      const data = (await resp.json()) as { items?: WebSearchItem[] }
      const next = Array.isArray(data?.items) ? data.items : []
      setItems(next)
      setSelectedUrl(next?.[0]?.link || "")
    } catch (e: any) {
      setError(e?.message || "Không tìm kiếm được")
      setItems([])
      setSelectedUrl("")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let last: LastScreening | null = null
    try {
      const raw = localStorage.getItem(LAST_SCREENING_KEY)
      if (raw) last = JSON.parse(raw) as LastScreening
    } catch {}

    const level = String(last?.level || "").toLowerCase()
    const negative =
      level.includes("nặng") ||
      level.includes("trung bình") ||
      level.includes("cao") ||
      level.includes("nguy cơ")

    if (negative) {
      setNotice("Nếu bạn đang thấy căng thẳng hoặc lo lắng, hãy đọc chậm lại, hít thở sâu, và ưu tiên nội dung mang tính trấn an. Bạn không cần phải xử lý mọi thông tin tiêu cực ngay lúc này.")
      setTopics([
        "kỹ thuật thở giảm lo âu",
        "vệ sinh giấc ngủ",
        "thiền định mindfulness",
        "cách giảm stress",
        "tư vấn tâm lý khi cần",
        DEFAULT_QUERY,
      ])
      setQ("kỹ thuật thở giảm lo âu")
      void runSearch("kỹ thuật thở giảm lo âu")
      return
    }

    if (last?.level) {
      setNotice(`Gợi ý theo kết quả sàng lọc gần nhất: ${last.level} (${last.score ?? "?"}).`)
    } else {
      setNotice("")
    }
    setTopics([
      "khuyến cáo y khoa mới",
      "tiêm chủng và phòng bệnh",
      "dinh dưỡng và vận động",
      "y tế cộng đồng",
      DEFAULT_QUERY,
    ])
    setQ(DEFAULT_QUERY)
    void runSearch(DEFAULT_QUERY)
  }, [])

  return (
    <div className="h-[calc(100dvh-4rem)] overflow-y-auto p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-4 pb-10">
        <div className="space-y-1">
          <div className="text-xl font-semibold">Tin tức y khoa</div>
          <div className="text-sm text-muted-foreground">
            Tìm link y khoa và nhúng vào web để đọc nhanh.
          </div>
        </div>

        {notice ? (
          <div className="rounded-xl border bg-background p-3">
            <div className="text-sm whitespace-pre-wrap">{notice}</div>
          </div>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => window.open(DEFAULT_GOOGLE_NEWS_URL, "_blank", "noopener,noreferrer")}>
            Mở Google News mặc định
          </Button>
          {topics.map((t) => (
            <Button
              key={t}
              variant="outline"
              size="sm"
              onClick={() => {
                setQ(t)
                void runSearch(t)
              }}
            >
              {t}
            </Button>
          ))}
        </div>

        <div className="rounded-xl border bg-background p-4 flex flex-col md:flex-row gap-2">
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Ví dụ: khuyến cáo WHO về cúm mùa 2026"
            onKeyDown={(e) => {
              if (e.key === "Enter" && canSearch && !loading) {
                e.preventDefault()
                void runSearch()
              }
            }}
          />
          <Button onClick={() => runSearch()} disabled={!canSearch || loading}>
            {loading ? "Đang tìm..." : "Tìm kiếm"}
          </Button>
          {selectedUrl ? (
            <Button variant="outline" onClick={() => window.open(selectedUrl, "_blank", "noopener,noreferrer")}>
              Mở tab mới
            </Button>
          ) : null}
        </div>

        {error ? (
          <div className="rounded-xl border bg-background p-3">
            <div className="text-sm text-red-600 whitespace-pre-wrap">{error}</div>
          </div>
        ) : null}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="rounded-xl border bg-background p-4 space-y-3">
            <div className="text-sm font-medium">Kết quả</div>
            {!items.length && !loading ? (
              <div className="text-sm text-muted-foreground">Chưa có kết quả.</div>
            ) : null}
            <div className="space-y-2">
              {items.map((it) => {
                const active = it.link === selectedUrl
                return (
                  <button
                    key={it.link}
                    type="button"
                    onClick={() => setSelectedUrl(it.link)}
                    className={`w-full text-left rounded-lg border p-3 hover:bg-muted transition-colors ${active ? "bg-muted" : ""}`}
                  >
                    <div className="text-sm font-medium line-clamp-2">{it.title}</div>
                    <div className="text-xs text-muted-foreground mt-1 line-clamp-2">{it.snippet}</div>
                    <div className="text-xs text-blue-600 mt-1 break-all">{it.displayLink || it.link}</div>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="rounded-xl border bg-background p-4 space-y-3 overflow-hidden flex flex-col min-h-[60vh]">
            <div className="text-sm font-medium">Nhúng trang</div>
            {!selectedUrl ? (
              <div className="text-sm text-muted-foreground">Chọn một kết quả để nhúng.</div>
            ) : (
              <iframe
                key={selectedUrl}
                src={selectedUrl}
                className="w-full flex-1 rounded-lg border"
                referrerPolicy="no-referrer"
                sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox"
                title="Medical news embed"
              />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
