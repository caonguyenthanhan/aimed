"use client"

import { useEffect, useState } from "react"
import { Search, Book, Pill, Activity, AlertCircle, CheckCircle, Clock, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

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

export function HealthLookup() {
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [suggestions, setSuggestions] = useState<{ name: string, type: 'Thuốc' | 'Bệnh lý' }[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [history, setHistory] = useState<{ query: string, type: string, ts: number }[]>([])
  const [debounceId, setDebounceId] = useState<any>(null)
  const [categoryOpen, setCategoryOpen] = useState(false)
  const [categoryTitle, setCategoryTitle] = useState<string>('')
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
      const raw = localStorage.getItem('healthLookupHistory')
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
      const t = localStorage.getItem("authToken")
      if (t) setAuthToken(t)
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

  const saveHistory = (q: string, type: string) => {
    const item = { query: q, type, ts: Date.now() }
    const next = [item, ...history.filter(h => h.query !== q)].slice(0, 10)
    setHistory(next)
    try {
      localStorage.setItem('healthLookupHistory', JSON.stringify(next))
    } catch {}
  }

  const clearHistory = () => {
    setHistory([])
    try {
      localStorage.removeItem('healthLookupHistory')
    } catch {}
  }

  const classifyQuery = (q: string) => {
    const text = q.toLowerCase()
    const drugHints = [
      'thuốc', 'viên', 'mg', 'mcg', 'ml', '%', 'dạng', 'sirô', 'siro', 'kem', 'mỡ', 'ống', 'chai', 'hàm lượng', 'liều'
    ]
    const diseaseHints = [
      'bệnh', 'hội chứng', 'viêm', 'ung thư', 'tiểu đường', 'cao huyết áp', 'tim mạch', 'hen', 'suy', 'nhiễm', 'vi rút', 'virus', 'vi khuẩn'
    ]
    const symptomHints = [
      'triệu chứng', 'dấu hiệu', 'đau', 'nhức', 'sốt', 'ho', 'mệt', 'mệt mỏi', 'chóng mặt', 'buồn nôn', 'phát ban', 'khó thở', 'tiêu chảy', 'táo bón', 'đau đầu'
    ]
    const medicalContextHints = [
      'chẩn đoán', 'điều trị', 'phòng ngừa', 'tác dụng phụ', 'dược', 'y khoa', 'bác sĩ', 'liều dùng'
    ]
    const isDrug = drugHints.some(k => text.includes(k)) || /\b\d+\s?(mg|ml|mcg|%)(\b|$)/.test(text)
    const isSymptom = symptomHints.some(k => text.includes(k))
    const isDisease = diseaseHints.some(k => text.includes(k))
    const looksMedical = isDrug || isSymptom || isDisease || medicalContextHints.some(k => text.includes(k))
    if (isDrug) return { mode: 'drug', type: 'Thuốc', isMedical: true }
    if (isDisease) return { mode: 'disease', type: 'Bệnh lý', isMedical: true }
    if (isSymptom) return { mode: 'symptom', type: 'Triệu chứng', isMedical: true }
    return { mode: undefined, type: looksMedical ? 'Thông tin y khoa' : 'Không liên quan', isMedical: looksMedical }
  }

  const handleSearch = async () => {
    if (!searchQuery.trim()) return

    setIsLoading(true)

    try {
      const lower = searchQuery.toLowerCase()
      const sanitized = lower
        .replace(/thông tin|thong tin/gi, '')
        .replace(/tìm kiếm|tim kiem/gi, '')
        .replace(/về|ve/gi, '')
        .trim()
      const { mode, type, isMedical } = classifyQuery(sanitized.length ? sanitized : searchQuery)

      if (!isMedical) {
        const result = {
          id: Date.now(),
          title: searchQuery.trim(),
          type: 'Không liên quan',
          description: 'Câu hỏi không có dấu hiệu liên quan đến y tế. Vui lòng nhập tên bệnh, thuốc hoặc triệu chứng.',
          severity: 'low'
        }
        setSearchResults([result])
        setRefQuery("")
        setRefEntities([])
        setRefRelations([])
        setRefInterventions([])
        return
      }

      const queryToSend = sanitized.length ? sanitized : searchQuery
      let provider: string = 'server'
      try {
        const p = typeof window !== 'undefined' ? localStorage.getItem('llm_provider') : null
        if (p === 'gemini' || p === 'server') provider = p
      } catch {}
      const resp = await fetch('/api/health-lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: queryToSend, mode, provider })
      })

      const data = await resp.json()
      const aiText: string = typeof data?.response === 'string' ? data.response.trim() : ''
      const isSuccess = resp.ok && ((data?.success === true) || aiText.length > 0)
      if (!isSuccess) {
        throw new Error(data?.error || 'Tra cứu thất bại')
      }
      const result = {
        id: Date.now(),
        title: queryToSend,
        type: type,
        description: aiText,
        severity: 'low'
      }
      setSearchResults([result])
      saveHistory(queryToSend, type)
      setRefQuery(queryToSend)
      void runRefSearch(queryToSend)
    } catch (e: any) {
      const fallback = {
        id: Date.now(),
        title: 'Không thể tra cứu',
        type: 'Lỗi',
        description: 'Xin lỗi, hệ thống tra cứu đang gặp sự cố. Vui lòng thử lại sau hoặc tham khảo ý kiến bác sĩ chuyên khoa.',
        severity: 'medium'
      }
      setSearchResults([fallback])
      const q = searchQuery.trim()
      setRefQuery(q)
      void runRefSearch(q)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchSuggestions = async (q: string) => {
    try {
      const [benhRes, thuocRes] = await Promise.all([
        fetch(`/api/health-db/benh?q=${encodeURIComponent(q)}`),
        fetch(`/api/health-db/thuoc?q=${encodeURIComponent(q)}`)
      ])
      const benhData = await benhRes.json()
      const thuocData = await thuocRes.json()
      const benhItems = Array.isArray(benhData?.items) ? benhData.items.slice(0, 5).map((x: any) => ({ name: x.name || String(x), type: 'Bệnh lý' as const })) : []
      const thuocItems = Array.isArray(thuocData?.items) ? thuocData.items.slice(0, 5).map((x: any) => ({ name: x.name || String(x), type: 'Thuốc' as const })) : []
      setSuggestions([...benhItems, ...thuocItems])
      setShowSuggestions(true)
    } catch {
      setSuggestions([])
      setShowSuggestions(false)
    }
  }

  useEffect(() => {
    const q = searchQuery.trim()
    if (debounceId) {
      clearTimeout(debounceId)
    }
    if (q.length < 2) {
      setSuggestions([])
      setShowSuggestions(false)
      return
    }
    const id = setTimeout(() => fetchSuggestions(q), 250)
    setDebounceId(id)
    return () => {
      if (id) clearTimeout(id)
    }
  }, [searchQuery])

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "high": return "bg-red-100 text-red-800 border-red-200"
      case "medium": return "bg-yellow-100 text-yellow-800 border-yellow-200"
      case "low": return "bg-green-100 text-green-800 border-green-200"
      default: return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "Bệnh lý": return <Activity className="h-4 w-4" />
      case "Thuốc": return <Pill className="h-4 w-4" />
      default: return <Book className="h-4 w-4" />
    }
  }

  const getTypeBadgeClass = (type: string) => {
    switch (type) {
      case "Thuốc": return "bg-[#48bb78]/15 text-[#2f855a] border-[#48bb78]/40"
      case "Bệnh lý": return "bg-[#f56565]/15 text-[#c53030] border-[#f56565]/40"
      case "Triệu chứng": return "bg-[#9f7aea]/15 text-[#6b46c1] border-[#9f7aea]/40"
      default: return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  const copyResult = (result: any) => {
    const text = `${result.title}\n${typeof result.description === 'string' ? result.description : ''}`.trim()
    try {
      navigator.clipboard.writeText(text)
    } catch {}
  }

  const shareResult = async (result: any) => {
    const text = `${result.title}\n${typeof result.description === 'string' ? result.description : ''}`.trim()
    try {
      if ((navigator as any).share) {
        await (navigator as any).share({ title: result.title, text })
      } else {
        navigator.clipboard.writeText(text)
      }
    } catch {}
  }

  return (
    <div suppressHydrationWarning className="h-full overflow-y-auto bg-white dark:bg-slate-950 hero-gradient dark:hero-gradient-dark" 
         style={{ 
           WebkitOverflowScrolling: 'touch',
           scrollBehavior: 'smooth'
         }}>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-blue-100 dark:bg-blue-950/30 rounded-xl mb-4">
            <Search className="h-7 w-7 text-blue-600 dark:text-blue-400" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-slate-50 mb-2">
            Tra cứu Thông tin Y tế
          </h1>
          <p className="text-base text-slate-600 dark:text-slate-400">
            Tìm kiếm thông tin chi tiết về bệnh lý, thuốc men và các vấn đề sức khỏe
          </p>
        </div>

      {/* Enhanced Search */}
      <div className="space-y-4">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400 dark:text-slate-500" />
          <Input
            placeholder="Nhập tên bệnh, thuốc hoặc triệu chứng..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleSearch()}
            className="pl-12 h-12 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-50 placeholder-slate-400 dark:placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent rounded-lg transition-all duration-200"
          />
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute z-10 left-0 right-0 mt-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg">
              <div className="max-h-56 overflow-y-auto">
                {suggestions.map((s, idx) => (
                  <button
                    key={`${s.type}-${s.name}-${idx}`}
                    className="w-full text-left px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-between border-b border-slate-100 dark:border-slate-800 last:border-0 transition"
                    onClick={() => { setSearchQuery(s.name); setShowSuggestions(false); handleSearch() }}
                  >
                    <span className="text-sm text-slate-900 dark:text-slate-50 font-medium">{s.name}</span>
                    <span className={`text-xs px-2.5 py-1 rounded border ${getTypeBadgeClass(s.type)}`}>{s.type}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        <Button 
          onClick={handleSearch} 
          disabled={!searchQuery.trim() || isLoading}
          className="w-full h-12 bg-blue-600 dark:bg-blue-600 hover:bg-blue-700 dark:hover:bg-blue-700 text-white rounded-lg font-semibold transition-all duration-200 shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              Đang tìm kiếm...
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Tìm kiếm
            </div>
          )}
        </Button>
        {history.length > 0 && (
          <div className="mt-3 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-slate-900 dark:text-slate-50">Lịch sử tìm kiếm</span>
              <button className="text-xs px-3 py-1 rounded border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600 transition" onClick={clearHistory}>Xóa</button>
            </div>
            <div className="flex flex-wrap gap-2">
              {history.slice(0, 8).map((h, idx) => (
                <button
                  key={`${h.query}-${idx}`}
                  className={`text-xs px-3 py-1.5 rounded-lg border transition ${getTypeBadgeClass(h.type)} hover:shadow-sm`}
                  onClick={() => { setSearchQuery(h.query); handleSearch() }}
                >
                  {h.query}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
      
      {isLoading && (
        <div className="mt-6 space-y-3">
          <div className="h-4 w-[70%] rounded bg-gray-200 animate-pulse" style={{ animationDuration: '1.5s' }} />
          <div className="h-4 w-[90%] rounded bg-gray-200 animate-pulse" style={{ animationDuration: '1.5s' }} />
          <div className="h-4 w-[60%] rounded bg-gray-200 animate-pulse" style={{ animationDuration: '1.5s' }} />
        </div>
      )}

      {/* Enhanced Quick Categories */}
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-slate-900 dark:text-slate-50 flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          Danh mục phổ biến
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <Button 
            variant="outline" 
            onClick={async () => {
              try {
                const res = await fetch('/api/health-db/benh')
                const data = await res.json()
                const items = Array.isArray(data?.items) ? data.items.map((x: any) => (x?.name || String(x))) : []
                setCategoryTitle('Bệnh lý')
                setCategoryItems(items)
                setCategoryOpen(true)
              } catch {
                setCategoryTitle('Bệnh lý')
                setCategoryItems([])
                setCategoryOpen(true)
              }
            }}
            className="h-auto p-6 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-blue-300 dark:hover:border-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded-lg transition-all duration-200"
          >
            <div className="flex flex-col items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-blue-100 dark:bg-blue-950/30 flex items-center justify-center">
                <Activity className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <span className="text-sm font-semibold text-slate-900 dark:text-slate-50">Bệnh lý</span>
            </div>
          </Button>
          <Button 
            variant="outline" 
            onClick={async () => {
              try {
                const res = await fetch('/api/health-db/thuoc')
                const data = await res.json()
                const items = Array.isArray(data?.items) ? data.items.map((x: any) => (x?.name || String(x))) : []
                setCategoryTitle('Thuốc')
                setCategoryItems(items)
                setCategoryOpen(true)
              } catch {
                setCategoryTitle('Thuốc')
                setCategoryItems([])
                setCategoryOpen(true)
              }
            }}
            className="h-auto p-6 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-teal-300 dark:hover:border-teal-600 hover:bg-teal-50 dark:hover:bg-teal-950/30 rounded-lg transition-all duration-200"
          >
            <div className="flex flex-col items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-teal-100 dark:bg-teal-950/30 flex items-center justify-center">
                <Pill className="h-6 w-6 text-teal-600 dark:text-teal-400" />
              </div>
              <span className="text-sm font-semibold text-slate-900 dark:text-slate-50">Thuốc</span>
            </div>
          </Button>
        </div>
        {categoryOpen && (
          <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-700">
              <span className="text-sm font-semibold text-slate-900 dark:text-slate-50">{categoryTitle}</span>
              <button className="text-xs px-2 py-1 rounded border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600 transition" onClick={() => setCategoryOpen(false)}>Đóng</button>
            </div>
            <div className="max-h-64 overflow-y-auto px-4 py-3">
              {categoryItems.length ? (
                <div className="grid grid-cols-2 gap-2">
                  {categoryItems.map((name, idx) => (
                    <button
                      key={`${categoryTitle}-${name}-${idx}`}
                      className="text-left px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-blue-300 dark:hover:border-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30 text-sm text-slate-900 dark:text-slate-50 font-medium transition"
                      onClick={() => { setSearchQuery(name); setCategoryOpen(false); handleSearch() }}
                    >
                      {name}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-slate-500 dark:text-slate-400 px-3 py-6 text-center">Không có dữ liệu</div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Enhanced Results */}
      {searchResults.length > 0 && (
        <div className="space-y-6">
          <h3 className="text-lg font-bold text-slate-900 dark:text-slate-50 flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-500" />
            Kết quả tìm kiếm ({searchResults.length})
          </h3>
          {searchResults.map((result, index) => (
            <Card 
              key={result.id} 
              className="border-0 shadow-sm hover:shadow-md transition-all duration-300 hover:scale-[1.01] bg-gradient-to-r from-white to-gray-50"
              style={{
                animationDelay: `${index * 100}ms`,
                animation: "fadeInUp 0.5s ease-out forwards"
              }}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-purple-100 to-indigo-100 rounded-lg flex items-center justify-center">
                      {getTypeIcon(result.type)}
                    </div>
                    <div>
                      <CardTitle className="text-lg text-gray-800">{result.title}</CardTitle>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className={`text-xs ${getTypeBadgeClass(result.type)}`}>
                          {result.type}
                        </Badge>
                        <Badge className={`text-xs ${getSeverityColor(result.severity)}`}>
                          {result.severity === "high" ? "Nghiêm trọng" : 
                           result.severity === "medium" ? "Trung bình" : "Nhẹ"}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" className="h-8 px-3" onClick={() => copyResult(result)}>Copy</Button>
                    <Button variant="outline" className="h-8 px-3" onClick={() => shareResult(result)}>Share</Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <CardDescription className="text-gray-700 mb-3 leading-relaxed">
                  {typeof result.description === 'string' ? (
                    <div className="prose prose-sm dark:prose-invert leading-relaxed">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          img: (props) => <img {...props} className="max-w-full h-auto rounded-lg border border-gray-200" />,
                          h1: (props) => <h3 {...props} className="text-base font-semibold mt-3 mb-2" />,
                          h2: (props) => <h4 {...props} className="text-base font-semibold mt-3 mb-2" />,
                          h3: (props) => <h5 {...props} className="text-sm font-semibold mt-3 mb-2" />,
                          p: (props) => <p {...props} className="my-2" />,
                          ul: (props) => <ul {...props} className="list-disc pl-5 my-2" />,
                          ol: (props) => <ol {...props} className="list-decimal pl-5 my-2" />,
                          table: (props) => <table {...props} className="min-w-full text-sm border border-gray-200 rounded-lg overflow-hidden my-3" />,
                          thead: (props) => <thead {...props} className="bg-gray-50" />,
                          th: (props) => <th {...props} className="border px-2 py-1 text-left" />,
                          td: (props) => <td {...props} className="border px-2 py-1 align-top" />
                        }}
                      >
                        {result.description}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    result.description
                  )}
                </CardDescription>
                
                {result.symptoms && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-1">
                      <AlertCircle className="h-4 w-4 text-orange-500" />
                      Triệu chứng:
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {result.symptoms.map((symptom: string, idx: number) => (
                        <Badge key={idx} variant="secondary" className="text-xs bg-orange-50 text-orange-700 border-orange-200">
                          {symptom}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                
                {result.dosage && (
                  <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <h4 className="text-sm font-semibold text-blue-800 flex items-center gap-1 mb-1">
                      <Clock className="h-4 w-4" />
                      Liều dùng:
                    </h4>
                    <p className="text-sm text-blue-700">{result.dosage}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}

          <Card className="border-0 shadow-sm bg-white">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle className="text-base text-gray-800">Dữ liệu tham khảo</CardTitle>
                  <CardDescription className="text-xs">
                    {refQuery ? `Từ khóa: ${refQuery}` : "Nhập từ khóa và bấm tìm kiếm để xem dữ liệu tham khảo."}
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  className="h-8 px-3"
                  disabled={!refQuery.trim() || refLoading}
                  onClick={() => void runRefSearch(refQuery)}
                >
                  {refLoading ? "Đang tải..." : "Làm mới"}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-0 space-y-3">
              {refError ? <div className="text-sm text-red-600 whitespace-pre-wrap">{refError}</div> : null}
              {!refError && !refLoading && !refEntities.length ? (
                <div className="text-sm text-gray-500">Chưa có dữ liệu.</div>
              ) : null}
              {refEntities.length ? (
                <div className="space-y-2">
                  <div className="text-xs font-medium text-gray-600">Thực thể</div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {refEntities.slice(0, 6).map((e) => (
                      <div key={e.id} className="rounded-lg border border-gray-200 p-3">
                        <div className="text-sm font-medium text-gray-800">{e.name}</div>
                        <div className="text-xs text-gray-500 mt-0.5">
                          {String(e.category || "").toUpperCase()}
                          {e.specialty ? ` • ${e.specialty}` : ""}
                        </div>
                        {e.description ? <div className="text-xs text-gray-600 mt-1 line-clamp-3">{e.description}</div> : null}
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
              {refInterventions.length ? (
                <div className="space-y-2">
                  <div className="text-xs font-medium text-gray-600">Can thiệp gợi ý</div>
                  <div className="grid grid-cols-1 gap-2">
                    {refInterventions.slice(0, 3).map((itv) => (
                      <div key={itv.id} className="rounded-lg border border-gray-200 p-3">
                        <div className="text-sm font-medium text-gray-800">{itv.title}</div>
                        <div className="text-xs text-gray-500 mt-0.5">
                          {itv.entity_name ? `${itv.entity_name} • ` : ""}
                          Level {itv.target_care_level}
                        </div>
                        <div className="text-xs text-gray-600 mt-1 line-clamp-5 whitespace-pre-wrap">{itv.content_markdown}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
              {refRelations.length ? (
                <div className="space-y-2">
                  <div className="text-xs font-medium text-gray-600">Quan hệ liên quan</div>
                  <div className="space-y-1">
                    {refRelations.slice(0, 8).map((r, idx) => (
                      <div key={`${r.source_id}-${r.target_id}-${r.relation_type}-${idx}`} className="text-xs text-gray-600">
                        {r.source_name || r.source_id} → {r.relation_type} → {r.target_name || r.target_id}
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Enhanced Disclaimer */}
      <div className="mt-8 p-4 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
          <div>
            <h4 className="font-semibold text-amber-800 mb-1">Lưu ý quan trọng</h4>
            <p className="text-sm text-amber-700 leading-relaxed">
              Thông tin này chỉ mang tính chất tham khảo và không thể thay thế lời khuyên chuyên môn của bác sĩ. 
              Vui lòng tham khảo ý kiến chuyên gia y tế để có chẩn đoán và điều trị chính xác.
            </p>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
      </div>
    </div>
  )
}
