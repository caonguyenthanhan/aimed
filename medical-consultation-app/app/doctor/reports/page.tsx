'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Download, Calendar, BarChart3, TrendingUp, FileText } from 'lucide-react'
import { demoReports, type DoctorReport } from "@/lib/doctor-demo"

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

  const stats = [
    {
      label: 'Tổng báo cáo',
      value: '28',
      icon: FileText,
      color: 'blue',
    },
    {
      label: 'Tư vấn tháng này',
      value: '45',
      icon: TrendingUp,
      color: 'green',
    },
    {
      label: 'Bệnh nhân hoạt động',
      value: '24',
      icon: BarChart3,
      color: 'purple',
    },
  ]

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-slate-50 mb-2">
          Báo cáo tư vấn
        </h1>
        <p className="text-slate-600 dark:text-slate-400">
          Xem và quản lý các báo cáo tư vấn của bạn
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {stats.map((stat, idx) => {
          const Icon = stat.icon
          const colorClasses = {
            blue: 'bg-blue-100 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300',
            green: 'bg-green-100 dark:bg-green-950/30 text-green-700 dark:text-green-300',
            purple: 'bg-purple-100 dark:bg-purple-950/30 text-purple-700 dark:text-purple-300',
          }

          return (
            <div
              key={idx}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-6 shadow-sm"
            >
              <div className={`w-12 h-12 rounded-lg ${colorClasses[stat.color as keyof typeof colorClasses]} flex items-center justify-center mb-4`}>
                <Icon size={24} />
              </div>
              <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">
                {stat.label}
              </p>
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-50">
                {stat.value}
              </p>
            </div>
          )
        })}
      </div>

      {/* Reports List */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm">
        <div className="p-6 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-50">Danh sách báo cáo</h2>
        </div>

        <div className="divide-y divide-slate-200 dark:divide-slate-700">
          {reports.map((report) => (
            <div
              key={report.id}
              className="p-6 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition"
            >
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex-1">
                  <h3 className="font-semibold text-slate-900 dark:text-slate-50 mb-2">
                    {report.title}
                  </h3>
                  <div className="flex flex-wrap gap-4 text-sm text-slate-600 dark:text-slate-400">
                    <div className="flex items-center gap-2">
                      <Calendar size={16} />
                      {new Date(report.date).toLocaleDateString('vi-VN')}
                    </div>
                    <div>
                      <span className="px-2 py-1 rounded-full text-xs bg-slate-100 dark:bg-slate-800 font-medium">
                        {report.type}
                      </span>
                    </div>
                    <div>
                      {report.patients} bệnh nhân • {report.sessions} phiên tư vấn
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-xs px-3 py-1 rounded-full font-medium ${
                    report.status === 'Hoàn tất'
                      ? 'bg-green-100 dark:bg-green-950/30 text-green-700 dark:text-green-300'
                      : 'bg-orange-100 dark:bg-orange-950/30 text-orange-700 dark:text-orange-300'
                  }`}>
                    {report.status}
                  </span>
                  <button
                    type="button"
                    onClick={() => downloadReport(report as any)}
                    className="p-2 rounded-lg bg-blue-100 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-950/50 transition"
                  >
                    <Download size={18} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Export Section */}
      <div className="mt-8 p-6 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
        <h3 className="font-bold text-slate-900 dark:text-slate-50 mb-3">Xuất báo cáo mới</h3>
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
          Tạo báo cáo tùy chỉnh dựa trên khoảng thời gian và bệnh nhân bạn chọn
        </p>
        <button
          type="button"
          onClick={() => router.push("/doctor/reports/new")}
          className="px-6 py-2.5 rounded-lg bg-blue-600 dark:bg-blue-600 text-white font-semibold hover:bg-blue-700 dark:hover:bg-blue-700 transition"
        >
          Tạo báo cáo mới
        </button>
      </div>
    </div>
  )
}
