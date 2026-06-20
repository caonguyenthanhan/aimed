"use client"

import { Newspaper, PanelsTopLeft, ShieldCheck } from "lucide-react"
import { MedicalNewsSearchPanel } from "@/components/medical-news/medical-news-search-panel"
import { MedicalNewsWorkspace } from "@/components/medical-news/medical-news-workspace"
import { useMedicalNewsController } from "@/components/medical-news/use-medical-news-controller"
import PortalShell from "@/components/portal-shell"
import { SectionCard } from "@/components/ui/section-card"
import { StatCard } from "@/components/ui/stat-card"

export default function TinTucYKhoaPage() {
  const news = useMedicalNewsController()

  return (
    <PortalShell
      eyebrow="Medical News"
      title="Tin tức y khoa"
      description="Không gian đọc nhanh tin y khoa, mở nguồn ngoài và đối chiếu thêm dữ liệu tham khảo nội bộ."
      aside={
        <div className="space-y-6">
          <SectionCard title="Lưu ý đọc tin" description="Nhịp sử dụng an toàn cho người đang có tải cảm xúc cao.">
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>Ưu tiên đọc các nguồn có giọng điệu bình tĩnh và tránh doom scrolling khi đang căng thẳng.</p>
              <p>Dùng cột tham khảo để đối chiếu thuật ngữ, entity và can thiệp thay vì chỉ tin vào tiêu đề báo.</p>
            </div>
          </SectionCard>
          <SectionCard title="Chủ đề gợi ý" description="Các truy vấn được sinh từ care plan hoặc screening gần nhất.">
            <div className="flex flex-wrap gap-2">
              {news.topics.map((topic) => (
                <button
                  key={topic}
                  type="button"
                  onClick={() => {
                    news.setQ(topic)
                    void news.runSearch(topic)
                  }}
                  className="rounded-full border border-border/70 bg-background/70 px-3 py-1.5 text-xs font-medium text-foreground transition hover:border-primary/40 hover:bg-background"
                >
                  {topic}
                </button>
              ))}
            </div>
          </SectionCard>
        </div>
      }
    >
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Topics" value={news.topics.length} helper="Gợi ý theo care plan và screening" icon={<Newspaper className="h-5 w-5" />} tone="primary" />
        <StatCard label="Results" value={news.items.length} helper={news.loading ? "Đang tải nguồn ngoài" : "Kết quả web-search hiện tại"} icon={<PanelsTopLeft className="h-5 w-5" />} tone="teal" />
        <StatCard label="Reference" value={news.refEntities.length} helper={news.refQuery ? `Theo từ khóa: ${news.refQuery}` : "Chưa chọn kết quả"} icon={<ShieldCheck className="h-5 w-5" />} tone="neutral" />
      </div>

      {news.notice ? (
        <SectionCard title="Notice" description="Nhắc nhở ngữ cảnh theo trạng thái sàng lọc gần nhất.">
          <div className="text-sm whitespace-pre-wrap text-muted-foreground">{news.notice}</div>
        </SectionCard>
      ) : null}

      <SectionCard title="Tìm kiếm nguồn tin" description="Tìm bài viết, mở nguồn ngoài và lưu nhịp đọc tin phù hợp.">
        <MedicalNewsSearchPanel
          q={news.q}
          setQ={news.setQ}
          canSearch={news.canSearch}
          loading={news.loading}
          selectedUrl={news.selectedUrl}
          topics={news.topics}
          error={news.error}
          onSearch={news.runSearch}
        />
      </SectionCard>

      <SectionCard title="Workspace" description="Kết quả bên trái, trang nhúng và dữ liệu tham khảo bên phải.">
        <MedicalNewsWorkspace
          items={news.items}
          loading={news.loading}
          selectedUrl={news.selectedUrl}
          isLarge={news.isLarge}
          rightRatio={news.rightRatio}
          onRatioChange={news.applyRightRatio}
          onSelectItem={news.selectItem}
          refQuery={news.refQuery}
          refLoading={news.refLoading}
          refError={news.refError}
          refEntities={news.refEntities}
          refRelations={news.refRelations}
          refInterventions={news.refInterventions}
          onRefreshReference={() => void news.runRefSearch(news.refQuery)}
        />
      </SectionCard>
    </PortalShell>
  )
}
