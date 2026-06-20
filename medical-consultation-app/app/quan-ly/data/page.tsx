import { ArrowUpDown, Database, Files, ShieldCheck, Stethoscope } from "lucide-react"
import PortalShell from "@/components/portal-shell"
import { RoleGuard } from "@/components/role-guard"
import { SectionCard } from "@/components/ui/section-card"
import { StatCard } from "@/components/ui/stat-card"

const dataDomains = [
  {
    title: "Kho dữ liệu y khoa",
    description: "Khu vực dành cho danh mục bệnh, thuốc, triệu chứng và các bộ chuẩn hóa lâm sàng.",
    items: ["Medical taxonomy", "Drug knowledge base", "Symptom normalization"],
  },
  {
    title: "Nhập và xuất",
    description: "Không gian cho CSV/JSON pipelines, kiểm tra định dạng và đối soát phiên bản dữ liệu.",
    items: ["CSV/JSON intake", "Validation and mapping", "Versioned export"],
  },
]

export default function ManagementDataPage() {
  return (
    <RoleGuard roles={["ADMIN"]}>
      <PortalShell
        eyebrow="Admin Data"
        title="Quản lý dữ liệu y khoa"
        description="Workspace định hướng cho quản trị nội dung bệnh lý, thuốc và chuẩn hóa dữ liệu. Hiện chỉ nâng cấp shell hiển thị, chưa thêm nguồn dữ liệu hay pipeline mới."
        aside={
          <SectionCard title="Nguyên tắc dữ liệu" description="Các lưu ý vận hành cho mảng medical content.">
            <div className="space-y-3 text-sm text-muted-foreground">
              <div className="rounded-2xl border border-border/70 bg-background/70 p-4">Mọi luồng nhập nên đi qua chuẩn hóa định dạng trước khi nối reporting hay lookup.</div>
              <div className="rounded-2xl border border-border/70 bg-background/70 p-4">Giữ chỗ cho trạng thái đồng bộ và lịch sử revision để không hard-code quy trình về sau.</div>
              <div className="rounded-2xl border border-border/70 bg-background/70 p-4">Tách rõ dữ liệu tham chiếu, dữ liệu biên tập và dữ liệu export cho demo.</div>
            </div>
          </SectionCard>
        }
      >
        <div className="grid gap-4 md:grid-cols-3">
          <StatCard label="Domains" value="3 core sets" helper="Disease, drug, symptom" icon={<Database className="h-5 w-5" />} tone="primary" />
          <StatCard label="Pipelines" value="Import / Export" helper="Chuẩn bị cho CSV và JSON" icon={<ArrowUpDown className="h-5 w-5" />} tone="teal" />
          <StatCard label="Safety" value="Structured" helper="Ưu tiên chuẩn hóa và đối soát" icon={<ShieldCheck className="h-5 w-5" />} tone="neutral" />
        </div>

        <SectionCard title="Khối làm việc" description="Những nhóm tác vụ chính của workspace dữ liệu.">
          <div className="grid gap-4 lg:grid-cols-2">
            {dataDomains.map((domain, index) => (
              <article key={domain.title} className="rounded-[1rem] border border-border/70 bg-background/70 p-5">
                <div className="flex items-start gap-3">
                  <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${index === 0 ? "bg-primary/10 text-primary" : "bg-teal-accent/10 text-teal-accent"}`}>
                    {index === 0 ? <Stethoscope className="h-5 w-5" /> : <Files className="h-5 w-5" />}
                  </div>
                  <div className="space-y-2">
                    <h2 className="text-lg font-semibold tracking-tight text-foreground">{domain.title}</h2>
                    <p className="text-sm leading-6 text-muted-foreground">{domain.description}</p>
                  </div>
                </div>
                <div className="mt-4 grid gap-2">
                  {domain.items.map((item) => (
                    <div key={item} className="rounded-xl border border-dashed border-border/70 px-3 py-2 text-sm text-muted-foreground">
                      {item}
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </SectionCard>
      </PortalShell>
    </RoleGuard>
  )
}
