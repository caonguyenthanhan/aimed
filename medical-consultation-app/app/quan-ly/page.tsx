import Link from "next/link"
import { ArrowRight, Bot, Database, Settings2, ShieldCheck, UsersRound, ServerCog } from "lucide-react"
import PortalShell from "@/components/portal-shell"
import { RoleGuard } from "@/components/role-guard"
import { SectionCard } from "@/components/ui/section-card"
import { StatCard } from "@/components/ui/stat-card"

const workspaces = [
  {
    title: "Người dùng",
    description: "Theo dõi tài khoản, vai trò và trạng thái truy cập của toàn hệ thống.",
    href: "/quan-ly/user",
    helper: "Accounts and RBAC",
    icon: <UsersRound className="h-5 w-5" />,
    tone: "primary" as const,
  },
  {
    title: "Dữ liệu y khoa",
    description: "Quản trị danh mục bệnh, thuốc, tập dữ liệu và nhịp đồng bộ nội dung.",
    href: "/quan-ly/data",
    helper: "Medical content hub",
    icon: <Database className="h-5 w-5" />,
    tone: "teal" as const,
  },
  {
    title: "Cấu hình hệ thống",
    description: "Kiểm tra các thông số tích hợp, runtime và thiết lập điều hành.",
    href: "/quan-ly/config",
    helper: "Settings and integrations",
    icon: <Settings2 className="h-5 w-5" />,
    tone: "neutral" as const,
  },
  {
    title: "Runtime server",
    description: "Đi tới màn vận hành GPU URL, server registry và runtime events đã được nâng cấp.",
    href: "/admin/server",
    helper: "Operational console",
    icon: <ServerCog className="h-5 w-5" />,
    tone: "primary" as const,
  },
]

export default function ManagementPage() {
  return (
    <RoleGuard roles={["ADMIN"]}>
      <PortalShell
        eyebrow="Admin Workspace"
        title="Trung tâm quản trị hệ thống"
        description="Điểm vào chung cho đội vận hành: người dùng, dữ liệu y khoa, cấu hình tích hợp và runtime server. Trang này chỉ đổi shell trực quan, giữ nguyên role gate và route đích hiện có."
        aside={
          <div className="space-y-6">
            <SectionCard title="Ưu tiên điều hành" description="Các cụm cần kiểm tra nhanh trước mỗi buổi demo hoặc vận hành.">
              <div className="space-y-3 text-sm text-muted-foreground">
                <div className="rounded-2xl border border-border/70 bg-background/70 p-4">
                  Kiểm tra `Runtime server` khi cần đổi URL Colab/Ngrok, xác minh health-check hoặc dọn runtime events.
                </div>
                <div className="rounded-2xl border border-border/70 bg-background/70 p-4">
                  Vào `Người dùng` để rà role `ADMIN/DOCTOR/PATIENT` và luồng truy cập trước khi demo.
                </div>
                <div className="rounded-2xl border border-border/70 bg-background/70 p-4">
                  Dùng `Dữ liệu y khoa` và `Cấu hình hệ thống` làm hub cho nội dung vận hành và tích hợp.
                </div>
              </div>
            </SectionCard>
            <SectionCard title="Nguyên tắc" description="Giữ nhất quán với rule hệ thống hiện tại.">
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>UI chỉ đổi trình bày, không đổi hành vi backend/API.</p>
                <p>Admin routes tiếp tục đi qua `RoleGuard` để chặn truy cập sai vai trò.</p>
                <p>Runtime, logs và dữ liệu vận hành vẫn lấy từ các route đang có trong app.</p>
              </div>
            </SectionCard>
          </div>
        }
      >
        <div className="grid gap-4 md:grid-cols-3">
          <StatCard
            label="Workspaces"
            value={workspaces.length}
            helper="Các khu vực admin hiện có"
            icon={<ShieldCheck className="h-5 w-5" />}
            tone="primary"
          />
          <StatCard
            label="Operations"
            value="1 live console"
            helper="`/admin/server` đã dùng shell mới"
            icon={<ServerCog className="h-5 w-5" />}
            tone="teal"
          />
          <StatCard
            label="Coverage"
            value="GĐ5"
            helper="Đang tiếp tục retrofit nhóm Admin/System"
            icon={<Bot className="h-5 w-5" />}
            tone="neutral"
          />
        </div>

        <SectionCard
          title="Khu vực quản trị"
          description="Chọn workspace để tiếp tục kiểm soát hệ thống hoặc chỉnh sâu từng mảng."
        >
          <div className="grid gap-4 md:grid-cols-2">
            {workspaces.map((workspace) => (
              <Link
                key={workspace.href}
                href={workspace.href}
                className="app-surface hover-lift group rounded-[1rem] border border-border/70 bg-card/85 p-5 transition-colors hover:border-primary/40"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                      {workspace.icon}
                    </div>
                    <div className="space-y-2">
                      <h2 className="text-lg font-semibold tracking-tight text-foreground">{workspace.title}</h2>
                      <p className="text-sm leading-6 text-muted-foreground">{workspace.description}</p>
                    </div>
                  </div>
                  <ArrowRight className="mt-1 h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary" />
                </div>
                <div className="mt-4 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">{workspace.helper}</div>
              </Link>
            ))}
          </div>
        </SectionCard>
      </PortalShell>
    </RoleGuard>
  )
}
