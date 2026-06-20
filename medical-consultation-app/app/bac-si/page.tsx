"use client"

import { useEffect, useMemo, useState } from "react"
import { ArrowRight, Search, ShieldCheck, Stethoscope, UserRound } from "lucide-react"
import { Input } from "@/components/ui/input"
import PortalShell from "@/components/portal-shell"
import { SectionCard } from "@/components/ui/section-card"
import { StatCard } from "@/components/ui/stat-card"
import { Button } from "@/components/ui/button"
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

  const specialtyCount = useMemo(() => {
    const all = new Set<string>()
    items.forEach((item) => {
      ;(item.public?.specialties || []).forEach((spec) => {
        const value = String(spec || "").trim()
        if (value) all.add(value)
      })
    })
    return all
  }, [items])

  const featuredSpecialties = useMemo(() => Array.from(specialtyCount).slice(0, 8), [specialtyCount])

  return (
    <PortalShell
      eyebrow="Doctor Directory"
      title="Danh bạ bác sĩ"
      description="Khám phá hồ sơ bác sĩ, chuyên khoa và khả năng tư vấn trước khi đặt lịch hẹn. Flow này giữ nguyên data thật từ API hồ sơ công khai."
      actions={
        <div className="relative w-full min-w-[260px] max-w-[320px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Tìm theo tên, chuyên khoa, mã..."
            className="input-glow rounded-full border-border/70 bg-card pl-10"
          />
        </div>
      }
      aside={
        <div className="space-y-6">
          <SectionCard
            title="Lọc nhanh"
            description="Rút gọn danh sách theo chuyên khoa hoặc mã bác sĩ."
            contentClassName="space-y-4"
          >
            <div className="flex flex-wrap gap-2">
              {featuredSpecialties.length ? (
                featuredSpecialties.map((spec) => (
                  <button
                    key={spec}
                    type="button"
                    onClick={() => setQ(spec)}
                    className="rounded-full bg-secondary px-3 py-2 text-xs font-medium text-foreground transition hover:bg-primary hover:text-primary-foreground"
                  >
                    {spec}
                  </button>
                ))
              ) : (
                <div className="text-sm text-muted-foreground">Danh sách chuyên khoa sẽ hiện khi có dữ liệu hồ sơ công khai.</div>
              )}
            </div>
          </SectionCard>

          <SectionCard title="Nhập mã bác sĩ" description="Dùng khi bạn đã có sẵn mã hoặc liên kết từ bác sĩ.">
            <div className="space-y-3">
              <Input value={doctorId} onChange={(e) => setDoctorId(e.target.value)} placeholder="Ví dụ: user_id của bác sĩ" />
              <Button
                disabled={!canGo}
                className="w-full rounded-xl"
                onClick={() => {
                  const id = doctorId.trim()
                  if (!id) return
                  window.location.href = `/bac-si/${encodeURIComponent(id)}`
                }}
              >
                Xem hồ sơ
              </Button>
            </div>
          </SectionCard>
        </div>
      }
    >
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          label="Bác sĩ công khai"
          value={items.length}
          helper="Đồng bộ từ doctor-profile public"
          icon={<UserRound size={20} />}
          tone="primary"
        />
        <StatCard
          label="Chuyên khoa"
          value={specialtyCount.size}
          helper="Từ hồ sơ đã bật chia sẻ"
          icon={<Stethoscope size={20} />}
          tone="teal"
        />
        <StatCard
          label="Đặt hẹn"
          value="End-to-end"
          helper="Nối trực tiếp sang booking flow"
          icon={<ShieldCheck size={20} />}
          tone="neutral"
        />
      </div>

      <SectionCard
        title="Danh sách chuyên gia"
        description="Chọn hồ sơ để xem thông tin chi tiết hoặc đi thẳng tới bước đặt lịch."
        badge={
          <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
            {loading ? "Loading" : `${filtered.length} matches`}
          </span>
        }
        contentClassName="space-y-4"
      >
        {loading ? <div className="text-sm text-muted-foreground">Đang tải danh sách bác sĩ...</div> : null}
        {!loading && !filtered.length ? <div className="text-sm text-muted-foreground">Chưa có bác sĩ nào phù hợp với bộ lọc hiện tại.</div> : null}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {filtered.map((d) => (
            <div key={d.doctor_id} className="app-surface hover-lift rounded-[1.5rem] bg-card/90 p-5">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-4">
                  <div className="h-16 w-16 overflow-hidden rounded-2xl bg-secondary">
                    {d.public.avatarUrl ? (
                      <img src={d.public.avatarUrl} alt={d.public.displayName || "Bác sĩ"} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-primary">
                        <UserRound className="h-7 w-7" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-lg font-semibold tracking-tight text-foreground">{d.public.displayName || "Bác sĩ"}</div>
                    <div className="mt-1 text-sm text-primary">{d.public.title || "Bác sĩ"}</div>
                    <div className="mt-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">{d.doctor_id}</div>
                  </div>
                </div>
                <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
                  Public
                </span>
              </div>

              <p className="line-clamp-3 text-sm leading-6 text-muted-foreground">
                {d.public.bio || "Hồ sơ bác sĩ đang ở chế độ công khai. Bạn có thể xem chi tiết hoặc chuyển thẳng sang bước đặt hẹn."}
              </p>

              {d.public.specialties?.length ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  {d.public.specialties.slice(0, 6).map((s) => (
                    <span key={s} className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-foreground">
                      {s}
                    </span>
                  ))}
                </div>
              ) : null}

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl bg-secondary/55 px-3 py-3">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Phòng khám</div>
                  <div className="mt-1 text-sm font-medium text-foreground">{d.public.clinicName || "Đang cập nhật"}</div>
                </div>
                <div className="rounded-xl bg-secondary/55 px-3 py-3">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Hình thức</div>
                  <div className="mt-1 text-sm font-medium text-foreground">
                    {d.public.consultationModes?.length ? d.public.consultationModes.join(", ") : "Online"}
                  </div>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap gap-3">
                <Button variant="outline" className="rounded-xl" onClick={() => (window.location.href = `/bac-si/${encodeURIComponent(d.doctor_id)}`)}>
                  Hồ sơ
                </Button>
                <Button className="rounded-xl" onClick={() => (window.location.href = `/bac-si/${encodeURIComponent(d.doctor_id)}/hen`)}>
                  Đặt hẹn
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </SectionCard>
    </PortalShell>
  )
}
