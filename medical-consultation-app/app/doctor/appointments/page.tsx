"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import type { Appointment, AppointmentStatus } from "@/lib/appointments"
import { normalizeAppointment } from "@/lib/appointments"
import { useToast } from "@/hooks/use-toast"

const LOCAL_KEY = "mcs_appointments_local_v1"

function loadLocal(): Appointment[] {
  try {
    const raw = localStorage.getItem(LOCAL_KEY)
    if (!raw) return []
    const arr = JSON.parse(raw)
    if (!Array.isArray(arr)) return []
    return arr.map(normalizeAppointment).filter(Boolean) as any
  } catch {
    return []
  }
}

export default function DoctorAppointmentsPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [mounted, setMounted] = useState(false)
  const [dbDisabled, setDbDisabled] = useState(false)
  const [items, setItems] = useState<Appointment[]>([])

  const token = useMemo(() => (typeof window !== "undefined" ? localStorage.getItem("authToken") : null), [])

  useEffect(() => {
    setMounted(true)
    const t = typeof window !== "undefined" ? localStorage.getItem("authToken") : null
    const role = typeof window !== "undefined" ? localStorage.getItem("userRole") : null
    if (!t || role !== "doctor") {
      router.replace("/login")
      return
    }
  }, [router])

  const refresh = async () => {
    setDbDisabled(false)
    try {
      const t = typeof window !== "undefined" ? localStorage.getItem("authToken") : null
      if (!t) return
      const resp = await fetch("/api/appointments", { headers: { Authorization: `Bearer ${t}` } })
      if (resp.status === 503) {
        setDbDisabled(true)
        setItems(loadLocal())
        return
      }
      if (!resp.ok) throw new Error(await resp.text())
      const j: any = await resp.json()
      const next = Array.isArray(j?.items) ? (j.items as any[]) : []
      setItems(next.map(normalizeAppointment).filter(Boolean) as any)
    } catch {
      setItems(loadLocal())
    }
  }

  useEffect(() => {
    if (!mounted) return
    void refresh()
  }, [mounted])

  const updateStatus = async (id: string, status: AppointmentStatus) => {
    try {
      const t = typeof window !== "undefined" ? localStorage.getItem("authToken") : null
      if (!t) return
      const resp = await fetch("/api/appointments", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${t}` },
        body: JSON.stringify({ id, status }),
      })
      if (resp.status === 503) {
        toast({ title: "Chưa cấu hình database", description: "Không thể cập nhật trạng thái trên server." })
        return
      }
      if (!resp.ok) throw new Error(await resp.text())
      toast({ title: "Đã cập nhật", description: `Trạng thái: ${status}` })
      void refresh()
    } catch {
      toast({ title: "Không cập nhật được", description: "Vui lòng thử lại." })
    }
  }

  if (!mounted) return null

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="space-y-1">
          <div className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-slate-50">Lịch hẹn</div>
          <div className="text-sm text-slate-600 dark:text-slate-400">Xem và xác nhận lịch hẹn của bạn</div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => void refresh()}>
            Làm mới
          </Button>
        </div>
      </div>

      {dbDisabled ? (
        <div className="rounded-xl border bg-background p-4 text-sm">
          Chưa cấu hình database nên chỉ xem được lịch hẹn lưu cục bộ trên thiết bị này.
        </div>
      ) : null}

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm">
        <div className="p-6 border-b border-slate-200 dark:border-slate-700">
          <div className="text-lg font-bold text-slate-900 dark:text-slate-50">Yêu cầu đặt hẹn</div>
        </div>
        <div className="divide-y divide-slate-200 dark:divide-slate-700">
          {items.length ? (
            items.map((ap) => (
              <div key={ap.id} className="p-6 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div className="min-w-0">
                  <div className="font-semibold text-slate-900 dark:text-slate-50 truncate">{ap.patient_name}</div>
                  <div className="text-sm text-slate-600 dark:text-slate-400">
                    {new Date(ap.scheduled_at).toLocaleString("vi-VN")} • {ap.status}
                  </div>
                  <div className="text-sm text-slate-700 dark:text-slate-300 mt-2 whitespace-pre-wrap">{ap.reason}</div>
                  {(ap.contact?.phone || ap.contact?.email) ? (
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                      {ap.contact?.phone ? `☎ ${ap.contact.phone}` : ""}
                      {ap.contact?.phone && ap.contact?.email ? " • " : ""}
                      {ap.contact?.email ? `✉ ${ap.contact.email}` : ""}
                    </div>
                  ) : null}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" onClick={() => updateStatus(ap.id, "confirmed")}>
                    Xác nhận
                  </Button>
                  <Button variant="outline" onClick={() => updateStatus(ap.id, "completed")}>
                    Hoàn tất
                  </Button>
                  <Button variant="outline" onClick={() => updateStatus(ap.id, "cancelled")}>
                    Hủy
                  </Button>
                </div>
              </div>
            ))
          ) : (
            <div className="p-6 text-sm text-slate-600 dark:text-slate-400">Chưa có lịch hẹn.</div>
          )}
        </div>
      </div>
    </div>
  )
}

