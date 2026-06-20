"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { CalendarDays, CheckCircle2, Clock3, RefreshCcw, ShieldCheck, UserRound, XCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { Appointment, AppointmentStatus } from "@/lib/appointments"
import { normalizeAppointment } from "@/lib/appointments"
import { useToast } from "@/hooks/use-toast"
import PortalShell from "@/components/portal-shell"
import { SectionCard } from "@/components/ui/section-card"
import { StatCard } from "@/components/ui/stat-card"

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

  const stats = useMemo(() => {
    const pending = items.filter((item) => item.status === "pending").length
    const confirmed = items.filter((item) => item.status === "confirmed").length
    const completed = items.filter((item) => item.status === "completed").length
    return { pending, confirmed, completed }
  }, [items])

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
    <PortalShell
      eyebrow="Doctor Appointments"
      title="Lịch hẹn"
      description="Xem, xác nhận và hoàn tất các yêu cầu đặt lịch đến từ luồng public booking."
      actions={
        <Button variant="outline" className="rounded-xl" onClick={() => void refresh()}>
          <RefreshCcw className="mr-2 h-4 w-4" />
          Làm mới
        </Button>
      }
      aside={
        <div className="space-y-6">
          <SectionCard title="Trạng thái dữ liệu" description="Màn này ưu tiên dữ liệu server, fallback về local khi DB chưa sẵn sàng.">
            <div className="rounded-[1.2rem] bg-primary px-5 py-5 text-primary-foreground">
              <div className="mb-2 flex items-center gap-2 text-primary-foreground/90">
                <ShieldCheck className="h-5 w-5" />
                <span className="text-sm font-semibold uppercase tracking-[0.18em]">Doctor Inbox</span>
              </div>
              <p className="text-sm leading-6 text-primary-foreground/85">
                {dbDisabled
                  ? "Hiện đang ở chế độ offline, chỉ xem được dữ liệu cục bộ trên thiết bị này."
                  : "Đang dùng dữ liệu thật từ API appointments kèm quyền sở hữu bác sĩ."}
              </p>
            </div>
          </SectionCard>
        </div>
      }
    >
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          label="Chờ xác nhận"
          value={stats.pending}
          helper="Booking mới từ patient flow"
          icon={<Clock3 size={20} />}
          tone="primary"
        />
        <StatCard
          label="Đã xác nhận"
          value={stats.confirmed}
          helper="Lịch đang active"
          icon={<CheckCircle2 size={20} />}
          tone="teal"
        />
        <StatCard
          label="Hoàn tất"
          value={stats.completed}
          helper="Lịch đã xử lý"
          icon={<CalendarDays size={20} />}
          tone="neutral"
        />
      </div>

      {dbDisabled ? (
        <div className="rounded-xl border bg-background p-4 text-sm">
          Chưa cấu hình database nên chỉ xem được lịch hẹn lưu cục bộ trên thiết bị này.
        </div>
      ) : null}

      <SectionCard
        title="Yêu cầu đặt hẹn"
        description="Danh sách booking được gửi từ luồng công khai `/bac-si/[doctorId]/hen`."
        badge={
          <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
            {items.length} items
          </span>
        }
        contentClassName="space-y-4"
      >
        {items.length ? (
          items.map((ap) => (
            <div key={ap.id} className="app-surface rounded-[1.4rem] bg-card/90 p-5">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                      <UserRound className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-lg font-semibold tracking-tight text-foreground">{ap.patient_name}</div>
                      <div className="text-sm text-muted-foreground">{new Date(ap.scheduled_at).toLocaleString("vi-VN")}</div>
                    </div>
                    <span className="rounded-full bg-secondary px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      {ap.status}
                    </span>
                  </div>

                  <p className="whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{ap.reason}</p>

                  {(ap.contact?.phone || ap.contact?.email) ? (
                    <div className="mt-4 flex flex-wrap gap-3 text-sm text-foreground">
                      {ap.contact?.phone ? <span className="rounded-full bg-secondary px-3 py-1">{ap.contact.phone}</span> : null}
                      {ap.contact?.email ? <span className="rounded-full bg-secondary px-3 py-1">{ap.contact.email}</span> : null}
                    </div>
                  ) : null}
                </div>

                <div className="flex flex-wrap gap-2 xl:max-w-[240px] xl:justify-end">
                  <Button variant="outline" className="rounded-xl" onClick={() => updateStatus(ap.id, "confirmed")}>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Xác nhận
                  </Button>
                  <Button variant="outline" className="rounded-xl" onClick={() => updateStatus(ap.id, "completed")}>
                    <CalendarDays className="mr-2 h-4 w-4" />
                    Hoàn tất
                  </Button>
                  <Button variant="outline" className="rounded-xl" onClick={() => updateStatus(ap.id, "cancelled")}>
                    <XCircle className="mr-2 h-4 w-4" />
                    Hủy
                  </Button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-sm text-muted-foreground">Chưa có lịch hẹn.</div>
        )}
      </SectionCard>
    </PortalShell>
  )
}

