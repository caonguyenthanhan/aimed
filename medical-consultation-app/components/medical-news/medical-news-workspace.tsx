"use client"

import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  KnowledgeEntity,
  KnowledgeIntervention,
  KnowledgeRelation,
  WebSearchItem,
} from "@/components/medical-news/medical-news-types"

type MedicalNewsWorkspaceProps = {
  items: WebSearchItem[]
  loading: boolean
  selectedUrl: string
  isLarge: boolean
  rightRatio: number
  onRatioChange: (value: number) => void
  onSelectItem: (item: WebSearchItem) => void
  refQuery: string
  refLoading: boolean
  refError: string
  refEntities: KnowledgeEntity[]
  refRelations: KnowledgeRelation[]
  refInterventions: KnowledgeIntervention[]
  onRefreshReference: () => void
}

function ResultListSkeleton() {
  return (
    <div className="space-y-2" aria-hidden="true">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="rounded-lg border p-3">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="mt-2 h-3 w-full" />
          <Skeleton className="mt-2 h-3 w-5/6" />
          <Skeleton className="mt-2 h-3 w-2/3" />
        </div>
      ))}
    </div>
  )
}

function EmbedPanelSkeleton() {
  return (
    <div className="flex flex-1 flex-col gap-3" aria-hidden="true">
      <div className="rounded-lg border border-dashed border-border/70 bg-muted/20 p-4 text-sm text-muted-foreground">
        Đang chuẩn bị bài viết đầu tiên...
      </div>
      <Skeleton className="min-h-[380px] w-full rounded-lg border" />
    </div>
  )
}

function ReferencePanelSkeleton() {
  return (
    <div className="mt-3 space-y-2" aria-hidden="true">
      {Array.from({ length: 3 }).map((_, index) => (
        <div key={index} className="rounded-md border p-3">
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="mt-2 h-3 w-1/3" />
          <Skeleton className="mt-2 h-3 w-full" />
          <Skeleton className="mt-2 h-3 w-5/6" />
        </div>
      ))}
    </div>
  )
}

