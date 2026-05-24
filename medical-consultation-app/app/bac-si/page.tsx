"use client"

import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { DoctorProfilePublic } from "@/lib/doctor-profile"

export default function DoctorDirectoryPage() {
  const [doctorId, setDoctorId] = useState("")
  const [items, setItems] = useState<Array<{ doctor_id: string; public: DoctorProfilePublic }>>([])
  const [q, setQ] = useState("")
  const [loading, setLoading] = useState(true)
  const canGo = useMemo(() => doctorId.trim().length > 0, [doctorId])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      try {
        const resp = await fetch("/api/doctor-profile/list")
        const j: any = await resp.json().catch(() => null)
        const next = Array.isArray(j?.items) ? (j.items as any[]) : []
        const mapped = next
          .map((x: any) => ({ doctor_id: String(x?.doctor_id || "").trim(), public: x?.public || null }))
          .filter((x: any) => x.doctor_id && x.public)
        if (!cancelled) setItems(mapped as any)
      } catch {
        if (!cancelled) setItems([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const filtered = useMemo(() => {
    const needle = String(q || "").trim().toLowerCase()
    if (!needle) return items
    return items.filter((x) => {
      const name = String(x.public?.displayName || "").toLowerCase()
      const title = String(x.public?.title || "").toLowerCase()
      const specs = Array.isArray(x.public?.specialties) ? x.public.specialties.join(" ").toLowerCase() : ""
      return name.includes(needle) || title.includes(needle) || specs.includes(needle) || x.doctor_id.toLowerCase().includes(needle)
    })
  }, [items, q])

  return (
    <div className="max-w-3xl mx-auto p-4 md:p-8 space-y-6">
      <div className="space-y-2">
        <div className="text-2xl font-semibold">Giới thiệu bác sĩ</div>
        <div className="text-sm text-muted-foreground">
          Nhập mã bác sĩ để xem hồ sơ public. Bác sĩ có thể chỉnh sửa hồ sơ trong tài khoản của mình.
        </div>
      </div>

      <div className="rounded-2xl border bg-background p-4 space-y-3">
        <div className="text-sm font-semibold">Danh sách</div>
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tìm theo tên/chuyên khoa/mã..." />
        {loading ? <div className="text-sm text-muted-foreground">Đang tải...</div> : null}
        {!loading && !filtered.length ? <div className="text-sm text-muted-foreground">Chưa có bác sĩ nào.</div> : null}
        <div className="grid grid-cols-1 gap-3">
          {filtered.map((d) => (
            <div key={d.doctor_id} className="rounded-xl border bg-background p-4 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="font-semibold truncate">{d.public.displayName || "Bác sĩ"}</div>
                <div className="text-xs text-muted-foreground">{d.public.title || "Bác sĩ"}</div>
                {d.public.specialties?.length ? (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {d.public.specialties.slice(0, 6).map((s) => (
                      <span key={s} className="px-2 py-0.5 rounded-full bg-secondary text-[11px] text-foreground">
                        {s}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button variant="outline" onClick={() => (window.location.href = `/bac-si/${encodeURIComponent(d.doctor_id)}`)}>
                  Hồ sơ
                </Button>
                <Button onClick={() => (window.location.href = `/bac-si/${encodeURIComponent(d.doctor_id)}/hen`)}>Đặt hẹn</Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border bg-background p-4 flex flex-col sm:flex-row gap-2">
        <Input value={doctorId} onChange={(e) => setDoctorId(e.target.value)} placeholder="Ví dụ: user_id của bác sĩ" />
        <Button
          disabled={!canGo}
          onClick={() => {
            const id = doctorId.trim()
            if (!id) return
            window.location.href = `/bac-si/${encodeURIComponent(id)}`
          }}
        >
          Xem hồ sơ
        </Button>
      </div>
    </div>
  )
}

