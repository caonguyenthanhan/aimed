"use client"

import { AlertCircle, CheckCircle, Clock } from "lucide-react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { get_type_icon } from "@/components/health-lookup/health-lookup-utils"
import type {
  HealthLookupResult,
  KnowledgeEntity,
  KnowledgeIntervention,
  KnowledgeRelation,
} from "@/components/health-lookup/health-lookup-types"

type HealthLookupResultsPanelProps = {
  searchResults: HealthLookupResult[]
  getTypeBadgeClass: (type: string) => string
  getSeverityColor: (severity: string) => string
  copyResult: (result: HealthLookupResult) => void
  shareResult: (result: HealthLookupResult) => Promise<void>
  refQuery: string
  refLoading: boolean
  refError: string
  refEntities: KnowledgeEntity[]
  refRelations: KnowledgeRelation[]
  refInterventions: KnowledgeIntervention[]
  runRefSearch: (query: string) => Promise<void>
}

export function HealthLookupResultsPanel({
  searchResults,
  getTypeBadgeClass,
  getSeverityColor,
  copyResult,
  shareResult,
  refQuery,
  refLoading,
  refError,
  refEntities,
  refRelations,
  refInterventions,
  runRefSearch,
}: HealthLookupResultsPanelProps) {
  return (
    <>
      {searchResults.length > 0 ? (
        <div className="space-y-6">
          <h3 className="text-lg font-bold text-slate-900 dark:text-slate-50 flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-500" />
            Kết quả tìm kiếm ({searchResults.length})
          </h3>
          {searchResults.map((result, index) => (
            <Card
              key={result.id}
              className="border-0 shadow-sm hover:shadow-md transition-all duration-300 hover:scale-[1.01] bg-gradient-to-r from-white to-gray-50"
              style={{ animationDelay: `${index * 100}ms`, animation: "fadeInUp 0.5s ease-out forwards" }}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-purple-100 to-indigo-100 rounded-lg flex items-center justify-center">
                      {get_type_icon(result.type)}
                    </div>
                    <div>
                      <CardTitle className="text-lg text-gray-800">{result.title}</CardTitle>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className={`text-xs ${getTypeBadgeClass(result.type)}`}>
                          {result.type}
                        </Badge>
                        <Badge className={`text-xs ${getSeverityColor(result.severity)}`}>
                          {result.severity === "high" ? "Nghiêm trọng" : result.severity === "medium" ? "Trung bình" : "Nhẹ"}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" className="h-8 px-3" onClick={() => copyResult(result)}>
                      Copy
                    </Button>
                    <Button variant="outline" className="h-8 px-3" onClick={() => void shareResult(result)}>
                      Share
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <CardDescription className="text-gray-700 mb-3 leading-relaxed">
                  {typeof result.description === "string" ? (
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
                          td: (props) => <td {...props} className="border px-2 py-1 align-top" />,
                        }}
                      >
                        {result.description}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    result.description
                  )}
                </CardDescription>

                {result.symptoms ? (
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-1">
                      <AlertCircle className="h-4 w-4 text-orange-500" />
                      Triệu chứng:
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {result.symptoms.map((symptom, symptomIndex) => (
                        <Badge key={symptomIndex} variant="secondary" className="text-xs bg-orange-50 text-orange-700 border-orange-200">
                          {symptom}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ) : null}

                {result.dosage ? (
                  <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <h4 className="text-sm font-semibold text-blue-800 flex items-center gap-1 mb-1">
                      <Clock className="h-4 w-4" />
                      Liều dùng:
                    </h4>
                    <p className="text-sm text-blue-700">{result.dosage}</p>
                  </div>
                ) : null}
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
                <Button variant="outline" className="h-8 px-3" disabled={!refQuery.trim() || refLoading} onClick={() => void runRefSearch(refQuery)}>
                  {refLoading ? "Đang tải..." : "Làm mới"}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-0 space-y-3">
              {refError ? <div className="text-sm text-red-600 whitespace-pre-wrap">{refError}</div> : null}
              {!refError && !refLoading && !refEntities.length ? <div className="text-sm text-gray-500">Chưa có dữ liệu.</div> : null}
              {refEntities.length ? (
                <div className="space-y-2">
                  <div className="text-xs font-medium text-gray-600">Thực thể</div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {refEntities.slice(0, 6).map((entity) => (
                      <div key={entity.id} className="rounded-lg border border-gray-200 p-3">
                        <div className="text-sm font-medium text-gray-800">{entity.name}</div>
                        <div className="text-xs text-gray-500 mt-0.5">
                          {String(entity.category || "").toUpperCase()}
                          {entity.specialty ? ` • ${entity.specialty}` : ""}
                        </div>
                        {entity.description ? <div className="text-xs text-gray-600 mt-1 line-clamp-3">{entity.description}</div> : null}
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
              {refInterventions.length ? (
                <div className="space-y-2">
                  <div className="text-xs font-medium text-gray-600">Can thiệp gợi ý</div>
                  <div className="grid grid-cols-1 gap-2">
                    {refInterventions.slice(0, 3).map((intervention) => (
                      <div key={intervention.id} className="rounded-lg border border-gray-200 p-3">
                        <div className="text-sm font-medium text-gray-800">{intervention.title}</div>
                        <div className="text-xs text-gray-500 mt-0.5">
                          {intervention.entity_name ? `${intervention.entity_name} • ` : ""}
                          Level {intervention.target_care_level}
                        </div>
                        <div className="text-xs text-gray-600 mt-1 line-clamp-5 whitespace-pre-wrap">{intervention.content_markdown}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
              {refRelations.length ? (
                <div className="space-y-2">
                  <div className="text-xs font-medium text-gray-600">Quan hệ liên quan</div>
                  <div className="space-y-1">
                    {refRelations.slice(0, 8).map((relation, index) => (
                      <div key={`${relation.source_id}-${relation.target_id}-${relation.relation_type}-${index}`} className="text-xs text-gray-600">
                        {relation.source_name || relation.source_id} → {relation.relation_type} → {relation.target_name || relation.target_id}
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </div>
      ) : null}

      <div className="mt-8 p-4 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
          <div>
            <h4 className="font-semibold text-amber-800 mb-1">Lưu ý quan trọng</h4>
            <p className="text-sm text-amber-700 leading-relaxed">
              Thông tin này chỉ mang tính chất tham khảo và không thể thay thế lời khuyên chuyên môn của bác sĩ. Vui lòng tham khảo ý kiến chuyên gia y tế để có chẩn đoán và điều trị chính xác.
            </p>
          </div>
        </div>
      </div>
    </>
  )
}
