"use client"

import { useEffect, useMemo, useState } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { ArrowLeft, Calendar, FileText, Mail, MessageSquare, Phone, ShieldCheck, User } from "lucide-react"
import { getDemoPatient } from "@/lib/doctor-demo"
import PortalShell from "@/components/portal-shell"
import { SectionCard } from "@/components/ui/section-card"
import { StatCard } from "@/components/ui/stat-card"
import { Button } from "@/components/ui/button"

export default function DoctorPatientDetailPage() {
  const router = useRouter()
  const params = useParams()
  const search = useSearchParams()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const token = typeof window !== "undefined" ? localStorage.getItem("authToken") : null
    const role = typeof window !== "undefined" ? localStorage.getItem("userRole") : null
    if (!token || role !== "doctor") {
      router.replace("/login")
      return
    }
  }, [router])

  const patientId = useMemo(() => {
    const raw = Array.isArray((params as any)?.id) ? (params as any).id[0] : (params as any)?.id
    const n = Number(raw)
    return Number.isFinite(n) ? n : null
  }, [params])

  const patient = useMemo(() => {
    if (!patientId) return null
    return getDemoPatient(patientId)
  }, [patientId])

  const conversationId = useMemo(() => {
    const cid = (search?.get("conv") || "").trim()
    if (cid) return cid
    return patientId ? `demo-consult-${patientId}` : "demo-consult"
  }, [search, patientId])

  if (!mounted) return null

  if (!patient) {
    return (
      <PortalShell
        eyebrow="Patient Detail"
        title="Không tìm thấy bệnh nhân"
        description="Hồ sơ demo này không tồn tại hoặc id trên route không hợp lệ."
        actions={
          <Button variant="outline" className="rounded-xl" onClick={() => router.push("/doctor/patients")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Quay lại danh sách
          </Button>
        }
      >
        <SectionCard title="Not Found" description="Hãy quay lại directory để chọn một hồ sơ hợp lệ.">
          <div className="text-sm text-muted-foreground">Không tìm thấy bệnh nhân</div>
        </SectionCard>
      </PortalShell>
    )
  }

  return (
    <PortalShell
      eyebrow="Patient Detail"
      title={patient.name}
      description="Hồ sơ bệnh nhân trong doctor portal. Màn này vẫn dùng data demo và route detail cũ, chỉ được nâng lên shell thống nhất."
      actions={
        <div className="flex flex-wrap gap-3">
          <Button className="rounded-xl" onClick={() => router.push(`/tu-van?id=${encodeURIComponent(conversationId)}`)}>
            <MessageSquare className="mr-2 h-4 w-4" />
            Mở tư vấn
          </Button>
          <Button variant="outline" className="rounded-xl" onClick={() => router.push(`/doctor/reports/new?patientId=${patient.id}`)}>
            <FileText className="mr-2 h-4 w-4" />
            Tạo báo cáo
          </Button>
        </div>
      }
      aside={
        <div className="space-y-6">
          <SectionCard title="Liên hệ" description="Thông tin cơ bản dùng cho follow-up.">
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-2 text-foreground">
                <Phone className="h-4 w-4 text-muted-foreground" />
                {patient.phone}
              </div>
              <div className="flex items-center gap-2 text-foreground">
                <Mail className="h-4 w-4 text-muted-foreground" />
                {patient.email}
              </div>
              <div className="flex items-center gap-2 text-foreground">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                Lần cuối: {new Date(patient.lastVisit).toLocaleDateString("vi-VN")}
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Data State" description="Luồng này hiện dùng dữ liệu demo để cố định trải nghiệm doctor portal.">
            <div className="rounded-[1.2rem] bg-primary px-5 py-5 text-primary-foreground">
              <div className="mb-2 flex items-center gap-2 text-primary-foreground/90">
                <ShieldCheck className="h-5 w-5" />
                <span className="text-sm font-semibold uppercase tracking-[0.18em]">Demo-backed</span>
              </div>
              <p className="text-sm leading-6 text-primary-foreground/85">
                Route này giữ nguyên `getDemoPatient()` và chỉ thay đổi phần hiển thị để đồng bộ với shell doctor mới.
              </p>
            </div>
          </SectionCard>

          <SectionCard title="Thao tác" description="Các điều hướng nhanh liên quan tới hồ sơ này.">
            <div className="grid gap-3">
              <Button variant="outline" className="justify-start rounded-xl" onClick={() => router.push("/doctor/patients")}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Quay lại danh sách
              </Button>
            </div>
          </SectionCard>
        </div>
      }
    >
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard label="Tuổi" value={patient.age} helper="Patient age" icon={<User className="h-5 w-5" />} tone="primary" />
        <StatCard label="Tình trạng" value={patient.status} helper="Trạng thái hồ sơ" icon={<ShieldCheck className="h-5 w-5" />} tone="teal" />
        <StatCard label="Số phiên" value={patient.sessions} helper="Tổng số phiên tư vấn" icon={<MessageSquare className="h-5 w-5" />} tone="neutral" />
        <StatCard label="Mối quan tâm" value="1" helper={patient.primaryConcern} icon={<FileText className="h-5 w-5" />} tone="primary" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(320px,0.95fr)]">
        <SectionCard
          title="Tổng quan"
          description="Thông tin chính của hồ sơ bệnh nhân."
          badge={
            <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
              Demo Profile
            </span>
          }
        >
          <div className="grid gap-4 sm:grid-cols-2 text-sm">
            <div className="rounded-xl bg-secondary/55 p-4">
              <div className="text-muted-foreground">Tuổi</div>
              <div className="mt-1 font-semibold text-foreground">{patient.age}</div>
            </div>
            <div className="rounded-xl bg-secondary/55 p-4">
              <div className="text-muted-foreground">Tình trạng</div>
              <div className="mt-1 font-semibold text-foreground">{patient.status}</div>
            </div>
            <div className="rounded-xl bg-secondary/55 p-4">
              <div className="text-muted-foreground">Số phiên tư vấn</div>
              <div className="mt-1 font-semibold text-foreground">{patient.sessions}</div>
            </div>
            <div className="rounded-xl bg-secondary/55 p-4">
              <div className="text-muted-foreground">Vấn đề chính</div>
              <div className="mt-1 font-semibold text-foreground">{patient.primaryConcern}</div>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Clinical Summary" description="Tóm tắt nhanh để bác sĩ định hướng bước tiếp theo.">
          <div className="rounded-[1.35rem] bg-gradient-to-br from-primary/8 to-teal-accent/8 p-5">
            <div className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">Current focus</div>
            <p className="mt-3 text-sm leading-7 text-foreground">
              Hồ sơ hiện ghi nhận mối quan tâm chính là <span className="font-semibold">{patient.primaryConcern}</span>. Đây là nội dung demo để
              mô phỏng card tóm tắt lâm sàng trước khi nối data thật.
            </p>
          </div>
        </SectionCard>
      </div>

      <SectionCard title="Lịch sử gần đây" description="Một số hoạt động demo gần nhất của bệnh nhân trong hệ thống.">
        <div className="space-y-3">
          {[
            { label: "Sàng lọc", detail: "PHQ-9 • Trung bình • 12 điểm", ts: "2024-03-15 20:10" },
            { label: "Trị liệu", detail: "Mood tracker • 3/5", ts: "2024-03-15 21:05" },
            { label: "Nhắc nhở", detail: "Đi bộ 10 phút", ts: "2024-03-16 20:30" },
          ].map((e) => (
            <div key={`${e.label}-${e.ts}`} className="app-surface rounded-[1.2rem] bg-card/90 p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-foreground">{e.label}</div>
                  <div className="truncate text-sm text-muted-foreground">{e.detail}</div>
                </div>
                <div className="text-xs text-muted-foreground">{e.ts}</div>
              </div>
            </div>
          ))}
        </div>
      </SectionCard>
    </PortalShell>
  )
}

