"use client"

import { useEffect, useMemo, useState } from "react"
import { useParams } from "next/navigation"
import { CalendarDays, Clock3, FileText, ShieldCheck, UserRound } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { Appointment } from "@/lib/appointments"
import { newAppointmentId } from "@/lib/appointments"
import { useToast } from "@/hooks/use-toast"
import PortalShell from "@/components/portal-shell"
import { SectionCard } from "@/components/ui/section-card"

const LOCAL_KEY = "mcs_appointments_local_v1"

function saveLocal(ap: Appointment) {
  try {
    const raw = localStorage.getItem(LOCAL_KEY)
    const arr = raw ? JSON.parse(raw) : []
    const list = Array.isArray(arr) ? arr : []
    localStorage.setItem(LOCAL_KEY, JSON.stringify([ap, ...list].slice(0, 200)))
  } catch {}
}

export default function BookDoctorAppointmentPage() {
  const params = useParams()
  const { toast } = useToast()

  const doctorId = useMemo(() => {
    const raw = Array.isArray((params as any)?.doctorId) ? (params as any).doctorId[0] : (params as any)?.doctorId
    return String(raw || "").trim()
  }, [params])

  const [patientName, setPatientName] = useState("")
  const [phone, setPhone] = useState("")
  const [email, setEmail] = useState("")
  const [scheduledAt, setScheduledAt] = useState("")
  const [reason, setReason] = useState("")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    try {
      const n = localStorage.getItem("userFullName") || localStorage.getItem("username") || ""
      if (n && !patientName) setPatientName(String(n))
    } catch {}
  }, [patientName])

  const canSubmit = patientName.trim() && reason.trim() && scheduledAt.trim()

  const submit = async () => {
    if (!canSubmit || saving) return
    setSaving(true)
    const ap: Appointment = {
      id: newAppointmentId(),
      doctor_id: doctorId,
      patient_name: patientName.trim(),
      contact: { phone: phone.trim() || undefined, email: email.trim() || undefined },
      scheduled_at: new Date(scheduledAt).toISOString(),
      reason: reason.trim(),
      status: "pending",
      created_at: new Date().toISOString(),
    }
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("authToken") : null
      const role = typeof window !== "undefined" ? localStorage.getItem("userRole") : null
      const resp = await fetch("/api/appointments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token && role !== "doctor" ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          doctor_id: ap.doctor_id,
          patient_name: ap.patient_name,
          contact: ap.contact,
          scheduled_at: ap.scheduled_at,
          reason: ap.reason,
        }),
      })
      if (resp.status === 503) {
        saveLocal(ap)
        toast({ title: "Đã ghi nhận (offline)", description: "Chưa cấu hình database nên bác sĩ chưa nhận được trên thiết bị khác." })
        window.location.href = `/bac-si/${encodeURIComponent(doctorId)}`
        return
      }
      if (!resp.ok) throw new Error(await resp.text())
      toast({ title: "Đã gửi yêu cầu hẹn", description: "Bác sĩ sẽ xác nhận lịch hẹn." })
      window.location.href = `/bac-si/${encodeURIComponent(doctorId)}`
    } catch {
      saveLocal(ap)
      toast({ title: "Đã ghi nhận (offline)", description: "Không gửi được lên server, đã lưu trên thiết bị này." })
      window.location.href = `/bac-si/${encodeURIComponent(doctorId)}`
    } finally {
      setSaving(false)
    }
  }

  return (
    <PortalShell
      eyebrow="Book Appointment"
      title="Đặt hẹn bác sĩ"
      description="Yêu cầu hẹn sẽ được tạo ở trạng thái chờ xác nhận. Logic gửi appointment giữ nguyên qua `/api/appointments` và fallback local như cũ."
      actions={
        <div className="flex items-center gap-2">
          <span className={`h-1.5 rounded-full transition-all ${patientName ? "w-8 bg-primary" : "w-3 bg-secondary"}`} />
          <span className={`h-1.5 rounded-full transition-all ${scheduledAt ? "w-8 bg-primary" : "w-3 bg-secondary"}`} />
          <span className={`h-1.5 rounded-full transition-all ${reason ? "w-8 bg-primary" : "w-3 bg-secondary"}`} />
        </div>
      }
      aside={
        <div className="space-y-6">
          <SectionCard title="Tóm tắt lịch hẹn" description="Thông tin sẽ được gửi tới bác sĩ khi bạn xác nhận.">
            <div className="space-y-3">
              <div className="rounded-xl bg-secondary/55 px-4 py-3">
                <div className="mb-1 flex items-center gap-2 text-muted-foreground">
                  <UserRound className="h-4 w-4" />
                  <span className="text-[11px] font-semibold uppercase tracking-[0.18em]">Bệnh nhân</span>
                </div>
                <div className="text-sm font-medium text-foreground">{patientName.trim() || "Chưa nhập"}</div>
              </div>
              <div className="rounded-xl bg-secondary/55 px-4 py-3">
                <div className="mb-1 flex items-center gap-2 text-muted-foreground">
                  <CalendarDays className="h-4 w-4" />
                  <span className="text-[11px] font-semibold uppercase tracking-[0.18em]">Thời gian</span>
                </div>
                <div className="text-sm font-medium text-foreground">
                  {scheduledAt ? new Date(scheduledAt).toLocaleString("vi-VN") : "Chưa chọn"}
                </div>
              </div>
              <div className="rounded-xl bg-secondary/55 px-4 py-3">
                <div className="mb-1 flex items-center gap-2 text-muted-foreground">
                  <Clock3 className="h-4 w-4" />
                  <span className="text-[11px] font-semibold uppercase tracking-[0.18em]">Kênh liên hệ</span>
                </div>
                <div className="text-sm font-medium text-foreground">
                  {phone.trim() || email.trim() ? [phone.trim(), email.trim()].filter(Boolean).join(" • ") : "Chưa thêm"}
                </div>
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Lưu ý" description="Flow đặt hẹn này có fallback cục bộ khi server/DB chưa sẵn sàng.">
            <div className="rounded-[1.2rem] bg-primary px-5 py-5 text-primary-foreground">
              <div className="mb-2 flex items-center gap-2 text-primary-foreground/90">
                <ShieldCheck className="h-5 w-5" />
                <span className="text-sm font-semibold uppercase tracking-[0.18em]">Pending Confirmation</span>
              </div>
              <p className="text-sm leading-6 text-primary-foreground/85">
                Khi chưa có database, yêu cầu vẫn được lưu offline trên thiết bị để không mất dữ liệu của người dùng.
              </p>
            </div>
          </SectionCard>
        </div>
      }
    >
      <div className="space-y-6">
        <SectionCard
          title="Bước 1 — Thông tin bệnh nhân"
          description="Điền thông tin cơ bản để bác sĩ có thể nhận diện và phản hồi."
          badge={
            <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
              Step 1
            </span>
          }
        >
          <div className="space-y-4">
            <div className="space-y-1">
              <div className="text-sm font-medium">Họ tên</div>
              <Input value={patientName} onChange={(e) => setPatientName(e.target.value)} className="input-glow" />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <div className="text-sm font-medium">Số điện thoại</div>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Tùy chọn" className="input-glow" />
              </div>
              <div className="space-y-1">
                <div className="text-sm font-medium">Email</div>
                <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Tùy chọn" className="input-glow" />
              </div>
            </div>
          </div>
        </SectionCard>

        <SectionCard
          title="Bước 2 — Chọn thời gian"
          description="Chọn mốc thời gian bạn mong muốn để bác sĩ xem xét xác nhận."
          badge={
            <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
              Step 2
            </span>
          }
        >
          <div className="space-y-1">
            <div className="text-sm font-medium">Thời gian dự kiến</div>
            <Input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} className="input-glow" />
          </div>
        </SectionCard>

        <SectionCard
          title="Bước 3 — Lý do khám"
          description="Mô tả ngắn triệu chứng hoặc mục tiêu buổi khám để bác sĩ chuẩn bị trước."
          badge={
            <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
              Step 3
            </span>
          }
        >
          <div className="space-y-4">
            <div className="rounded-[1.2rem] bg-secondary/35 px-4 py-4">
              <div className="mb-2 flex items-center gap-2 text-muted-foreground">
                <FileText className="h-4 w-4" />
                <span className="text-[11px] font-semibold uppercase tracking-[0.18em]">Reason</span>
              </div>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={5}
                className="w-full resize-none rounded-xl border border-border bg-background px-3 py-3 text-sm"
                placeholder="Mô tả triệu chứng, bối cảnh, mong muốn hoặc các lưu ý quan trọng..."
              />
            </div>

            <div className="flex flex-wrap gap-3">
              <Button variant="outline" className="rounded-xl" onClick={() => (window.location.href = `/bac-si/${encodeURIComponent(doctorId)}`)}>
                Hủy
              </Button>
              <Button className="rounded-xl" disabled={!canSubmit || saving} onClick={() => void submit()}>
                {saving ? "Đang gửi..." : "Gửi yêu cầu"}
              </Button>
            </div>
          </div>
        </SectionCard>
      </div>
    </PortalShell>
  )
}
