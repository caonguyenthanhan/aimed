import { RoleGuard } from "@/components/role-guard"

export default function ManagementConfigPage() {
  return (
    <RoleGuard roles={["ADMIN"]}>
      <div className="mx-auto max-w-6xl px-4 py-8">
        <h1 className="text-2xl font-bold text-slate-800">Cấu hình hệ thống</h1>
        <p className="text-slate-600 mt-1">Thông số tích hợp, endpoint và runtime</p>
        <div className="mt-6 grid md:grid-cols-2 gap-4">
          <div className="bg-card text-card-foreground rounded-xl border p-6 shadow-sm">
            <h3 className="font-semibold">Biến môi trường</h3>
            <p className="text-sm text-muted-foreground mt-1">`BACKEND_URL`, `INTERNAL_LLM_URL`, ...</p>
            <div className="mt-4 h-32 bg-white border rounded-md"></div>
          </div>
          <div className="bg-card text-card-foreground rounded-xl border p-6 shadow-sm">
            <h3 className="font-semibold">Runtime</h3>
            <p className="text-sm text-muted-foreground mt-1">Chế độ CPU/GPU và metrics</p>
            <div className="mt-4 h-32 bg-white border rounded-md"></div>
          </div>
        </div>
      </div>
    </RoleGuard>
  )
}
