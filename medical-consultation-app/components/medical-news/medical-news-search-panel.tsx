"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { DEFAULT_GOOGLE_NEWS_URL } from "@/components/medical-news/medical-news-types"

type MedicalNewsSearchPanelProps = {
  q: string
  setQ: React.Dispatch<React.SetStateAction<string>>
  canSearch: boolean
  loading: boolean
  selectedUrl: string
  topics: string[]
  error: string
  onSearch: (forcedQuery?: string) => Promise<void>
}

export function MedicalNewsSearchPanel({
  q,
  setQ,
  canSearch,
  loading,
  selectedUrl,
  topics,
  error,
  onSearch,
}: MedicalNewsSearchPanelProps) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={() => window.open(DEFAULT_GOOGLE_NEWS_URL, "_blank", "noopener,noreferrer")}>
          Mở Google News mặc định
        </Button>
        {topics.map((topic) => (
          <Button
            key={topic}
            variant="outline"
            size="sm"
            onClick={() => {
              setQ(topic)
              void onSearch(topic)
            }}
          >
            {topic}
          </Button>
        ))}
      </div>

      <div className="rounded-xl border bg-background p-4 flex flex-col md:flex-row gap-2">
        <Input
          value={q}
          onChange={(event) => setQ(event.target.value)}
          placeholder="Ví dụ: khuyến cáo WHO về cúm mùa 2026"
          onKeyDown={(event) => {
            if (event.key === "Enter" && canSearch && !loading) {
              event.preventDefault()
              void onSearch()
            }
          }}
        />
        <Button onClick={() => void onSearch()} disabled={!canSearch || loading}>
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
    </div>
  )
}
