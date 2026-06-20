"use client"

import { useEffect, useMemo, useState } from "react"
import { useParams } from "next/navigation"
import { ArrowLeft, Building2, CalendarDays, Globe2, Languages, ShieldCheck, Stethoscope, UserRound } from "lucide-react"
import { Button } from "@/components/ui/button"
import PortalShell from "@/components/portal-shell"
import { SectionCard } from "@/components/ui/section-card"
import { StatCard } from "@/components/ui/stat-card"
import type { DoctorProfilePublic } from "@/lib/doctor-profile"
import { defaultPublicProfile } from "@/lib/doctor-profile"
import { loadLocalDoctorPublic } from "@/lib/doctor-profile-store"

export default function DoctorPublicProfilePage() {
  const params = useParams()
  const doctorId = useMemo(() => {
    const raw = Array.isArray((params as any)?.doctorId) ? (params as any).doctorId[0] : (params as any)?.doctorId
    return String(raw || "").trim()
  }, [params])

  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [dbDisabled, setDbDisabled] = useState(false)
  const [profile, setProfile] = useState<DoctorProfilePublic>(defaultPublicProfile())
  const specs = Array.isArray(profile?.specialties) ? profile.specialties : []
  const langs = Array.isArray(profile?.languages) ? profile.languages : []
  const modes = Array.isArray(profile?.consultationModes) ? profile.consultationModes : []

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setNotFound(false)
      setDbDisabled(false)
      try {
        const resp = await fetch(`/api/doctor-profile/public/${encodeURIComponent(doctorId)}`)
        if (resp.status === 503) {
          setDbDisabled(true)
          throw new Error("db_disabled")
        }
        if (resp.status === 404) {
          setNotFound(true)
          throw new Error("not_found")
        }
        if (!resp.ok) throw new Error(await resp.text())
        const j: any = await resp.json()
        const p = (j?.public || {}) as DoctorProfilePublic
        if (!cancelled) setProfile({ ...defaultPublicProfile(), ...p })
      } catch {
        try {
          const role = typeof window !== "undefined" ? localStorage.getItem("userRole") : null
          const uid = typeof window !== "undefined" ? localStorage.getItem("userId") : null
          if (role === "doctor" && uid && uid === doctorId) {
            const seedName = (typeof window !== "undefined" ? localStorage.getItem("userFullName") : "") || ""
            const lp = loadLocalDoctorPublic({ displayName: seedName })
            if (!cancelled) setProfile(lp)
            if (!cancelled) setNotFound(false)
          }
        } catch {}
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [doctorId])

  return (
    <PortalShell
      eyebrow="Doctor Profile"
      title={profile.displayName || "Hồ sơ bác sĩ"}
      description={profile.title || "Hồ sơ công khai của bác sĩ, đồng bộ từ doctor profile và dùng cho flow đặt hẹn công khai."}
      actions={
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="outline" className="rounded-xl" onClick={() => window.location.href = "/bac-si"}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Danh sách
          </Button>
          <Button className="rounded-xl" onClick={() => window.location.href = `/bac-si/${encodeURIComponent(doctorId)}/hen`}>
            <CalendarDays className="mr-2 h-4 w-4" />
            Đặt hẹn
          </Button>
        </div>
      }
      aside={
        <div className="space-y-6">
          <SectionCard title="Thông tin nhanh" description="Những điểm người dùng cần biết trước khi đặt lịch.">
            <div className="space-y-3">
              <div className="rounded-xl bg-secondary/55 px-4 py-3">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Phòng khám</div>
                <div className="mt-1 text-sm font-medium text-foreground">{profile.clinicName || "Đang cập nhật"}</div>
              </div>
              <div className="rounded-xl bg-secondary/55 px-4 py-3">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Địa chỉ</div>
                <div className="mt-1 text-sm font-medium text-foreground">{profile.clinicAddress || "Đang cập nhật"}</div>
              </div>
              <div className="rounded-xl bg-secondary/55 px-4 py-3">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Hình thức tư vấn</div>
                <div className="mt-1 text-sm font-medium text-foreground">{modes.length ? modes.join(", ") : "Online"}</div>
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Chia sẻ công khai" description="Trạng thái hồ sơ public hiện đang được hiển thị cho người dùng cuối.">
            <div className="rounded-[1.2rem] bg-primary px-5 py-5 text-primary-foreground">
              <div className="mb-2 flex items-center gap-2 text-primary-foreground/90">
                <ShieldCheck className="h-5 w-5" />
                <span className="text-sm font-semibold uppercase tracking-[0.18em]">Public Profile</span>
              </div>
              <p className="text-sm leading-6 text-primary-foreground/85">
                Thông tin trên màn này dùng trực tiếp cho luồng khám phá bác sĩ và chuyển tiếp sang bước đặt hẹn.
              </p>
            </div>
          </SectionCard>
        </div>
      }
    >
      {loading ? <div className="rounded-xl border bg-background p-4 text-sm text-muted-foreground">Đang tải hồ sơ bác sĩ...</div> : null}
      {!loading && dbDisabled ? (
        <div className="rounded-xl border bg-background p-4 text-sm">
          Hồ sơ public cần cấu hình database để chia sẻ cho người dùng. Hiện đang ở chế độ offline.
        </div>
      ) : null}
      {!loading && notFound ? (
        <div className="rounded-xl border bg-background p-4 text-sm">Chưa có hồ sơ public cho bác sĩ này.</div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          label="Chuyên khoa"
          value={specs.length || "—"}
          helper={specs.length ? specs[0] : "Đang cập nhật"}
          icon={<Stethoscope size={20} />}
          tone="primary"
        />
        <StatCard
          label="Ngôn ngữ"
          value={langs.length || "1"}
          helper={langs.length ? langs.join(", ") : "Tiếng Việt"}
          icon={<Languages size={20} />}
          tone="teal"
        />
        <StatCard
          label="Tư vấn"
          value={modes.length || "1"}
          helper={modes.length ? modes.join(", ") : "Online"}
          icon={<Globe2 size={20} />}
          tone="neutral"
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        <SectionCard className="overflow-hidden" contentClassName="p-0">
          <div className="relative aspect-[4/5] overflow-hidden bg-secondary">
            {profile.avatarUrl ? (
              <img src={profile.avatarUrl} alt={profile.displayName || "Bác sĩ"} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-primary">
                <UserRound className="h-24 w-24" />
              </div>
            )}
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-primary/70 via-primary/10 to-transparent p-5 text-white">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/80">Primary clinic</div>
              <div className="mt-1 text-lg font-semibold">{profile.clinicName || "Doctor Profile"}</div>
            </div>
          </div>
        </SectionCard>

        <div className="space-y-6">
          <SectionCard
            title="Giới thiệu"
            description="Thông tin nổi bật từ hồ sơ public của bác sĩ."
            badge={
              <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
                Public
              </span>
            }
          >
            <div className="space-y-4">
              <div>
                <div className="text-3xl font-semibold tracking-tight text-foreground">{profile.displayName || "Bác sĩ"}</div>
                <div className="mt-2 text-lg text-primary">{profile.title || "Bác sĩ"}</div>
              </div>
              <p className="text-sm leading-7 text-muted-foreground">
                {profile.bio || "Hồ sơ bác sĩ đang được công khai để người dùng dễ dàng xem thông tin trước khi đặt hẹn."}
              </p>
              {specs.length ? (
                <div className="flex flex-wrap gap-2">
                  {specs.map((spec) => (
                    <span key={spec} className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-foreground">
                      {spec}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
          </SectionCard>

          <SectionCard title="Thông tin hành nghề" description="Các dữ liệu này được lấy từ profile công khai và có thể dùng để định hướng người bệnh.">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-[1.2rem] bg-secondary/55 px-4 py-4">
                <div className="mb-2 flex items-center gap-2 text-muted-foreground">
                  <Building2 className="h-4 w-4" />
                  <span className="text-[11px] font-semibold uppercase tracking-[0.18em]">Phòng khám</span>
                </div>
                <div className="text-sm font-medium text-foreground">{profile.clinicName || "Đang cập nhật"}</div>
                {profile.clinicAddress ? <div className="mt-2 text-sm text-muted-foreground">{profile.clinicAddress}</div> : null}
              </div>
              <div className="rounded-[1.2rem] bg-secondary/55 px-4 py-4">
                <div className="mb-2 flex items-center gap-2 text-muted-foreground">
                  <Languages className="h-4 w-4" />
                  <span className="text-[11px] font-semibold uppercase tracking-[0.18em]">Ngôn ngữ & tư vấn</span>
                </div>
                <div className="text-sm font-medium text-foreground">{langs.length ? langs.join(", ") : "Tiếng Việt"}</div>
                <div className="mt-2 text-sm text-muted-foreground">{modes.length ? modes.join(", ") : "Online"}</div>
              </div>
            </div>
          </SectionCard>
        </div>
      </div>
    </PortalShell>
  )
}
