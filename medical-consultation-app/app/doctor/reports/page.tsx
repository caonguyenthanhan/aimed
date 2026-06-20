'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Calendar, Download, FileText, ShieldCheck, Sparkles, TrendingUp } from 'lucide-react'
import { demoReports, type DoctorReport } from "@/lib/doctor-demo"
import PortalShell from "@/components/portal-shell"
import { SectionCard } from "@/components/ui/section-card"
import { StatCard } from "@/components/ui/stat-card"
import { Button } from "@/components/ui/button"

export default function DoctorReportsPage() {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [reports, setReports] = useState<DoctorReport[]>([])

  const STORAGE_KEY = "mcs_doctor_reports_v1"

  useEffect(() => {
    setMounted(true)
    const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null
    const role = typeof window !== 'undefined' ? localStorage.getItem('userRole') : null
    
    if (!token || role !== 'doctor') {
      router.replace('/login')
      return
    }
  }, [router])

  if (!mounted) return null

  useEffect(() => {
    const loadLocal = () => {
      try {
        const raw = localStorage.getItem(STORAGE_KEY)
        if (!raw) return []
        const arr = JSON.parse(raw)
        return Array.isArray(arr) ? (arr as any[]) : []
      } catch {
        return []
      }
    }
    const local = loadLocal()
    const merged = [...local, ...demoReports].filter(Boolean)
    merged.sort((a: any, b: any) => String(b?.date || "").localeCompare(String(a?.date || "")))
    setReports(merged as any)
  }, [])

  const stats = useMemo(() => {
    const total = reports.length
    const drafts = reports.filter((report) => report.status === "Đang soạn").length
    const completed = reports.filter((report) => report.status === "Hoàn tất").length
    return { total, drafts, completed }
  }, [reports])

  const downloadReport = (r: any) => {
    try {
      const content =
        String(r?.content || "").trim() ||
        [
          `Tiêu đề: ${r?.title || ""}`,
          `Loại: ${r?.type || ""}`,
          `Ngày: ${r?.date || ""}`,
          `Bệnh nhân: ${r?.patients ?? ""}`,
          `Phiên tư vấn: ${r?.sessions ?? ""}`,
          `Trạng thái: ${r?.status || ""}`,
          r?.range?.from && r?.range?.to ? `Khoảng: ${r.range.from} → ${r.range.to}` : "",
        ]
          .filter(Boolean)
          .join("\n")
      const blob = new Blob([content], { type: "text/plain;charset=utf-8" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `${String(r?.title || "bao-cao").replace(/[^\w\s-]+/g, "").trim().replace(/\s+/g, "-").toLowerCase() || "bao-cao"}.txt`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch {}
  }

  return (
    <PortalShell
      eyebrow="Medical Reports"
      title="Báo cáo tư vấn"
      description="Quản lý, rà soát và tải xuống các báo cáo trong doctor portal. Logic localStorage và download text được giữ nguyên."
      actions={
        <div className="flex flex-wrap gap-3">
          <Button className="rounded-xl" onClick={() => router.push("/doctor/reports/new")}>
            New Manual Note
          </Button>
          <Button variant="outline" className="rounded-xl">
            Run AI Audit
          </Button>
        </div>
      }
      aside={
        <div className="space-y-6">
          <SectionCard title="Report State" description="Tổng quan nhanh về nguồn dữ liệu báo cáo hiện tại.">
            <div className="rounded-[1.2rem] bg-primary px-5 py-5 text-primary-foreground">
              <div className="mb-2 flex items-center gap-2 text-primary-foreground/90">
                <ShieldCheck className="h-5 w-5" />
                <span className="text-sm font-semibold uppercase tracking-[0.18em]">Local + Demo</span>
              </div>
              <p className="text-sm leading-6 text-primary-foreground/85">
                Màn này đang merge báo cáo từ `localStorage` với dataset demo trong `doctor-demo` và sắp xếp theo ngày.
              </p>
            </div>
          </SectionCard>
        </div>
      }
    >
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Total Reports" value={stats.total} helper="Tất cả báo cáo đang hiển thị" icon={<FileText className="h-5 w-5" />} tone="primary" />
        <StatCard label="Drafts" value={stats.drafts} helper="Cần hoàn thiện hoặc kiểm tra lại" icon={<Sparkles className="h-5 w-5" />} tone="neutral" />
        <StatCard label="Signed" value={stats.completed} helper="Báo cáo hoàn tất" icon={<TrendingUp className="h-5 w-5" />} tone="teal" />
      </div>

      <SectionCard
        title="Danh sách báo cáo"
        description="Danh sách hợp nhất giữa report demo và report người dùng đã lưu cục bộ."
        badge={
          <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
            {reports.length} items
          </span>
        }
        contentClassName="space-y-4"
      >
        {reports.map((report) => (
          <div key={report.id} className="app-surface hover-lift rounded-[1.35rem] bg-card/90 p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0 flex-1">
                <h3 className="mb-2 text-lg font-semibold tracking-tight text-foreground">{report.title}</h3>
                <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    {new Date(report.date).toLocaleDateString('vi-VN')}
                  </div>
                  <span className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-foreground">{report.type}</span>
                  <span>{report.patients} bệnh nhân • {report.sessions} phiên tư vấn</span>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <span className={`rounded-full px-3 py-1 text-xs font-medium ${
                  report.status === 'Hoàn tất'
                    ? 'bg-teal-accent/10 text-teal-accent'
                    : 'bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300'
                }`}>
                  {report.status}
                </span>
                <Button type="button" variant="outline" className="rounded-xl" onClick={() => downloadReport(report as any)}>
                  <Download className="mr-2 h-4 w-4" />
                  Tải xuống
                </Button>
              </div>
            </div>
          </div>
        ))}
      </SectionCard>

      <SectionCard title="Xuất báo cáo mới" description="Tạo báo cáo tùy chỉnh dựa trên khoảng thời gian và bệnh nhân bạn chọn.">
        <div className="flex flex-col gap-4 rounded-[1.35rem] bg-primary/5 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="font-semibold text-foreground">Tạo báo cáo mới</div>
            <div className="mt-1 text-sm text-muted-foreground">Đi sang workspace tạo báo cáo để chọn loại báo cáo, khoảng thời gian và bệnh nhân.</div>
          </div>
          <Button type="button" className="rounded-xl" onClick={() => router.push("/doctor/reports/new")}>
            Tạo báo cáo mới
          </Button>
        </div>
      </SectionCard>
    </PortalShell>
  )
}
