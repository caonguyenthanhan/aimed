"use client"

import { useEffect, useRef, useState } from "react"
import { normalizeRuntimeProvider } from "@/lib/runtime-sync"
import {
  classify_query,
  copy_lookup_result,
  get_severity_color,
  get_type_badge_class,
  share_lookup_result,
} from "@/components/health-lookup/health-lookup-utils"
import type {
  HealthLookupHistoryItem,
  HealthLookupResult,
  HealthSuggestion,
  KnowledgeEntity,
  KnowledgeIntervention,
  KnowledgeRelation,
} from "@/components/health-lookup/health-lookup-types"

export function useHealthLookupController() {
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<HealthLookupResult[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [suggestions, setSuggestions] = useState<HealthSuggestion[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [history, setHistory] = useState<HealthLookupHistoryItem[]>([])
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [categoryOpen, setCategoryOpen] = useState(false)
  const [categoryTitle, setCategoryTitle] = useState("")
  const [categoryItems, setCategoryItems] = useState<string[]>([])
  const [authToken, setAuthToken] = useState("")
  const [refQuery, setRefQuery] = useState("")
  const [refLoading, setRefLoading] = useState(false)
  const [refError, setRefError] = useState("")
  const [refEntities, setRefEntities] = useState<KnowledgeEntity[]>([])
  const [refRelations, setRefRelations] = useState<KnowledgeRelation[]>([])
  const [refInterventions, setRefInterventions] = useState<KnowledgeIntervention[]>([])

  useEffect(() => {
    try {
      const raw = localStorage.getItem("healthLookupHistory")
      if (raw) {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed)) {
          setHistory(parsed.slice(0, 10))
        }
      }
    } catch {}
  }, [])

  useEffect(() => {
    try {
      const token = localStorage.getItem("authToken")
      if (token) setAuthToken(token)
    } catch {}
  }, [])

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

  const saveHistory = (query: string, type: string) => {
    const item = { query, type, ts: Date.now() }
    const next = [item, ...history.filter((entry) => entry.query !== query)].slice(0, 10)
    setHistory(next)
    try {
      localStorage.setItem("healthLookupHistory", JSON.stringify(next))
    } catch {}
  }

  const clearHistory = () => {
    setHistory([])
    try {
      localStorage.removeItem("healthLookupHistory")
    } catch {}
  }

  const handleSearch = async (forcedQuery?: string) => {
    const rawQuery = (forcedQuery ?? searchQuery).trim()
    if (!rawQuery) return

    setIsLoading(true)
    setShowSuggestions(false)

    try {
      const lower = rawQuery.toLowerCase()
      const sanitized = lower.replace(/thông tin|thong tin/gi, "").replace(/tìm kiếm|tim kiem/gi, "").replace(/về|ve/gi, "").trim()
      const { mode, type, isMedical } = classify_query(sanitized.length ? sanitized : rawQuery)

      if (!isMedical) {
        const result: HealthLookupResult = {
          id: Date.now(),
          title: rawQuery,
          type: "Không liên quan",
          description: "Câu hỏi không có dấu hiệu liên quan đến y tế. Vui lòng nhập tên bệnh, thuốc hoặc triệu chứng.",
          severity: "low",
        }
        setSearchResults([result])
        setRefQuery("")
        setRefEntities([])
        setRefRelations([])
        setRefInterventions([])
        return
      }

      const queryToSend = sanitized.length ? sanitized : rawQuery
      let provider = "server"
      try {
        const localProvider = typeof window !== "undefined" ? localStorage.getItem("llm_provider") : null
        provider = normalizeRuntimeProvider(localProvider)
      } catch {}

      const response = await fetch("/api/health-lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: queryToSend, mode, provider }),
      })

      const data = await response.json()
      const aiText = typeof data?.response === "string" ? data.response.trim() : ""
      const isSuccess = response.ok && (data?.success === true || aiText.length > 0)
      if (!isSuccess) {
        throw new Error(data?.error || "Tra cứu thất bại")
      }

      const result: HealthLookupResult = {
        id: Date.now(),
        title: queryToSend,
        type,
        description: aiText,
        severity: "low",
      }
      setSearchResults([result])
      saveHistory(queryToSend, type)
      setRefQuery(queryToSend)
      void runRefSearch(queryToSend)
    } catch {
      const fallback: HealthLookupResult = {
        id: Date.now(),
        title: "Không thể tra cứu",
        type: "Lỗi",
        description: "Xin lỗi, hệ thống tra cứu đang gặp sự cố. Vui lòng thử lại sau hoặc tham khảo ý kiến bác sĩ chuyên khoa.",
        severity: "medium",
      }
      setSearchResults([fallback])
      const query = rawQuery.trim()
      setRefQuery(query)
      void runRefSearch(query)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchSuggestions = async (query: string) => {
    try {
      const [benhResponse, thuocResponse] = await Promise.all([
        fetch(`/api/health-db/benh?q=${encodeURIComponent(query)}`),
        fetch(`/api/health-db/thuoc?q=${encodeURIComponent(query)}`),
      ])
      const benhData = await benhResponse.json()
      const thuocData = await thuocResponse.json()
      const benhItems = Array.isArray(benhData?.items)
        ? benhData.items.slice(0, 5).map((item: any) => ({ name: item.name || String(item), type: "Bệnh lý" as const }))
        : []
      const thuocItems = Array.isArray(thuocData?.items)
        ? thuocData.items.slice(0, 5).map((item: any) => ({ name: item.name || String(item), type: "Thuốc" as const }))
        : []
      setSuggestions([...benhItems, ...thuocItems])
      setShowSuggestions(true)
    } catch {
      setSuggestions([])
      setShowSuggestions(false)
    }
  }

  useEffect(() => {
    const query = searchQuery.trim()
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }
    if (query.length < 2) {
      setSuggestions([])
      setShowSuggestions(false)
      return
    }
    const timeoutId = setTimeout(() => void fetchSuggestions(query), 250)
    debounceRef.current = timeoutId
    return () => {
      clearTimeout(timeoutId)
    }
  }, [searchQuery])

  const openCategory = async (kind: "Bệnh lý" | "Thuốc") => {
    try {
      const endpoint = kind === "Bệnh lý" ? "/api/health-db/benh" : "/api/health-db/thuoc"
      const response = await fetch(endpoint)
      const data = await response.json()
      const items = Array.isArray(data?.items) ? data.items.map((item: any) => item?.name || String(item)) : []
      setCategoryTitle(kind)
      setCategoryItems(items)
      setCategoryOpen(true)
    } catch {
      setCategoryTitle(kind)
      setCategoryItems([])
      setCategoryOpen(true)
    }
  }

  return {
    searchQuery,
    setSearchQuery,
    searchResults,
    isLoading,
    suggestions,
    showSuggestions,
    setShowSuggestions,
    history,
    clearHistory,
    categoryOpen,
    setCategoryOpen,
    categoryTitle,
    categoryItems,
    refQuery,
    refLoading,
    refError,
    refEntities,
    refRelations,
    refInterventions,
    handleSearch,
    openCategory,
    runRefSearch,
    getSeverityColor: get_severity_color,
    getTypeBadgeClass: get_type_badge_class,
    copyResult: copy_lookup_result,
    shareResult: share_lookup_result,
  }
}
