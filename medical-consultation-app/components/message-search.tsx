"use client"

import { useState, useEffect, useMemo } from "react"
import { Search, X, ChevronUp, ChevronDown } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { searchMessages, highlightSearchQuery, type SearchResult } from "@/lib/search-utils"
import { cn } from "@/lib/utils"

interface MessageSearchProps {
  messages: Array<{ id: string; content: string; role: 'user' | 'assistant'; timestamp: Date }>
  conversationId: string
  onSelectResult?: (messageId: string) => void
  className?: string
}

export function MessageSearch({
  messages,
  conversationId,
  onSelectResult,
  className,
}: MessageSearchProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [selectedIndex, setSelectedIndex] = useState(0)

  const results: SearchResult[] = useMemo(() => {
    return searchMessages(messages, conversationId, query)
  }, [messages, conversationId, query])

  useEffect(() => {
    if (results.length > 0) {
      setSelectedIndex(0)
    }
  }, [results])

  const handleSelectResult = (result: SearchResult) => {
    onSelectResult?.(result.messageId)
    setIsOpen(false)
  }

  const handlePrevious = () => {
    if (results.length === 0) return
    setSelectedIndex((idx) => (idx - 1 + results.length) % results.length)
  }

  const handleNext = () => {
    if (results.length === 0) return
    setSelectedIndex((idx) => (idx + 1) % results.length)
  }

  const selectedResult = results[selectedIndex]

  return (
    <div className={cn("relative", className)}>
      {/* Search Toggle Button */}
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 rounded-full"
        onClick={() => setIsOpen(!isOpen)}
        title="Tìm kiếm trong hội thoại"
      >
        <Search className="h-4 w-4" />
      </Button>

      {/* Search Panel */}
      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-80 bg-background border border-border rounded-lg shadow-lg p-3 z-50">
          {/* Search Input */}
          <div className="flex gap-2 items-center mb-3">
            <Input
              placeholder="Tìm kiếm tin nhắn..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  if (e.shiftKey) handlePrevious()
                  else handleNext()
                }
              }}
              className="text-sm h-8"
              autoFocus
            />
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => {
                setIsOpen(false)
                setQuery("")
              }}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>

          {/* Results Summary */}
          {query && (
            <div className="text-xs text-muted-foreground mb-2 px-1">
              {results.length > 0
                ? `${selectedIndex + 1} / ${results.length} kết quả`
                : "Không tìm thấy kết quả"}
            </div>
          )}

          {/* Navigation Buttons */}
          {results.length > 0 && (
            <div className="flex gap-1 mb-3">
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs flex-1"
                onClick={handlePrevious}
              >
                <ChevronUp className="h-3 w-3 mr-1" />
                Trước
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs flex-1"
                onClick={handleNext}
              >
                Sau
                <ChevronDown className="h-3 w-3 ml-1" />
              </Button>
            </div>
          )}

          {/* Selected Result Preview */}
          {selectedResult && (
            <div
              className="bg-muted/50 border border-border rounded p-2 text-xs space-y-1 cursor-pointer hover:bg-muted transition-colors"
              onClick={() => handleSelectResult(selectedResult)}
            >
              <div className="flex items-center gap-2">
                <span className={cn(
                  "text-xs px-1.5 py-0.5 rounded font-medium",
                  selectedResult.role === 'user'
                    ? "bg-primary/20 text-primary"
                    : "bg-accent/20 text-accent"
                )}>
                  {selectedResult.role === 'user' ? 'Bạn' : 'Trợ lý'}
                </span>
                <span className="text-muted-foreground">
                  {selectedResult.timestamp.toLocaleTimeString()}
                </span>
              </div>
              <div
                className="text-foreground line-clamp-3"
                dangerouslySetInnerHTML={{
                  __html: highlightSearchQuery(selectedResult.content, query),
                }}
              />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
