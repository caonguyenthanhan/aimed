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
const RIGHT_RATIO_KEY = "mcs_news_right_ratio_v1"
const DEFAULT_QUERY = "tin-tuc-y-khoa"
const DEFAULT_GOOGLE_NEWS_URL = `https://www.google.com.vn/search?tbm=nws&q=${encodeURIComponent(DEFAULT_QUERY)}`

type LastScreening = {
  assessment_id?: string
  title?: string
  score?: number
  level?: string
  ts?: number
}

type KnowledgeEntity = {
  id: string
  name: string
  category: string
  specialty?: string
  description?: string
}

type KnowledgeRelation = {
  source_id: string
  target_id: string
  relation_type: string
  evidence_level?: number
  evidence_note?: string
  source_name?: string
  target_name?: string
}

type KnowledgeIntervention = {
  id: string
  entity_id: string
  entity_name?: string
  title: string
  target_care_level: number
  content_markdown: string
}

export default function TinTucYKhoaPage() {
  const [q, setQ] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [items, setItems] = useState<WebSearchItem[]>([])
  const [selectedUrl, setSelectedUrl] = useState<string>("")
  const [notice, setNotice] = useState("")
  const [topics, setTopics] = useState<string[]>([])
  const [rightRatio, setRightRatio] = useState(0.62)
  const [authToken, setAuthToken] = useState("")
  const [refQuery, setRefQuery] = useState("")
  const [refLoading, setRefLoading] = useState(false)
  const [refError, setRefError] = useState("")
  const [refEntities, setRefEntities] = useState<KnowledgeEntity[]>([])
  const [refRelations, setRefRelations] = useState<KnowledgeRelation[]>([])
  const [refInterventions, setRefInterventions] = useState<KnowledgeIntervention[]>([])

  const canSearch = useMemo(() => q.trim().length >= 2, [q])

  const applyRightRatio = (value: number) => {
    const next = Math.max(0.5, Math.min(0.8, value))
    setRightRatio(next)
    try {
      localStorage.setItem(RIGHT_RATIO_KEY, String(next))
    } catch {}
  }

  const runRefSearch = async (query: string) => {
    const qq = (query || "").trim()
    if (!qq) return
    if (!authToken) {
      setRefError("Đăng nhập để xem dữ liệu tham khảo.")
      setRefEntities([])
      setRefRelations([])
      setRefInterventions([])
      return
    }
    setRefError("")
    setRefLoading(true)
    try {
      const resp = await fetch(`/api/backend/v1/knowledge/search`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({ query: qq, limit: 8, include_relations: true, include_interventions: true }),
      })
      if (!resp.ok) {
        const t = await resp.text()
        throw new Error(t || `HTTP ${resp.status}`)
      }
      const data = (await resp.json()) as {
        entities?: KnowledgeEntity[]
        relations?: KnowledgeRelation[]
        interventions?: KnowledgeIntervention[]
      }
      setRefEntities(Array.isArray(data?.entities) ? data.entities : [])
      setRefRelations(Array.isArray(data?.relations) ? data.relations : [])
      setRefInterventions(Array.isArray(data?.interventions) ? data.interventions : [])
    } catch (e: any) {
      setRefError(e?.message || "Không tải được dữ liệu tham khảo")
      setRefEntities([])
      setRefRelations([])
      setRefInterventions([])
    } finally {
      setRefLoading(false)
    }
  }

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
      const first = next?.[0]
      const firstUrl = first?.link || ""
      const firstRef = (first?.title || query).trim()
      setSelectedUrl(firstUrl)
      setRefQuery(firstRef)
      void runRefSearch(firstRef)
    } catch (e: any) {
      setError(e?.message || "Không tìm kiếm được")
      setItems([])
      setSelectedUrl("")
      setRefQuery(query)
      void runRefSearch(query)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    try {
      const t = localStorage.getItem("authToken")
      if (t) setAuthToken(t)
    } catch {}
    try {
      const raw = localStorage.getItem(RIGHT_RATIO_KEY)
      if (raw) {
        const v = Number(raw)
        if (!Number.isNaN(v)) applyRightRatio(v)
      }
    } catch {}

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

        <div className="flex flex-col gap-4 lg:flex-row">
          <div
            className="rounded-xl border bg-background p-4 space-y-3 lg:flex-none"
            style={{
              flexBasis: `${Math.round((1 - rightRatio) * 1000) / 10}%`,
              maxWidth: `${Math.round((1 - rightRatio) * 1000) / 10}%`,
            }}
          >
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
                    onClick={() => {
                      setSelectedUrl(it.link)
                      const rq = (it.title || it.link).trim()
                      setRefQuery(rq)
                      void runRefSearch(rq)
                    }}
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

          <div
            className="rounded-xl border bg-background p-4 space-y-3 overflow-hidden flex flex-col min-h-[60vh] lg:flex-none"
            style={{ flexBasis: `${Math.round(rightRatio * 1000) / 10}%`, maxWidth: `${Math.round(rightRatio * 1000) / 10}%` }}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm font-medium">Nhúng trang</div>
              <div className="hidden md:flex items-center gap-2">
                <div className="text-xs text-muted-foreground">{Math.round(rightRatio * 100)}%</div>
                <input
                  type="range"
                  min={50}
                  max={80}
                  value={Math.round(rightRatio * 100)}
                  onChange={(e) => applyRightRatio(Number(e.target.value) / 100)}
                />
              </div>
            </div>
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

            <div className="rounded-lg border p-3 bg-background">
              <div className="flex items-center justify-between gap-2">
                <div className="text-sm font-medium">Dữ liệu tham khảo</div>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!refQuery.trim() || refLoading}
                  onClick={() => void runRefSearch(refQuery)}
                >
                  {refLoading ? "Đang tải..." : "Làm mới"}
                </Button>
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {refQuery ? `Từ khóa: ${refQuery}` : "Chọn kết quả hoặc tìm kiếm để xem tham khảo."}
              </div>
              {refError ? <div className="text-sm text-red-600 whitespace-pre-wrap mt-2">{refError}</div> : null}
              {!refError && !refLoading && !refEntities.length ? (
                <div className="text-sm text-muted-foreground mt-2">Chưa có dữ liệu.</div>
              ) : null}
              {refEntities.length ? (
                <div className="mt-3 space-y-2">
                  {refEntities.slice(0, 6).map((e) => (
                    <div key={e.id} className="rounded-md border p-2">
                      <div className="text-sm font-medium">{e.name}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {String(e.category || "").toUpperCase()}
                        {e.specialty ? ` • ${e.specialty}` : ""}
                      </div>
                      {e.description ? <div className="text-xs text-muted-foreground mt-1 line-clamp-3">{e.description}</div> : null}
                    </div>
                  ))}
                </div>
              ) : null}
              {refInterventions.length ? (
                <div className="mt-3 space-y-2">
                  <div className="text-xs font-medium text-muted-foreground">Can thiệp gợi ý</div>
                  {refInterventions.slice(0, 3).map((itv) => (
                    <div key={itv.id} className="rounded-md border p-2">
                      <div className="text-sm font-medium">{itv.title}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {itv.entity_name ? `${itv.entity_name} • ` : ""}
                        Level {itv.target_care_level}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1 line-clamp-4 whitespace-pre-wrap">{itv.content_markdown}</div>
                    </div>
                  ))}
                </div>
              ) : null}
              {refRelations.length ? (
                <div className="mt-3 space-y-2">
                  <div className="text-xs font-medium text-muted-foreground">Quan hệ liên quan</div>
                  {refRelations.slice(0, 6).map((r, idx) => (
                    <div key={`${r.source_id}-${r.target_id}-${r.relation_type}-${idx}`} className="text-xs text-muted-foreground">
                      {r.source_name || r.source_id} → {r.relation_type} → {r.target_name || r.target_id}
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
