"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Search, Pill, Stethoscope, ExternalLink, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface EmbedTraCuuProps {
  context?: {
    searchType?: "drug" | "disease"
    query?: string
    reason?: string
  }
  onComplete?: (result: { type: string; name: string; summary: string }) => void
  onNavigate?: () => void
}

interface SearchResult {
  id: string
  name: string
  type: "drug" | "disease"
  summary: string
}

// Mock search function - in real app, this would call API
const mockSearch = async (query: string, type: "drug" | "disease"): Promise<SearchResult[]> => {
  await new Promise((r) => setTimeout(r, 500))
  
  if (!query.trim()) return []
  
  const drugResults: SearchResult[] = [
    { id: "1", name: "Paracetamol", type: "drug", summary: "Thuốc giảm đau, hạ sốt thông dụng. Liều người lớn: 500-1000mg/lần, cách 4-6h." },
    { id: "2", name: "Ibuprofen", type: "drug", summary: "Thuốc giảm đau, chống viêm không steroid (NSAIDs). Dùng sau ăn." },
    { id: "3", name: "Amoxicillin", type: "drug", summary: "Kháng sinh nhóm penicillin. Cần kê đơn bác sĩ." },
  ]
  
  const diseaseResults: SearchResult[] = [
    { id: "1", name: "Cảm cúm", type: "disease", summary: "Nhiễm virus đường hô hấp. Triệu chứng: sốt, đau đầu, mệt mỏi, ho." },
    { id: "2", name: "Viêm họng", type: "disease", summary: "Viêm niêm mạc họng do virus hoặc vi khuẩn. Đau họng, khó nuốt." },
    { id: "3", name: "Đau dạ dày", type: "disease", summary: "Viêm loét dạ dày tá tràng. Đau thượng vị, ợ chua, buồn nôn." },
  ]
  
  const results = type === "drug" ? drugResults : diseaseResults
  return results.filter((r) => 
    r.name.toLowerCase().includes(query.toLowerCase()) || 
    r.summary.toLowerCase().includes(query.toLowerCase())
  )
}

export function EmbedTraCuu({ context, onComplete, onNavigate }: EmbedTraCuuProps) {
  const router = useRouter()
  const [searchType, setSearchType] = useState<"drug" | "disease">(context?.searchType || "drug")
  const [query, setQuery] = useState(context?.query || "")
  const [results, setResults] = useState<SearchResult[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)

  const handleSearch = async () => {
    if (!query.trim()) return
    
    setIsLoading(true)
    setHasSearched(true)
    try {
      const data = await mockSearch(query, searchType)
      setResults(data)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSelectResult = (result: SearchResult) => {
    onComplete?.({ type: result.type, name: result.name, summary: result.summary })
  }

  const goToFullPage = () => {
    if (onNavigate) {
      onNavigate()
    } else {
      router.push(`/tra-cuu?type=${searchType}&q=${encodeURIComponent(query)}`)
    }
  }

  return (
    <Card className="w-full max-w-md border-primary/20">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <Search className="h-5 w-5 text-primary" />
          <CardTitle className="text-base">Tra cứu nhanh</CardTitle>
        </div>
        <CardDescription className="text-xs">
          Tìm thông tin về thuốc hoặc bệnh
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-3">
        <Tabs value={searchType} onValueChange={(v) => setSearchType(v as "drug" | "disease")}>
          <TabsList className="grid w-full grid-cols-2 h-8">
            <TabsTrigger value="drug" className="text-xs gap-1">
              <Pill className="h-3 w-3" /> Thuốc
            </TabsTrigger>
            <TabsTrigger value="disease" className="text-xs gap-1">
              <Stethoscope className="h-3 w-3" /> Bệnh
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex gap-2">
          <Input
            placeholder={searchType === "drug" ? "Tên thuốc..." : "Tên bệnh..."}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="h-9 text-sm"
          />
          <Button 
            size="sm" 
            onClick={handleSearch}
            disabled={isLoading || !query.trim()}
            className="h-9"
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          </Button>
        </div>

        {/* Results */}
        {hasSearched && (
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {results.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-3">
                Không tìm thấy kết quả. Thử từ khóa khác?
              </p>
            ) : (
              results.map((result) => (
                <button
                  key={result.id}
                  onClick={() => handleSelectResult(result)}
                  className={cn(
                    "w-full text-left p-2 rounded-lg border transition-colors",
                    "hover:border-primary/50 hover:bg-primary/5"
                  )}
                >
                  <div className="flex items-center gap-2">
                    {result.type === "drug" ? (
                      <Pill className="h-4 w-4 text-blue-500 flex-shrink-0" />
                    ) : (
                      <Stethoscope className="h-4 w-4 text-green-500 flex-shrink-0" />
                    )}
                    <span className="font-medium text-sm">{result.name}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                    {result.summary}
                  </p>
                </button>
              ))
            )}
          </div>
        )}
      </CardContent>

      <CardFooter className="pt-0">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={goToFullPage}
          className="w-full text-xs text-muted-foreground"
        >
          Tra cứu chi tiết hơn <ExternalLink className="h-3 w-3 ml-1" />
        </Button>
      </CardFooter>
    </Card>
  )
}
