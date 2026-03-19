"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Calendar, FileText, Save } from "lucide-react"
import { demoPatients } from "@/lib/doctor-demo"

type DoctorReportDraft = {
  id: string
  title: string
  date: string
  type: string
  patients: number
  sessions: number
  status: "Hoàn tất" | "Đang soạn"
  range?: { from: string; to: string }
  patientId?: number
  content?: string
}

const STORAGE_KEY = "mcs_doctor_reports_v1"

function loadLocalReports(): DoctorReportDraft[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const arr = JSON.parse(raw)
    if (!Array.isArray(arr)) return []
    return arr as any
  } catch {
    return []
  }
}

function saveLocalReports(items: DoctorReportDraft[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  } catch {}
}

const todayIso = () => new Date().toISOString().slice(0, 10)

export default function DoctorReportNewPage() {
  const router = useRouter()
  const search = useSearchParams()
  const [mounted, setMounted] = useState(false)

  const defaultPatientId = useMemo(() => {
    const raw = search?.get("patientId") || ""
    const n = Number(raw)
    return Number.isFinite(n) ? n : 0
  }, [search])

  const [reportType, setReportType] = useState<string>("Tùy chỉnh")
  const [fromDate, setFromDate] = useState<string>(() => todayIso())
  const [toDate, setToDate] = useState<string>(() => todayIso())
  const [patientId, setPatientId] = useState<number>(defaultPatientId)
  const [title, setTitle] = useState<string>("")
  const [notes, setNotes] = useState<string>("")

  useEffect(() => {
    setMounted(true)
    const token = typeof window !== "undefined" ? localStorage.getItem("authToken") : null
    const role = typeof window !== "undefined" ? localStorage.getItem("userRole") : null
    if (!token || role !== "doctor") {
      router.replace("/login")
      return
    }
  }, [router])

  useEffect(() => {
    const base =
      reportType === "Hàng tuần"
        ? "Báo cáo hàng tuần"
        : reportType === "Hàng tháng"
          ? "Báo cáo hàng tháng"
          : reportType === "Quý"
            ? "Báo cáo theo quý"
            : "Báo cáo tư vấn"
    const who = patientId ? demoPatients.find((p) => p.id === patientId)?.name || "" : ""
    const range = fromDate && toDate ? `${fromDate} → ${toDate}` : ""
    const composed = [base, who ? `- ${who}` : "", range ? `(${range})` : ""].filter(Boolean).join(" ")
    setTitle(composed)
  }, [reportType, fromDate, toDate, patientId])

  if (!mounted) return null

  const canSave = !!title.trim() && !!fromDate && !!toDate

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-slate-50">Tạo báo cáo mới</div>
          <div className="text-sm text-slate-600 dark:text-slate-400 mt-1">Bản demo: lưu cục bộ, tải xuống được</div>
        </div>
        <button
          type="button"
          disabled={!canSave}
          onClick={() => {
            if (!canSave) return
            const id = `dr-${Date.now().toString(16)}-${Math.random().toString(16).slice(2)}`
            const sessions = patientId ? (demoPatients.find((p) => p.id === patientId)?.sessions || 0) : 45
            const patientsCount = patientId ? 1 : 24
            const content = [
              `Tiêu đề: ${title}`,
              `Loại: ${reportType}`,
              `Khoảng thời gian: ${fromDate} → ${toDate}`,
              patientId ? `Bệnh nhân: ${demoPatients.find((p) => p.id === patientId)?.name || patientId}` : `Bệnh nhân: ${patientsCount}`,
              `Số phiên tư vấn: ${sessions}`,
              notes.trim() ? `Ghi chú: ${notes.trim()}` : "",
            ]
              .filter(Boolean)
              .join("\n")
            const report: DoctorReportDraft = {
              id,
              title: title.trim(),
              date: todayIso(),
              type: reportType,
              patients: patientsCount,
              sessions,
              status: "Hoàn tất",
              range: { from: fromDate, to: toDate },
              patientId: patientId || undefined,
              content,
            }
            const prev = loadLocalReports()
            saveLocalReports([report, ...prev].slice(0, 200))
            router.push("/doctor/reports?created=1")
          }}
          className={`px-4 py-2 rounded-lg font-medium transition flex items-center gap-2 ${
            canSave ? "bg-blue-600 text-white hover:bg-blue-700" : "bg-slate-200 text-slate-500 cursor-not-allowed"
          }`}
        >
          <Save size={18} />
          Lưu báo cáo
        </button>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-6 shadow-sm space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <div className="text-sm font-medium">Loại báo cáo</div>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
              className="w-full h-10 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-sm"
            >
              <option value="Tùy chỉnh">Tùy chỉnh</option>
              <option value="Hàng tuần">Hàng tuần</option>
              <option value="Hàng tháng">Hàng tháng</option>
              <option value="Quý">Quý</option>
            </select>
          </div>
          <div className="space-y-1">
            <div className="text-sm font-medium">Bệnh nhân (tùy chọn)</div>
            <select
              value={String(patientId || 0)}
              onChange={(e) => setPatientId(Number(e.target.value))}
              className="w-full h-10 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-sm"
            >
              <option value="0">Tất cả</option>
              {demoPatients.map((p) => (
                <option key={p.id} value={String(p.id)}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <div className="text-sm font-medium flex items-center gap-2">
              <Calendar size={16} />
              Từ ngày
            </div>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-full h-10 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-sm"
            />
          </div>
          <div className="space-y-1">
            <div className="text-sm font-medium flex items-center gap-2">
              <Calendar size={16} />
              Đến ngày
            </div>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-full h-10 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-sm"
            />
          </div>
        </div>

        <div className="space-y-1">
          <div className="text-sm font-medium flex items-center gap-2">
            <FileText size={16} />
            Tiêu đề
          </div>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full h-10 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-sm"
          />
        </div>

        <div className="space-y-1">
          <div className="text-sm font-medium">Ghi chú</div>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={5}
            className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm resize-none"
            placeholder="Tóm tắt nhận định và khuyến nghị..."
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => router.push("/doctor/reports")}
            className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-50 font-medium hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            Quay lại
          </button>
        </div>
      </div>
    </div>
  )
}

