"use client"

import dynamic from "next/dynamic"

import { BookOpenText, DatabaseZap, ShieldCheck } from "lucide-react"
import PortalShell from "@/components/portal-shell"
import { SectionCard } from "@/components/ui/section-card"
import { StatCard } from "@/components/ui/stat-card"

const HealthLookup = dynamic(() => import("@/components/health-lookup").then(m => m.HealthLookup), { ssr: false })

export default function TraCuuPage() {
  return (
    <PortalShell
      eyebrow="Medical Lookup"
      title="Tra cứu thông tin y tế"
      description="Không gian tra cứu bệnh lý, thuốc và triệu chứng, đồng thời đối chiếu thêm dữ liệu tham khảo nội bộ."
      aside={
        <div className="space-y-6">
          <SectionCard title="Lưu ý sử dụng" description="Tra cứu hỗ trợ định hướng, không thay thế chẩn đoán chuyên môn.">
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>Ưu tiên kiểm tra lại kết quả với bác sĩ nếu nội dung chạm tới điều trị, liều dùng hoặc dấu hiệu nặng.</p>
              <p>Dùng phần dữ liệu tham khảo để xem entity, relation và intervention có liên quan tới truy vấn.</p>
            </div>
          </SectionCard>
        </div>
      }
    >
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Lookup" value="Disease / Drug" helper="Tra cứu bệnh lý, thuốc và symptom" icon={<BookOpenText className="h-5 w-5" />} tone="primary" />
        <StatCard label="Reference" value="Knowledge graph" helper="Đọc thêm dữ liệu tham khảo nội bộ" icon={<DatabaseZap className="h-5 w-5" />} tone="teal" />
        <StatCard label="Safety" value="Clinical caution" helper="Chỉ dùng như thông tin hỗ trợ" icon={<ShieldCheck className="h-5 w-5" />} tone="neutral" />
      </div>

      <SectionCard title="Tra cứu" description="Component tra cứu hiện có được giữ nguyên logic và đặt trong shell mới của ứng dụng.">
        <HealthLookup />
      </SectionCard>
    </PortalShell>
  )
}
