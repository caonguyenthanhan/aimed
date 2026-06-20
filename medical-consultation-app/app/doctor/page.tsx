'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle, ArrowRight, CalendarDays, ClipboardList, FileText, HeartPulse, TrendingUp, Users } from 'lucide-react'
import { demoConsultations, demoPatients } from "@/lib/doctor-demo"
import PortalShell from "@/components/portal-shell"
import { SectionCard } from "@/components/ui/section-card"
import { StatCard } from "@/components/ui/stat-card"
import { Button } from "@/components/ui/button"

export default function DoctorDashboard() {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [userName, setUserName] = useState('')

  useEffect(() => {
    setMounted(true)
    const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null
    const role = typeof window !== 'undefined' ? localStorage.getItem('userRole') : null
    const name = typeof window !== 'undefined' ? localStorage.getItem('userFullName') : null
    
    if (!token || role !== 'doctor') {
      router.replace('/login')
      return
    }
    
    setUserName(name || 'Bác sĩ')
  }, [router])

  if (!mounted) return null

  const stats = [
    { icon: Users, label: 'Bệnh nhân đang theo dõi', value: demoPatients.length, helper: 'Danh sách active trong doctor portal', tone: 'primary' as const },
    { icon: FileText, label: 'Báo cáo hôm nay', value: '8', helper: '2 báo cáo cần rà soát gấp', tone: 'neutral' as const },
    { icon: CalendarDays, label: 'Lịch hẹn đang chờ', value: '5', helper: 'Đồng bộ với inbox appointments', tone: 'teal' as const },
    { icon: AlertTriangle, label: 'Clinical alerts', value: '2', helper: 'Tình huống cần phản hồi sớm', tone: 'primary' as const },
  ]

  return (
    <PortalShell
      eyebrow="Doctor Dashboard"
      title={`Chào mừng, ${userName}`}
      description="Bảng điều khiển tổng hợp cho lịch hẹn, bệnh nhân, cảnh báo lâm sàng và luồng thao tác nhanh của bác sĩ."
      actions={
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" className="rounded-xl" onClick={() => router.push("/doctor/reports")}>
            Export Daily Log
          </Button>
          <Button className="rounded-xl" onClick={() => router.push("/doctor/reports/new")}>
            New Consultation
          </Button>
        </div>
      }
      aside={
        <div className="space-y-6">
          <SectionCard title="Quick Actions" description="Các lối tắt chính cho ca trực hôm nay.">
            <div className="grid gap-3">
              <button type="button" onClick={() => router.push("/doctor/patients")} className="rounded-xl bg-primary px-4 py-3 text-left text-sm font-semibold text-primary-foreground transition hover:bg-primary/90">
                Xem danh sách bệnh nhân
              </button>
              <button type="button" onClick={() => router.push("/doctor/appointments")} className="rounded-xl bg-secondary/55 px-4 py-3 text-left text-sm font-medium text-foreground transition hover:bg-secondary">
                Xem lịch hẹn
              </button>
              <button type="button" onClick={() => router.push("/thong-ke")} className="rounded-xl bg-secondary/55 px-4 py-3 text-left text-sm font-medium text-foreground transition hover:bg-secondary">
                Xem thống kê
              </button>
            </div>
          </SectionCard>

          <SectionCard title="Hiệu suất" description="Một số chỉ số demo để hỗ trợ bố cục doctor portal.">
            <div className="space-y-4">
              <div>
                <div className="mb-1 flex justify-between text-sm">
                  <span className="text-muted-foreground">Tỷ lệ hoàn tất</span>
                  <span className="font-semibold text-foreground">92%</span>
                </div>
                <div className="h-2 rounded-full bg-secondary">
                  <div className="h-2 rounded-full bg-teal-accent" style={{ width: '92%' }} />
                </div>
              </div>
              <div>
                <div className="mb-1 flex justify-between text-sm">
                  <span className="text-muted-foreground">Hài lòng bệnh nhân</span>
                  <span className="font-semibold text-foreground">4.8/5</span>
                </div>
                <div className="h-2 rounded-full bg-secondary">
                  <div className="h-2 rounded-full bg-primary" style={{ width: '96%' }} />
                </div>
              </div>
            </div>
          </SectionCard>
        </div>
      }
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <StatCard
              key={stat.label}
              label={stat.label}
              value={stat.value}
              helper={stat.helper}
              icon={<Icon size={20} />}
              tone={stat.tone}
            />
          )
        })}
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
        <SectionCard
          title="Tư vấn gần đây"
          description="Các hội thoại gần nhất để bác sĩ quay lại xử lý hoặc tiếp tục theo conversation id."
          badge={
            <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
              {demoConsultations.length} items
            </span>
          }
          contentClassName="space-y-4"
        >
          {demoConsultations.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => router.push(`/tu-van?id=${encodeURIComponent(item.conversationId)}`)}
              className="app-surface hover-lift w-full rounded-[1.3rem] bg-card/90 p-4 text-left"
            >
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0">
                  <p className="truncate text-base font-semibold text-foreground">{item.patient}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{item.time}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-foreground">{item.type}</span>
                  <span className={`rounded-full px-3 py-1 text-xs font-medium ${
                    item.status === 'Đã hoàn tất'
                      ? 'bg-teal-accent/10 text-teal-accent'
                      : item.status === 'Đang xử lý'
                        ? 'bg-primary/10 text-primary'
                        : 'bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300'
                  }`}>
                    {item.status}
                  </span>
                </div>
              </div>
            </button>
          ))}
        </SectionCard>

        <div className="space-y-6">
          <SectionCard
            title="AI Clinical Alerts"
            description="Khối cảnh báo và gợi ý ưu tiên theo mockup doctor dashboard."
            badge={
              <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
                Live Analysis
              </span>
            }
            contentClassName="space-y-4"
          >
            <div className="rounded-[1.25rem] border-l-4 border-destructive bg-destructive/5 px-4 py-4">
              <div className="mb-1 flex items-center justify-between gap-2">
                <h4 className="font-semibold text-foreground">Critical Bradycardia Detected</h4>
                <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-destructive">2m ago</span>
              </div>
              <p className="text-sm leading-6 text-muted-foreground">Patient ID `#PX-9921` cho tín hiệu nhịp tim thấp kéo dài. Khuyến nghị gọi kiểm tra nhanh ngay trong phiên hôm nay.</p>
            </div>
            <div className="rounded-[1.25rem] border-l-4 border-primary bg-primary/5 px-4 py-4">
              <div className="mb-1 flex items-center justify-between gap-2">
                <h4 className="font-semibold text-foreground">Lab Result Anomaly</h4>
                <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">45m ago</span>
              </div>
              <p className="text-sm leading-6 text-muted-foreground">Bảng xét nghiệm của bệnh nhân Sarah Jenkins có bất thường điện giải và cần rà lại trước buổi khám tiếp theo.</p>
            </div>
            <div className="rounded-[1.25rem] border border-border/70 bg-secondary/40 px-4 py-4">
              <div className="mb-1 flex items-center justify-between gap-2">
                <h4 className="font-semibold text-foreground">Medication Reconciliation</h4>
                <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">2h ago</span>
              </div>
              <p className="text-sm leading-6 text-muted-foreground">Phát hiện nguy cơ tương tác thuốc trên lịch sử mới nhập. Có thể mở report hoặc vào lịch hẹn để xác nhận thêm.</p>
            </div>
          </SectionCard>

          <SectionCard title="Upcoming Schedule" description="Một vài mốc ca khám tiếp theo trong ngày.">
            <div className="space-y-4">
              {[
                { time: '09:00 AM', title: 'Post-op Review', subtitle: 'Elena Rodriguez (Room 304)', active: true },
                { time: '10:30 AM', title: 'Cardiology Consultation', subtitle: 'Mr. George Walton (Remote)', active: false },
                { time: '11:15 AM', title: 'Team Case Briefing', subtitle: 'Conference Room B', active: false },
              ].map((entry) => (
                <div key={`${entry.time}-${entry.title}`} className="flex gap-4">
                  <div className={`mt-1 h-10 w-10 shrink-0 rounded-full border-2 ${entry.active ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-secondary text-muted-foreground'} flex items-center justify-center`}>
                    <HeartPulse className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1 rounded-[1.2rem] bg-secondary/40 px-4 py-4">
                    <div className="mb-1 flex items-center gap-2">
                      <span className={`text-sm font-semibold ${entry.active ? 'text-primary' : 'text-muted-foreground'}`}>{entry.time}</span>
                      {entry.active ? <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.18em] text-primary">Ongoing</span> : null}
                    </div>
                    <div className="font-semibold text-foreground">{entry.title}</div>
                    <div className="text-sm text-muted-foreground">{entry.subtitle}</div>
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>
      </div>

      <SectionCard title="Portal Routes" description="Điều hướng nhanh tới các phần chính của doctor portal.">
        <div className="grid gap-4 md:grid-cols-3">
          {[
            { title: 'Patients', description: 'Xem danh sách bệnh nhân và hồ sơ điều trị.', href: '/doctor/patients', icon: <Users className="h-5 w-5" /> },
            { title: 'Appointments', description: 'Quản lý lịch hẹn và booking từ public flow.', href: '/doctor/appointments', icon: <CalendarDays className="h-5 w-5" /> },
            { title: 'Reports', description: 'Soạn báo cáo và rà lại các trường hợp cần theo dõi.', href: '/doctor/reports', icon: <ClipboardList className="h-5 w-5" /> },
          ].map((item) => (
            <button
              key={item.href}
              type="button"
              onClick={() => router.push(item.href)}
              className="app-surface hover-lift flex items-start gap-4 rounded-[1.3rem] bg-card/90 p-5 text-left"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">{item.icon}</div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <div className="font-semibold text-foreground">{item.title}</div>
                  <ArrowRight className="h-4 w-4 text-primary" />
                </div>
                <div className="mt-2 text-sm leading-6 text-muted-foreground">{item.description}</div>
              </div>
            </button>
          ))}
        </div>
      </SectionCard>
    </PortalShell>
  )
}
