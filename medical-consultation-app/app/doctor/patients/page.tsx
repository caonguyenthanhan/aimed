'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { CalendarDays, Filter, Mail, Phone, Search, ShieldCheck, Users } from 'lucide-react'
import { demoPatients } from "@/lib/doctor-demo"
import PortalShell from "@/components/portal-shell"
import { SectionCard } from "@/components/ui/section-card"
import { StatCard } from "@/components/ui/stat-card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

export default function DoctorPatientsPage() {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeOnly, setActiveOnly] = useState(false)

  useEffect(() => {
    setMounted(true)
    const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null
    const role = typeof window !== 'undefined' ? localStorage.getItem('userRole') : null
    
    if (!token || role !== 'doctor') {
      router.replace('/login')
      return
    }
  }, [router])

  if (!mounted) return null

  const filteredPatients = demoPatients
    .filter((p) => (!activeOnly ? true : p.status === "Hoạt động"))
    .filter((p) => p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.email.toLowerCase().includes(searchQuery.toLowerCase()))

  const activeCount = demoPatients.filter((patient) => patient.status === "Hoạt động").length

  return (
    <PortalShell
      eyebrow="Patient Directory"
      title="Danh sách bệnh nhân"
      description="Quản lý hồ sơ bệnh nhân theo cùng shell doctor portal, giữ nguyên dataset demo và route detail hiện có."
      actions={
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[260px]">
            <Search size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm theo tên hoặc email..."
              className="input-glow rounded-full border-border/70 bg-card pl-10"
            />
          </div>
          <Button
            type="button"
            variant="outline"
            className="rounded-xl"
            onClick={() => setActiveOnly((v) => !v)}
          >
            <Filter size={16} className="mr-2" />
            {activeOnly ? "Chỉ hoạt động" : "Tất cả"}
          </Button>
        </div>
      }
      aside={
        <div className="space-y-6">
          <SectionCard title="Trạng thái danh mục" description="Luồng này hiện đang chạy bằng data demo doctor portal.">
            <div className="rounded-[1.2rem] bg-primary px-5 py-5 text-primary-foreground">
              <div className="mb-2 flex items-center gap-2 text-primary-foreground/90">
                <ShieldCheck className="h-5 w-5" />
                <span className="text-sm font-semibold uppercase tracking-[0.18em]">Demo-backed</span>
              </div>
              <p className="text-sm leading-6 text-primary-foreground/85">
                Khi cần nối data thật, màn này có thể giữ nguyên shell và chỉ thay nguồn danh sách + detail route.
              </p>
            </div>
          </SectionCard>
        </div>
      }
    >
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          label="Tổng hồ sơ"
          value={demoPatients.length}
          helper="Directory hiện có"
          icon={<Users size={20} />}
          tone="primary"
        />
        <StatCard
          label="Đang hoạt động"
          value={activeCount}
          helper="Bệnh nhân có tương tác gần đây"
          icon={<ShieldCheck size={20} />}
          tone="teal"
        />
        <StatCard
          label="Đang hiển thị"
          value={filteredPatients.length}
          helper="Theo bộ lọc hiện tại"
          icon={<Search size={20} />}
          tone="neutral"
        />
      </div>

      <SectionCard
        title="Patient Table"
        description="Danh sách hồ sơ bệnh nhân theo phong cách directory của mockup FE mới."
        badge={
          <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
            {filteredPatients.length} rows
          </span>
        }
        contentClassName="space-y-4"
      >
        {filteredPatients.length === 0 ? (
          <div className="rounded-xl bg-secondary/55 px-4 py-10 text-center text-muted-foreground">
            Không tìm thấy bệnh nhân nào
          </div>
        ) : null}

        <div className="space-y-4">
          {filteredPatients.map((patient) => (
            <div key={patient.id} className="app-surface hover-lift rounded-[1.35rem] bg-card/90 p-5">
              <div className="grid gap-4 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,0.9fr)_minmax(0,0.9fr)_auto] xl:items-center">
                <div className="min-w-0">
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <Users className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-base font-semibold text-foreground">{patient.name}</div>
                      <div className="mt-1 text-sm text-muted-foreground">Tuổi: {patient.age} • {patient.primaryConcern}</div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <span className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-foreground">{patient.sessions} sessions</span>
                        <span className={`rounded-full px-3 py-1 text-xs font-medium ${
                          patient.status === 'Hoạt động'
                            ? 'bg-teal-accent/10 text-teal-accent'
                            : 'bg-secondary text-muted-foreground'
                        }`}>
                          {patient.status}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-2 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Phone size={15} />
                    <span>{patient.phone}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail size={15} />
                    <span className="truncate">{patient.email}</span>
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <CalendarDays size={15} />
                    <span>Lần cuối</span>
                  </div>
                  <div className="font-medium text-foreground">{new Date(patient.lastVisit).toLocaleDateString('vi-VN')}</div>
                </div>

                <div className="flex flex-wrap gap-3 xl:justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-xl"
                    onClick={() => router.push(`/doctor/patients/${patient.id}`)}
                  >
                    Xem chi tiết
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </SectionCard>
    </PortalShell>
  )
}
