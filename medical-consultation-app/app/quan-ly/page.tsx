import Link from "next/link"
import { RoleGuard } from "@/components/role-guard"

export default function ManagementPage() {
  return (
    <RoleGuard roles={["ADMIN"]}>
      <div className="mx-auto max-w-6xl px-4 py-8">
        <h1 className="text-2xl font-bold text-slate-800">Trang quản lý</h1>
        <p className="text-slate-600 mt-1">Quản trị hệ thống và nội dung</p>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
          <div className="bg-card text-card-foreground rounded-xl border p-6 shadow-sm">
            <h3 className="font-semibold">Người dùng</h3>
            <p className="text-sm text-muted-foreground mt-1">Quản lý tài khoản người dùng</p>
            <Link href="/quan-ly/user" className="mt-4 inline-flex items-center rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm">Mở</Link>
          </div>
          <div className="bg-card text-card-foreground rounded-xl border p-6 shadow-sm">
            <h3 className="font-semibold">Dữ liệu y khoa</h3>
            <p className="text-sm text-muted-foreground mt-1">Cơ sở dữ liệu bệnh lý, thuốc</p>
            <Link href="/quan-ly/data" className="mt-4 inline-flex items-center rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm">Mở</Link>
          </div>
          <div className="bg-card text-card-foreground rounded-xl border p-6 shadow-sm">
            <h3 className="font-semibold">Cấu hình hệ thống</h3>
            <p className="text-sm text-muted-foreground mt-1">Thông số và tích hợp</p>
            <Link href="/quan-ly/config" className="mt-4 inline-flex items-center rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm">Mở</Link>
          </div>
        </div>
      </div>
    </RoleGuard>
  )
}
