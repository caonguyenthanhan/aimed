"use client"

import { useEffect, useMemo, useState } from "react"
import { getCarePlan, getLastScreening } from "@/lib/screening-store"
import {
  DEFAULT_QUERY,
  KnowledgeEntity,
  KnowledgeIntervention,
  KnowledgeRelation,
  RIGHT_RATIO_KEY,
  WebSearchItem,
} from "@/components/medical-news/medical-news-types"

export function useMedicalNewsController() {
  const [q, setQ] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [items, setItems] = useState<WebSearchItem[]>([])
  const [selectedUrl, setSelectedUrl] = useState<string>("")
  const [notice, setNotice] = useState("")
  const [topics, setTopics] = useState<string[]>([])
  const [rightRatio, setRightRatio] = useState(0.62)
  const [isLarge, setIsLarge] = useState(false)
  const [authToken, setAuthToken] = useState("")
  const [refQuery, setRefQuery] = useState("")
  const [refLoading, setRefLoading] = useState(false)
  const [refError, setRefError] = useState("")
  const [refEntities, setRefEntities] = useState<KnowledgeEntity[]>([])
  const [refRelations, setRefRelations] = useState<KnowledgeRelation[]>([])
  const [refInterventions, setRefInterventions] = useState<KnowledgeIntervention[]>([])

  const canSearch = useMemo(() => q.trim().length >= 2, [q])

  useEffect(() => {
    if (typeof window === "undefined") return
    const mediaQuery = window.matchMedia("(min-width: 1024px)")
    const update = () => setIsLarge(!!mediaQuery.matches)
    update()
    try {
      mediaQuery.addEventListener("change", update)
      return () => mediaQuery.removeEventListener("change", update)
    } catch {
      mediaQuery.addListener(update)
      return () => mediaQuery.removeListener(update)
    }
  }, [])

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
      const response = await fetch(`/api/backend/v1/knowledge/search`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({ query: qq, limit: 8, include_relations: true, include_interventions: true }),
      })
      if (!response.ok) {
        const text = await response.text()
        throw new Error(text || `HTTP ${response.status}`)
      }
      const data = (await response.json()) as {
        entities?: KnowledgeEntity[]
        relations?: KnowledgeRelation[]
        interventions?: KnowledgeIntervention[]
      }
      setRefEntities(Array.isArray(data?.entities) ? data.entities : [])
      setRefRelations(Array.isArray(data?.relations) ? data.relations : [])
      setRefInterventions(Array.isArray(data?.interventions) ? data.interventions : [])
    } catch (reason: any) {
      setRefError(reason?.message || "Không tải được dữ liệu tham khảo")
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
      const response = await fetch(`/api/web-search?q=${encodeURIComponent(query)}&num=8`, { method: "GET" })
      if (!response.ok) {
        const text = await response.text()
        throw new Error(text || `HTTP ${response.status}`)
      }
      const data = (await response.json()) as { items?: WebSearchItem[] }
      const next = Array.isArray(data?.items) ? data.items : []
      setItems(next)
      const first = next?.[0]
      const firstUrl = first?.link || ""
      const firstRef = (first?.title || query).trim()
      setSelectedUrl(firstUrl)
      setRefQuery(firstRef)
      void runRefSearch(firstRef)
    } catch (reason: any) {
      setError(reason?.message || "Không tìm kiếm được")
      setItems([])
      setSelectedUrl("")
      setRefQuery(query)
      void runRefSearch(query)
    } finally {
      setLoading(false)
    }
  }

  const selectItem = (item: WebSearchItem) => {
    setSelectedUrl(item.link)
    const nextRef = (item.title || item.link).trim()
    setRefQuery(nextRef)
    void runRefSearch(nextRef)
  }

  useEffect(() => {
    try {
      const token = localStorage.getItem("authToken")
      if (token) setAuthToken(token)
    } catch {}
    try {
      const raw = localStorage.getItem(RIGHT_RATIO_KEY)
      if (raw) {
        const value = Number(raw)
        if (!Number.isNaN(value)) applyRightRatio(value)
      }
    } catch {}

    const plan = (() => {
      try {
        return getCarePlan()
      } catch {
        return null
      }
    })()

    const last = (() => {
      try {
        return getLastScreening()
      } catch {
        return null
      }
    })()

    if (plan?.severity === "high") {
      setNotice("Nếu bạn đang thấy căng thẳng hoặc lo lắng, hãy đọc chậm lại, hít thở sâu, và ưu tiên nội dung mang tính trấn an. Bạn không cần phải xử lý mọi thông tin tiêu cực ngay lúc này.")
      setTopics([...(Array.isArray(plan?.suggestedArticles) ? plan.suggestedArticles : []), DEFAULT_QUERY])
      const first = (Array.isArray(plan?.suggestedArticles) ? plan.suggestedArticles[0] : "") || "kỹ thuật thở giảm lo âu"
      setQ(first)
      void runSearch(first)
      return
    }

    if (last?.level) {
      setNotice(`Gợi ý theo kết quả sàng lọc gần nhất: ${last.title} • ${last.level} (${last.score ?? "?"}).`)
    } else {
      setNotice("")
    }

    setTopics([
      ...(Array.isArray(plan?.suggestedArticles)
        ? plan.suggestedArticles.slice(0, 4)
        : ["khuyến cáo y khoa mới", "tiêm chủng và phòng bệnh", "dinh dưỡng và vận động", "y tế cộng đồng"]),
      DEFAULT_QUERY,
    ])
    setQ(DEFAULT_QUERY)
    void runSearch(DEFAULT_QUERY)
  }, [])

  return {
    q,
    setQ,
    loading,
    error,
    items,
    selectedUrl,
    setSelectedUrl,
    notice,
    topics,
    rightRatio,
    isLarge,
    refQuery,
    refLoading,
    refError,
    refEntities,
    refRelations,
    refInterventions,
    canSearch,
    applyRightRatio,
    runRefSearch,
    runSearch,
    selectItem,
  }
}
