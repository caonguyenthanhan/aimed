import { Bell, Cog, Cpu, KeyRound, Settings2, ShieldCheck } from "lucide-react"
import PortalShell from "@/components/portal-shell"
import { RoleGuard } from "@/components/role-guard"
import { SectionCard } from "@/components/ui/section-card"
import { StatCard } from "@/components/ui/stat-card"

const configAreas = [
  {
    title: "Biến môi trường và secrets",
    description: "Khu vực trình bày các nhóm cấu hình backend, AI providers, integrations và keys nhạy cảm.",
    icon: <KeyRound className="h-5 w-5" />,
    tone: "primary",
  },
  {
    title: "Runtime và endpoints",
    description: "Tổng hợp điểm vào cho CPU/GPU routes, server URLs, health-checks và metrics vận hành.",
    icon: <Cpu className="h-5 w-5" />,
    tone: "teal",
  },
  {
    title: "Thông báo và guardrails",
    description: "Vùng dành cho notification settings, policy switches và quy tắc an toàn hệ thống.",
    icon: <Bell className="h-5 w-5" />,
    tone: "neutral",
  },
]

export default function ManagementConfigPage() {
  return (
    <RoleGuard roles={["ADMIN"]}>
      <PortalShell
        eyebrow="Admin Config"
        title="Cấu hình hệ thống"
        description="Workspace cấu hình cho tích hợp, runtime và guardrails. Trang hiện được nâng lên cùng design system admin nhưng chưa thêm thao tác ghi cấu hình thật."
        aside={
          <SectionCard title="Ghi nhớ cấu hình" description="Những điều cần giữ an toàn khi triển khai logic cấu hình sau này.">
            <div className="space-y-3 text-sm text-muted-foreground">
              <div className="rounded-2xl border border-border/70 bg-background/70 p-4">Không hiển thị trực tiếp secrets trong UI; chỉ nên có trạng thái configured/unconfigured hoặc masked values.</div>
              <div className="rounded-2xl border border-border/70 bg-background/70 p-4">Runtime routes nên bám SSOT đang có thay vì tạo thêm nguồn truth mới.</div>
              <div className="rounded-2xl border border-border/70 bg-background/70 p-4">Mọi thao tác cấu hình sau này cần tách rõ preview, validate và apply để giảm rủi ro vận hành.</div>
            </div>
          </SectionCard>
        }
      >
        <div className="grid gap-4 md:grid-cols-3">
          <StatCard label="Config groups" value={configAreas.length} helper="Secrets, runtime, notifications" icon={<Settings2 className="h-5 w-5" />} tone="primary" />
          <StatCard label="Runtime" value="CPU / GPU" helper="Gắn với admin runtime hiện có" icon={<Cpu className="h-5 w-5" />} tone="teal" />
          <StatCard label="Guardrails" value="Safe by design" helper="Ưu tiên validate trước apply" icon={<ShieldCheck className="h-5 w-5" />} tone="neutral" />
        </div>

        <SectionCard title="Khối cấu hình" description="Nhóm cấu hình chính dành cho admin và vận hành hệ thống.">
          <div className="grid gap-4 lg:grid-cols-3">
            {configAreas.map((area) => (
              <article key={area.title} className="rounded-[1rem] border border-border/70 bg-background/70 p-5">
                <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${
                  area.tone === "primary"
                    ? "bg-primary/10 text-primary"
                    : area.tone === "teal"
                      ? "bg-teal-accent/10 text-teal-accent"
                      : "bg-secondary text-foreground"
                }`}>
                  {area.icon}
                </div>
                <div className="mt-4 space-y-2">
                  <h2 className="text-lg font-semibold tracking-tight text-foreground">{area.title}</h2>
                  <p className="text-sm leading-6 text-muted-foreground">{area.description}</p>
                </div>
                <div className="mt-4 rounded-xl border border-dashed border-border/70 px-3 py-2 text-sm text-muted-foreground">
                  Placeholder module cho bước nối settings thật ở phase tiếp theo.
                </div>
              </article>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Liên kết vận hành" description="Các workspace liên quan trực tiếp tới runtime và cấu hình hệ thống.">
          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-2xl border border-border/70 bg-background/70 p-4 text-sm text-muted-foreground">
              `Runtime server` tại `/admin/server` vẫn là nơi vận hành URL GPU, server registry và runtime events.
            </div>
            <div className="rounded-2xl border border-border/70 bg-background/70 p-4 text-sm text-muted-foreground">
              `Cấu hình hệ thống` đóng vai trò bảng điều phối cấu hình, không thay thế route runtime hiện có.
            </div>
          </div>
        </SectionCard>
      </PortalShell>
    </RoleGuard>
  )
}
