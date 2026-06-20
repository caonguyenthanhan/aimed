"use client"

import type { Dispatch, SetStateAction } from "react"
import { Activity, Pill, Search, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { HealthLookupHistoryItem, HealthSuggestion } from "@/components/health-lookup/health-lookup-types"

type HealthLookupSearchPanelProps = {
  searchQuery: string
  setSearchQuery: Dispatch<SetStateAction<string>>
  isLoading: boolean
  suggestions: HealthSuggestion[]
  showSuggestions: boolean
  setShowSuggestions: Dispatch<SetStateAction<boolean>>
  history: HealthLookupHistoryItem[]
  clearHistory: () => void
  categoryOpen: boolean
  setCategoryOpen: Dispatch<SetStateAction<boolean>>
  categoryTitle: string
  categoryItems: string[]
  getTypeBadgeClass: (type: string) => string
  handleSearch: (forcedQuery?: string) => Promise<void>
  openCategory: (kind: "Bệnh lý" | "Thuốc") => Promise<void>
}

export function HealthLookupSearchPanel({
  searchQuery,
  setSearchQuery,
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
  getTypeBadgeClass,
  handleSearch,
  openCategory,
}: HealthLookupSearchPanelProps) {
  return (
    <>
      <div className="space-y-4">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400 dark:text-slate-500" />
          <Input
            placeholder="Nhập tên bệnh, thuốc hoặc triệu chứng..."
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault()
                void handleSearch()
              }
            }}
            className="pl-12 h-12 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-50 placeholder-slate-400 dark:placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent rounded-lg transition-all duration-200"
          />
          {showSuggestions && suggestions.length > 0 ? (
            <div className="absolute z-10 left-0 right-0 mt-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg">
              <div className="max-h-56 overflow-y-auto">
                {suggestions.map((suggestion, index) => (
                  <button
                    key={`${suggestion.type}-${suggestion.name}-${index}`}
                    className="w-full text-left px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-between border-b border-slate-100 dark:border-slate-800 last:border-0 transition"
                    onClick={() => {
                      setSearchQuery(suggestion.name)
                      setShowSuggestions(false)
                      void handleSearch(suggestion.name)
                    }}
                  >
                    <span className="text-sm text-slate-900 dark:text-slate-50 font-medium">{suggestion.name}</span>
                    <span className={`text-xs px-2.5 py-1 rounded border ${getTypeBadgeClass(suggestion.type)}`}>{suggestion.type}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <Button
          onClick={() => void handleSearch()}
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

        {history.length > 0 ? (
          <div className="mt-3 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-slate-900 dark:text-slate-50">Lịch sử tìm kiếm</span>
              <button className="text-xs px-3 py-1 rounded border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600 transition" onClick={clearHistory}>
                Xóa
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {history.slice(0, 8).map((item, index) => (
                <button
                  key={`${item.query}-${index}`}
                  className={`text-xs px-3 py-1.5 rounded-lg border transition ${getTypeBadgeClass(item.type)} hover:shadow-sm`}
                  onClick={() => {
                    setSearchQuery(item.query)
                    void handleSearch(item.query)
                  }}
                >
                  {item.query}
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      {isLoading ? (
        <div className="mt-6 space-y-3">
          <div className="h-4 w-[70%] rounded bg-gray-200 animate-pulse" style={{ animationDuration: "1.5s" }} />
          <div className="h-4 w-[90%] rounded bg-gray-200 animate-pulse" style={{ animationDuration: "1.5s" }} />
          <div className="h-4 w-[60%] rounded bg-gray-200 animate-pulse" style={{ animationDuration: "1.5s" }} />
        </div>
      ) : null}

      <div className="space-y-4">
        <h3 className="text-lg font-bold text-slate-900 dark:text-slate-50 flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          Danh mục phổ biến
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <Button
            variant="outline"
            onClick={() => void openCategory("Bệnh lý")}
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
            onClick={() => void openCategory("Thuốc")}
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

        {categoryOpen ? (
          <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-700">
              <span className="text-sm font-semibold text-slate-900 dark:text-slate-50">{categoryTitle}</span>
              <button className="text-xs px-2 py-1 rounded border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600 transition" onClick={() => setCategoryOpen(false)}>
                Đóng
              </button>
            </div>
            <div className="max-h-64 overflow-y-auto px-4 py-3">
              {categoryItems.length ? (
                <div className="grid grid-cols-2 gap-2">
                  {categoryItems.map((name, index) => (
                    <button
                      key={`${categoryTitle}-${name}-${index}`}
                      className="text-left px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-blue-300 dark:hover:border-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30 text-sm text-slate-900 dark:text-slate-50 font-medium transition"
                      onClick={() => {
                        setSearchQuery(name)
                        setCategoryOpen(false)
                        void handleSearch(name)
                      }}
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
        ) : null}
      </div>
    </>
  )
}
