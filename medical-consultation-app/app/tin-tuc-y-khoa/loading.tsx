import PortalShell from "@/components/portal-shell"
import { SectionCard } from "@/components/ui/section-card"
import { Skeleton } from "@/components/ui/skeleton"

export default function Loading() {
  return (
    <PortalShell
      eyebrow="Medical News"
      title="Tin tức y khoa"
      description="Đang chuẩn bị không gian đọc tin và dữ liệu tham khảo."
      aside={
        <div className="space-y-6">
          <SectionCard title="Lưu ý đọc tin" description="Nhịp sử dụng an toàn cho người đang có tải cảm xúc cao.">
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-4/6" />
            </div>
          </SectionCard>
          <SectionCard title="Chủ đề gợi ý" description="Đang tải gợi ý phù hợp với trạng thái gần nhất.">
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: 5 }).map((_, index) => (
                <Skeleton key={index} className="h-8 w-28 rounded-full" />
              ))}
            </div>
          </SectionCard>
        </div>
      }
    >
      <div className="grid gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="rounded-[1rem] border bg-card/90 p-5">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="mt-4 h-8 w-16" />
            <Skeleton className="mt-3 h-4 w-40" />
          </div>
        ))}
      </div>

      <SectionCard title="Tìm kiếm nguồn tin" description="Đang khởi tạo truy vấn và các thao tác tìm kiếm.">
        <div className="space-y-4">
          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
            <Skeleton className="h-11 w-full" />
            <Skeleton className="h-11 w-28" />
          </div>
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-8 w-24 rounded-full" />
            ))}
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Workspace" description="Đang tải kết quả, trang nhúng và dữ liệu tham khảo.">
        <div className="flex flex-col gap-4 lg:flex-row">
          <div className="space-y-3 rounded-xl border bg-background p-4 lg:w-[38%]">
            <Skeleton className="h-4 w-20" />
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="rounded-lg border p-3">
                <Skeleton className="h-4 w-4/5" />
                <Skeleton className="mt-2 h-3 w-full" />
                <Skeleton className="mt-2 h-3 w-5/6" />
              </div>
            ))}
          </div>
          <div className="space-y-3 rounded-xl border bg-background p-4 lg:flex-1">
            <div className="flex items-center justify-between gap-3">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-28" />
            </div>
            <Skeleton className="min-h-[360px] w-full rounded-lg border" />
            <div className="rounded-lg border p-3">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="mt-2 h-3 w-2/3" />
              <div className="mt-3 space-y-2">
                {Array.from({ length: 3 }).map((_, index) => (
                  <div key={index} className="rounded-md border p-3">
                    <Skeleton className="h-4 w-2/3" />
                    <Skeleton className="mt-2 h-3 w-1/3" />
                    <Skeleton className="mt-2 h-3 w-full" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </SectionCard>
    </PortalShell>
  )
}
