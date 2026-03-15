import { RoleGuard } from "@/components/role-guard"

export default function ManagementDataPage() {
  return (
    <RoleGuard roles={["ADMIN"]}>
      <div className="mx-auto max-w-6xl px-4 py-8">
        <h1 className="text-2xl font-bold text-slate-800">Quản lý dữ liệu y khoa</h1>
        <p className="text-slate-600 mt-1">Bệnh lý, thuốc, và chuẩn hóa thông tin</p>
        <div className="mt-6 grid md:grid-cols-2 gap-4">
          <div className="bg-card text-card-foreground rounded-xl border p-6 shadow-sm">
            <h3 className="font-semibold">Kho dữ liệu</h3>
            <p className="text-sm text-muted-foreground mt-1">Danh sách và trạng thái đồng bộ</p>
            <div className="mt-4 h-32 bg-white border rounded-md"></div>
          </div>
          <div className="bg-card text-card-foreground rounded-xl border p-6 shadow-sm">
            <h3 className="font-semibold">Nhập/Xuất</h3>
            <p className="text-sm text-muted-foreground mt-1">CSV/JSON và chuẩn hóa</p>
            <div className="mt-4 h-32 bg-white border rounded-md"></div>
          </div>
        </div>
      </div>
    </RoleGuard>
  )
}
