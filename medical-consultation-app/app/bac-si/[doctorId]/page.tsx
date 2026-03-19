"use client"

import { useEffect, useMemo, useState } from "react"
import { useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { DoctorProfileView } from "@/components/doctor-profile-view"
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
    <div className="max-w-5xl mx-auto p-4 md:p-8 space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="text-sm text-muted-foreground">Hồ sơ public</div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => window.location.href = "/bac-si"}>
            Danh sách
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="rounded-xl border bg-background p-4 text-sm text-muted-foreground">Đang tải...</div>
      ) : null}
      {!loading && dbDisabled ? (
        <div className="rounded-xl border bg-background p-4 text-sm">
          Hồ sơ public cần cấu hình database để chia sẻ cho người dùng. Hiện đang ở chế độ offline.
        </div>
      ) : null}
      {!loading && notFound ? (
        <div className="rounded-xl border bg-background p-4 text-sm">Chưa có hồ sơ public cho bác sĩ này.</div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button onClick={() => window.location.href = `/bac-si/${encodeURIComponent(doctorId)}/hen`}>
          Đặt hẹn
        </Button>
      </div>

      <DoctorProfileView profile={profile} />
    </div>
  )
}
