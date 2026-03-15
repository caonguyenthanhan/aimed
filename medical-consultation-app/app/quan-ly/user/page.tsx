import { RoleGuard } from "@/components/role-guard"

export default function ManagementUserPage() {
  return (
    <RoleGuard roles={["ADMIN"]}>
      <div className="mx-auto max-w-6xl px-4 py-8">
        <h1 className="text-2xl font-bold text-slate-800">Quản lý người dùng</h1>
        <p className="text-slate-600 mt-1">Tài khoản, vai trò và trạng thái</p>
        <div className="mt-6 grid md:grid-cols-2 gap-4">
          <div className="bg-card text-card-foreground rounded-xl border p-6 shadow-sm">
            <h3 className="font-semibold">Danh sách người dùng</h3>
            <p className="text-sm text-muted-foreground mt-1">Hiển thị và tìm kiếm người dùng</p>
            <div className="mt-4 h-32 bg-white border rounded-md"></div>
          </div>
          <div className="bg-card text-card-foreground rounded-xl border p-6 shadow-sm">
            <h3 className="font-semibold">Thêm/Cập nhật</h3>
            <p className="text-sm text-muted-foreground mt-1">Quản lý thông tin tài khoản</p>
            <div className="mt-4 h-32 bg-white border rounded-md"></div>
          </div>
        </div>
      </div>
    </RoleGuard>
  )
}