export function MedicalNewsWorkspace({
  items,
  loading,
  selectedUrl,
  isLarge,
  rightRatio,
  onRatioChange,
  onSelectItem,
  refQuery,
  refLoading,
  refError,
  refEntities,
  refRelations,
  refInterventions,
  onRefreshReference,
}: MedicalNewsWorkspaceProps) {
  const hasReferenceData = !!(refEntities.length || refRelations.length || refInterventions.length)

  return (
    <div className="flex flex-col gap-4 lg:flex-row">
      <div
        className="space-y-3 rounded-xl border bg-background p-4 lg:flex-none"
        aria-busy={loading}
        style={
          isLarge
            ? {
                flexBasis: `${Math.round((1 - rightRatio) * 1000) / 10}%`,
                maxWidth: `${Math.round((1 - rightRatio) * 1000) / 10}%`,
              }
            : undefined
        }
      >
        <div className="text-sm font-medium">Kết quả</div>
        {loading && !items.length ? <ResultListSkeleton /> : null}
        {!items.length && !loading ? (
          <div className="rounded-lg border border-dashed border-border/70 bg-muted/20 p-4 text-sm text-muted-foreground">
            Chưa có kết quả. Hãy thử đổi từ khóa hoặc chọn một chủ đề gợi ý để bắt đầu.
          </div>
        ) : null}
        {loading && items.length ? <div className="text-xs text-muted-foreground">Đang cập nhật danh sách bài viết...</div> : null}
        {items.length ? (
          <div className="space-y-2">
            {items.map((item) => {
              const active = item.link === selectedUrl
              return (
                <button
                  key={item.link}
                  type="button"
                  onClick={() => onSelectItem(item)}
                  className={`w-full rounded-lg border p-3 text-left transition-colors hover:bg-muted ${active ? "bg-muted" : ""}`}
                >
                  <div className="line-clamp-2 text-sm font-medium">{item.title}</div>
                  <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">{item.snippet}</div>
                  <div className="mt-1 break-all text-xs text-blue-600">{item.displayLink || item.link}</div>
                </button>
              )
            })}
          </div>
        ) : null}
      </div>

      <div
        className="flex min-h-[60vh] flex-col space-y-3 overflow-hidden rounded-xl border bg-background p-4 lg:flex-none"
        aria-busy={loading}
        style={
          isLarge
            ? {
                flexBasis: `${Math.round(rightRatio * 1000) / 10}%`,
                maxWidth: `${Math.round(rightRatio * 1000) / 10}%`,
              }
            : undefined
        }
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
              onChange={(event) => onRatioChange(Number(event.target.value) / 100)}
            />
          </div>
        </div>
        {loading && !selectedUrl ? <EmbedPanelSkeleton /> : null}
        {!loading && !selectedUrl ? (
          <div className="rounded-lg border border-dashed border-border/70 bg-muted/20 p-4 text-sm text-muted-foreground">
            Chọn một kết quả để nhúng. Bài viết đầu tiên sẽ được mở tự động sau khi tìm kiếm xong.
          </div>
        ) : null}
        {selectedUrl ? (
          <iframe
            key={selectedUrl}
            src={selectedUrl}
            className="w-full flex-1 rounded-lg border"
            referrerPolicy="no-referrer"
            sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox"
            title="Medical news embed"
          />
        ) : null}

        <div className="rounded-lg border p-3 bg-background">
          <div className="flex items-center justify-between gap-2">
            <div className="text-sm font-medium">Dữ liệu tham khảo</div>
            <Button variant="outline" size="sm" disabled={!refQuery.trim() || refLoading} onClick={onRefreshReference}>
              {refLoading ? "Đang tải..." : "Làm mới"}
            </Button>
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            {refQuery ? `Từ khóa: ${refQuery}` : "Chọn kết quả hoặc tìm kiếm để xem tham khảo."}
          </div>
          {refError ? <div className="text-sm text-red-600 whitespace-pre-wrap mt-2">{refError}</div> : null}
          {refLoading && !hasReferenceData ? <ReferencePanelSkeleton /> : null}
          {refLoading && hasReferenceData ? (
            <div className="mt-2 text-xs text-muted-foreground">Đang cập nhật dữ liệu tham khảo...</div>
          ) : null}
          {!refError && !refLoading && !hasReferenceData ? (
            <div className="mt-2 rounded-md border border-dashed border-border/70 bg-muted/20 p-3 text-sm text-muted-foreground">
              Chưa có dữ liệu tham khảo. Hãy chọn một kết quả hoặc làm mới để thử lại.
            </div>
          ) : null}
          {refEntities.length ? (
            <div className="mt-3 space-y-2">
              {refEntities.slice(0, 6).map((entity) => (
                <div key={entity.id} className="rounded-md border p-2">
                  <div className="text-sm font-medium">{entity.name}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {String(entity.category || "").toUpperCase()}
                    {entity.specialty ? ` • ${entity.specialty}` : ""}
                  </div>
                  {entity.description ? <div className="text-xs text-muted-foreground mt-1 line-clamp-3">{entity.description}</div> : null}
                </div>
              ))}
            </div>
          ) : null}
          {refInterventions.length ? (
            <div className="mt-3 space-y-2">
              <div className="text-xs font-medium text-muted-foreground">Can thiệp gợi ý</div>
              {refInterventions.slice(0, 3).map((intervention) => (
                <div key={intervention.id} className="rounded-md border p-2">
                  <div className="text-sm font-medium">{intervention.title}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {intervention.entity_name ? `${intervention.entity_name} • ` : ""}
                    Level {intervention.target_care_level}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1 line-clamp-4 whitespace-pre-wrap">{intervention.content_markdown}</div>
                </div>
              ))}
            </div>
          ) : null}
          {refRelations.length ? (
            <div className="mt-3 space-y-2">
              <div className="text-xs font-medium text-muted-foreground">Quan hệ liên quan</div>
              {refRelations.slice(0, 6).map((relation, index) => (
                <div key={`${relation.source_id}-${relation.target_id}-${relation.relation_type}-${index}`} className="text-xs text-muted-foreground">
                  {relation.source_name || relation.source_id} → {relation.relation_type} → {relation.target_name || relation.target_id}
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
