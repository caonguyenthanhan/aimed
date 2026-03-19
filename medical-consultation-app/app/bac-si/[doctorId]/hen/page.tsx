"use client"

import { useEffect, useMemo, useState } from "react"
import { useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { Appointment } from "@/lib/appointments"
import { newAppointmentId } from "@/lib/appointments"
import { useToast } from "@/hooks/use-toast"

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
      const resp = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
    <div className="max-w-3xl mx-auto p-4 md:p-8 space-y-6">
      <div className="space-y-2">
        <div className="text-2xl font-semibold">Đặt hẹn bác sĩ</div>
        <div className="text-sm text-muted-foreground">Yêu cầu hẹn sẽ ở trạng thái chờ xác nhận.</div>
      </div>

      <div className="rounded-2xl border bg-white shadow-sm p-4 md:p-6 space-y-4">
        <div className="space-y-1">
          <div className="text-sm font-medium">Họ tên</div>
          <Input value={patientName} onChange={(e) => setPatientName(e.target.value)} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <div className="text-sm font-medium">Số điện thoại</div>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Tùy chọn" />
          </div>
          <div className="space-y-1">
            <div className="text-sm font-medium">Email</div>
            <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Tùy chọn" />
          </div>
        </div>

        <div className="space-y-1">
          <div className="text-sm font-medium">Thời gian dự kiến</div>
          <Input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} />
        </div>

        <div className="space-y-1">
          <div className="text-sm font-medium">Lý do / mô tả ngắn</div>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={5}
            className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm resize-none"
          />
        </div>

        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={() => (window.location.href = `/bac-si/${encodeURIComponent(doctorId)}`)}>
            Hủy
          </Button>
          <Button disabled={!canSubmit || saving} onClick={() => void submit()}>
            {saving ? "Đang gửi..." : "Gửi yêu cầu"}
          </Button>
        </div>
      </div>
    </div>
  )
}

