import { Activity, ShieldCheck, UserCog, UsersRound } from "lucide-react"
import PortalShell from "@/components/portal-shell"
import { RoleGuard } from "@/components/role-guard"
import { SectionCard } from "@/components/ui/section-card"
import { StatCard } from "@/components/ui/stat-card"

const reviewBuckets = [
  {
    title: "Danh sách người dùng",
    description: "Không gian cho bảng user, tìm kiếm và bộ lọc role/trạng thái ở bước triển khai logic sau.",
    points: ["Tập trung patient / doctor / admin", "Theo dõi trạng thái hoạt động và khóa tài khoản", "Giữ chỗ cho filter và bulk actions"],
  },
  {
    title: "Thêm hoặc cập nhật",
    description: "Khu vực chuẩn bị cho form quản trị hồ sơ tài khoản và quyền truy cập.",
    points: ["Tách rõ thông tin định danh và quyền", "Ưu tiên an toàn role assignment", "Chuẩn bị chỗ cho audit note khi chỉnh sửa"],
  },
]

export default function ManagementUserPage() {
  return (
    <RoleGuard roles={["ADMIN"]}>
      <PortalShell
        eyebrow="Admin Users"
        title="Quản lý người dùng"
        description="Trang quản trị tài khoản, vai trò và trạng thái truy cập. Hiện vẫn là workspace tĩnh để định hình shell mới trước khi nối dữ liệu thật."
        aside={
          <SectionCard title="Checklist vận hành" description="Những điểm admin thường rà trước khi chạm logic sâu hơn.">
            <div className="space-y-3 text-sm text-muted-foreground">
              <div className="rounded-2xl border border-border/70 bg-background/70 p-4">Rà phân quyền `ADMIN`, `DOCTOR`, `PATIENT` trước khi cho phép chỉnh dữ liệu.</div>
              <div className="rounded-2xl border border-border/70 bg-background/70 p-4">Ưu tiên trạng thái tài khoản và quyền truy cập trước khi thêm thao tác bulk.</div>
              <div className="rounded-2xl border border-border/70 bg-background/70 p-4">Giữ audit-friendly layout để dễ gắn activity log ở bước sau.</div>
            </div>
          </SectionCard>
        }
      >
        <div className="grid gap-4 md:grid-cols-3">
          <StatCard label="Scopes" value="3 roles" helper="Admin, doctor, patient" icon={<ShieldCheck className="h-5 w-5" />} tone="primary" />
          <StatCard label="Workspace" value="User admin" helper="Chuẩn bị cho bảng account" icon={<UsersRound className="h-5 w-5" />} tone="teal" />
          <StatCard label="Audit" value="Ready" helper="Shell sẵn cho activity note" icon={<Activity className="h-5 w-5" />} tone="neutral" />
        </div>

        <SectionCard title="Khối chức năng" description="Các module chính cho quản trị vòng đời tài khoản.">
          <div className="grid gap-4 lg:grid-cols-2">
            {reviewBuckets.map((bucket) => (
              <article key={bucket.title} className="rounded-[1rem] border border-border/70 bg-background/70 p-5">
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <UserCog className="h-5 w-5" />
                  </div>
                  <div className="space-y-2">
                    <h2 className="text-lg font-semibold tracking-tight text-foreground">{bucket.title}</h2>
                    <p className="text-sm leading-6 text-muted-foreground">{bucket.description}</p>
                  </div>
                </div>
                <div className="mt-4 space-y-2">
                  {bucket.points.map((point) => (
                    <div key={point} className="rounded-xl border border-dashed border-border/70 px-3 py-2 text-sm text-muted-foreground">
                      {point}
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
