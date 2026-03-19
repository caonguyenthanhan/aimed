import Link from "next/link"
import { RoleGuard } from "@/components/role-guard"

export default function ManagementPage() {
  return (
    <RoleGuard roles={["ADMIN"]}>
      <div className="mx-auto max-w-6xl px-4 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-50">Trang quản lý</h1>
          <p className="text-slate-600 dark:text-slate-400 mt-2">Quản trị hệ thống, người dùng và nội dung</p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Link href="/quan-ly/user" className="group relative block p-6 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-md transition-all hover:-translate-y-0.5">
            <div className="flex items-center justify-between mb-4">
              <div className="h-12 w-12 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <span className="text-xl">👥</span>
              </div>
              <span className="text-sm font-semibold text-blue-600 dark:text-blue-400 group-hover:translate-x-1 transition-transform">Mở →</span>
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-50">Người dùng</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">Quản lý tài khoản, phân quyền người dùng</p>
          </Link>
          <Link href="/quan-ly/data" className="group relative block p-6 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-teal-300 dark:hover:border-teal-600 hover:shadow-md transition-all hover:-translate-y-0.5">
            <div className="flex items-center justify-between mb-4">
              <div className="h-12 w-12 rounded-lg bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center">
                <span className="text-xl">📊</span>
              </div>
              <span className="text-sm font-semibold text-teal-600 dark:text-teal-400 group-hover:translate-x-1 transition-transform">Mở →</span>
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-50">Dữ liệu y khoa</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">Cơ sở dữ liệu bệnh lý, thuốc, triệu chứng</p>
          </Link>
          <Link href="/quan-ly/config" className="group relative block p-6 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-emerald-300 dark:hover:border-emerald-600 hover:shadow-md transition-all hover:-translate-y-0.5">
            <div className="flex items-center justify-between mb-4">
              <div className="h-12 w-12 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                <span className="text-xl">⚙️</span>
              </div>
              <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 group-hover:translate-x-1 transition-transform">Mở →</span>
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-50">Cấu hình hệ thống</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">Thông số cấu hình, tích hợp API và thông báo</p>
          </Link>
        </div>
      </div>
    </RoleGuard>
  )
}
