"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DoctorProfileView } from "@/components/doctor-profile-view"
import type { DoctorProfilePrivate, DoctorProfilePublic } from "@/lib/doctor-profile"
import { defaultPublicProfile } from "@/lib/doctor-profile"
import { loadLocalDoctorPrivate, loadLocalDoctorPublic, saveLocalDoctorProfile } from "@/lib/doctor-profile-store"
import { useToast } from "@/hooks/use-toast"

const parseCsv = (s: string) =>
  String(s || "")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean)
    .slice(0, 20)

export default function DoctorProfileManagePage() {
  const router = useRouter()
  const { toast } = useToast()
  const [mounted, setMounted] = useState(false)
  const [loading, setLoading] = useState(true)
  const [doctorId, setDoctorId] = useState<string>("")
  const [publicProfile, setPublicProfile] = useState<DoctorProfilePublic>(defaultPublicProfile())
  const [privateProfile, setPrivateProfile] = useState<DoctorProfilePrivate>({})
  const [activeTab, setActiveTab] = useState<"public" | "private" | "preview">("public")

  const shareUrl = useMemo(() => (doctorId ? `/bac-si/${encodeURIComponent(doctorId)}` : ""), [doctorId])

  useEffect(() => {
    setMounted(true)
    const token = typeof window !== "undefined" ? localStorage.getItem("authToken") : null
    const role = typeof window !== "undefined" ? localStorage.getItem("userRole") : null
    if (!token || role !== "doctor") {
      router.replace("/login")
      return
    }
    setDoctorId((typeof window !== "undefined" ? localStorage.getItem("userId") : "") || "")
  }, [router])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      if (!mounted) return
      const token = typeof window !== "undefined" ? localStorage.getItem("authToken") : null
      const seedName =
        (typeof window !== "undefined" ? localStorage.getItem("userFullName") : "") ||
        (typeof window !== "undefined" ? localStorage.getItem("username") : "") ||
        ""
      setLoading(true)
      try {
        if (!token) throw new Error("no_token")
        const resp = await fetch("/api/doctor-profile/me", { headers: { Authorization: `Bearer ${token}` } })
        if (resp.status === 503) throw new Error("db_disabled")
        if (!resp.ok) throw new Error(await resp.text())
        const j: any = await resp.json()
        const id = String(j?.doctor_id || "").trim()
        const pub = (j?.public || {}) as any
        const priv = (j?.private || {}) as any
        if (!cancelled) {
          setDoctorId(id || (typeof window !== "undefined" ? localStorage.getItem("userId") : "") || "")
          setPublicProfile({ ...defaultPublicProfile({ displayName: seedName }), ...pub })
          setPrivateProfile({ ...(priv || {}) })
          saveLocalDoctorProfile({ ...defaultPublicProfile({ displayName: seedName }), ...pub }, { ...(priv || {}) })
        }
      } catch {
        if (!cancelled) {
          setPublicProfile(loadLocalDoctorPublic({ displayName: seedName }))
          setPrivateProfile(loadLocalDoctorPrivate())
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [mounted])

  if (!mounted) return null

  const save = async () => {
    const token = typeof window !== "undefined" ? localStorage.getItem("authToken") : null
    const pub = {
      ...publicProfile,
      specialties: Array.isArray(publicProfile.specialties) ? publicProfile.specialties : [],
      languages: Array.isArray(publicProfile.languages) ? publicProfile.languages : [],
      consultationModes: Array.isArray(publicProfile.consultationModes) ? publicProfile.consultationModes : [],
    }
    const priv = { ...privateProfile }
    saveLocalDoctorProfile(pub, priv)
    try {
      if (!token) throw new Error("no_token")
      const resp = await fetch("/api/doctor-profile/me", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ public: pub, private: priv }),
      })
      if (resp.status === 503) {
        toast({ title: "Đã lưu (offline)", description: "Chưa cấu hình database nên hồ sơ public chưa chia sẻ được." })
        return
      }
      if (!resp.ok) throw new Error(await resp.text())
      const j: any = await resp.json()
      const id = String(j?.doctor_id || "").trim()
      setDoctorId(id || doctorId)
      toast({ title: "Đã lưu", description: "Hồ sơ bác sĩ đã được cập nhật." })
    } catch {
      toast({ title: "Đã lưu (offline)", description: "Hồ sơ đã lưu trên thiết bị này." })
    }
  }

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-8 space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="space-y-1">
          <div className="text-2xl font-semibold">Hồ sơ bác sĩ</div>
          <div className="text-sm text-muted-foreground">Public: người dùng thấy • Private: chỉ bác sĩ thấy</div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button
            variant="outline"
            onClick={() => {
              if (!shareUrl) return
              window.open(shareUrl, "_blank", "noopener,noreferrer")
            }}
            disabled={!shareUrl}
          >
            Xem public
          </Button>
          <Button onClick={() => void save()} disabled={loading}>
            Lưu
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setActiveTab("public")}
          className={`h-9 px-4 rounded-xl text-sm border ${activeTab === "public" ? "bg-blue-600 text-white border-blue-600" : "bg-white border-slate-200"}`}
        >
          Public
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("private")}
          className={`h-9 px-4 rounded-xl text-sm border ${activeTab === "private" ? "bg-blue-600 text-white border-blue-600" : "bg-white border-slate-200"}`}
        >
          Private
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("preview")}
          className={`h-9 px-4 rounded-xl text-sm border ${activeTab === "preview" ? "bg-blue-600 text-white border-blue-600" : "bg-white border-slate-200"}`}
        >
          Preview
        </button>
      </div>

      {activeTab === "public" ? (
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Thông tin public</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <div className="text-sm font-medium">Tên hiển thị</div>
                <Input value={publicProfile.displayName} onChange={(e) => setPublicProfile((p) => ({ ...p, displayName: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <div className="text-sm font-medium">Chức danh</div>
                <Input value={publicProfile.title} onChange={(e) => setPublicProfile((p) => ({ ...p, title: e.target.value }))} />
              </div>
            </div>

            <div className="space-y-1">
              <div className="text-sm font-medium">Chuyên khoa (phân cách dấu phẩy)</div>
              <Input
                value={(publicProfile.specialties || []).join(", ")}
                onChange={(e) => setPublicProfile((p) => ({ ...p, specialties: parseCsv(e.target.value) }))}
              />
            </div>

            <div className="space-y-1">
              <div className="text-sm font-medium">Giới thiệu</div>
              <textarea
                value={publicProfile.bio}
                onChange={(e) => setPublicProfile((p) => ({ ...p, bio: e.target.value }))}
                rows={6}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm resize-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <div className="text-sm font-medium">Ảnh đại diện (URL)</div>
                <Input value={publicProfile.avatarUrl || ""} onChange={(e) => setPublicProfile((p) => ({ ...p, avatarUrl: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <div className="text-sm font-medium">Hình thức tư vấn (phân cách dấu phẩy)</div>
                <Input
                  value={(publicProfile.consultationModes || []).join(", ")}
                  onChange={(e) => setPublicProfile((p) => ({ ...p, consultationModes: parseCsv(e.target.value) }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <div className="text-sm font-medium">Ngôn ngữ (phân cách dấu phẩy)</div>
                <Input value={(publicProfile.languages || []).join(", ")} onChange={(e) => setPublicProfile((p) => ({ ...p, languages: parseCsv(e.target.value) }))} />
              </div>
              <div className="space-y-1">
                <div className="text-sm font-medium">Phòng khám / Nơi làm việc</div>
                <Input value={publicProfile.clinicName || ""} onChange={(e) => setPublicProfile((p) => ({ ...p, clinicName: e.target.value }))} />
              </div>
            </div>

            <div className="space-y-1">
              <div className="text-sm font-medium">Địa chỉ</div>
              <Input value={publicProfile.clinicAddress || ""} onChange={(e) => setPublicProfile((p) => ({ ...p, clinicAddress: e.target.value }))} />
            </div>

            {doctorId ? (
              <div className="rounded-xl border bg-background p-3 text-sm">
                Link public: <span className="font-medium">{shareUrl}</span>
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {activeTab === "private" ? (
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Thông tin private</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <div className="text-sm font-medium">Số điện thoại</div>
                <Input value={privateProfile.phone || ""} onChange={(e) => setPrivateProfile((p) => ({ ...p, phone: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <div className="text-sm font-medium">Email</div>
                <Input value={privateProfile.email || ""} onChange={(e) => setPrivateProfile((p) => ({ ...p, email: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-sm font-medium">Địa chỉ riêng</div>
              <Input value={privateProfile.address || ""} onChange={(e) => setPrivateProfile((p) => ({ ...p, address: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <div className="text-sm font-medium">Ghi chú nội bộ</div>
              <textarea
                value={privateProfile.notes || ""}
                onChange={(e) => setPrivateProfile((p) => ({ ...p, notes: e.target.value }))}
                rows={6}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm resize-none"
              />
            </div>

            <div className="space-y-1">
              <div className="text-sm font-medium">Prompt cá nhân hóa trợ lý AI</div>
              <textarea
                value={privateProfile.assistantPrompt || ""}
                onChange={(e) => setPrivateProfile((p) => ({ ...p, assistantPrompt: e.target.value }))}
                rows={8}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm resize-none"
              />
            </div>
          </CardContent>
        </Card>
      ) : null}

      {activeTab === "preview" ? (
        <div className="space-y-3">
          <div className="text-sm text-muted-foreground">Preview hồ sơ public (giống người dùng nhìn thấy)</div>
          <DoctorProfileView profile={publicProfile} />
        </div>
      ) : null}
    </div>
  )
}
