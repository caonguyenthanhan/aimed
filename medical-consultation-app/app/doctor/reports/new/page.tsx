"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Calendar, FileText, Save, ShieldCheck } from "lucide-react"
import { demoPatients } from "@/lib/doctor-demo"
import PortalShell from "@/components/portal-shell"
import { SectionCard } from "@/components/ui/section-card"
import { Button } from "@/components/ui/button"

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
    <PortalShell
      eyebrow="Create Report"
      title="Tạo báo cáo mới"
      description="Workspace tạo báo cáo trong doctor portal. Logic vẫn lưu cục bộ vào `mcs_doctor_reports_v1` và điều hướng về danh sách sau khi tạo."
      actions={
        <Button
          type="button"
          disabled={!canSave}
          className="rounded-xl"
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
        >
          <Save className="mr-2 h-4 w-4" />
          Lưu báo cáo
        </Button>
      }
      aside={
        <div className="space-y-6">
          <SectionCard title="Tóm tắt" description="Preview nhanh trước khi lưu báo cáo.">
            <div className="space-y-3 text-sm">
              <div className="rounded-xl bg-secondary/55 px-4 py-3">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Loại</div>
                <div className="mt-1 font-medium text-foreground">{reportType}</div>
              </div>
              <div className="rounded-xl bg-secondary/55 px-4 py-3">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Phạm vi</div>
                <div className="mt-1 font-medium text-foreground">{fromDate} → {toDate}</div>
              </div>
              <div className="rounded-xl bg-secondary/55 px-4 py-3">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Đối tượng</div>
                <div className="mt-1 font-medium text-foreground">
                  {patientId ? demoPatients.find((p) => p.id === patientId)?.name || patientId : "Tất cả bệnh nhân"}
                </div>
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Storage Mode" description="Thông tin về cách lưu report trong bản hiện tại.">
            <div className="rounded-[1.2rem] bg-primary px-5 py-5 text-primary-foreground">
              <div className="mb-2 flex items-center gap-2 text-primary-foreground/90">
                <ShieldCheck className="h-5 w-5" />
                <span className="text-sm font-semibold uppercase tracking-[0.18em]">Local Save</span>
              </div>
              <p className="text-sm leading-6 text-primary-foreground/85">
                Draft/report mới được lưu vào localStorage và hợp nhất trong màn `doctor/reports`.
              </p>
            </div>
          </SectionCard>
        </div>
      }
    >
      <div className="space-y-6">
        <SectionCard
          title="Bước 1 — Cấu hình báo cáo"
          description="Chọn loại báo cáo và đối tượng muốn tổng hợp."
          badge={
            <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
              Step 1
            </span>
          }
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <div className="text-sm font-medium">Loại báo cáo</div>
              <select
                value={reportType}
                onChange={(e) => setReportType(e.target.value)}
                className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm"
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
                className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm"
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
        </SectionCard>

        <SectionCard
          title="Bước 2 — Khoảng thời gian"
          description="Chọn khoảng thời gian để thống kê dữ liệu cho báo cáo."
          badge={
            <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
              Step 2
            </span>
          }
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Calendar className="h-4 w-4" />
                Từ ngày
              </div>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm"
              />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Calendar className="h-4 w-4" />
                Đến ngày
              </div>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm"
              />
            </div>
          </div>
        </SectionCard>

        <SectionCard
          title="Bước 3 — Nội dung báo cáo"
          description="Tinh chỉnh tiêu đề và ghi chú cho báo cáo sẽ được lưu."
          badge={
            <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
              Step 3
            </span>
          }
        >
          <div className="space-y-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm font-medium">
                <FileText className="h-4 w-4" />
                Tiêu đề
              </div>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm"
              />
            </div>
            <div className="space-y-1">
              <div className="text-sm font-medium">Ghi chú</div>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={5}
                className="w-full resize-none rounded-xl border border-border bg-background px-3 py-3 text-sm"
                placeholder="Tóm tắt nhận định và khuyến nghị..."
              />
            </div>
            <div className="flex flex-wrap gap-3">
              <Button
                type="button"
                variant="outline"
                className="rounded-xl"
                onClick={() => router.push("/doctor/reports")}
              >
                Quay lại
              </Button>
            </div>
          </div>
        </SectionCard>
      </div>
    </PortalShell>
  )
}

