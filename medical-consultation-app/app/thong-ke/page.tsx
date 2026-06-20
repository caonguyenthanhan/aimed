import { Activity, BrainCircuit, Download, HeartPulse, MoonStar, Sparkles, TrendingUp } from "lucide-react"
import PortalShell from "@/components/portal-shell"
import { SectionCard } from "@/components/ui/section-card"
import { StatCard } from "@/components/ui/stat-card"

const overviewCards = [
  {
    label: "Lượt tư vấn",
    value: "1,248",
    helper: "28 ngày gần nhất",
    trend: "+8.2%",
    icon: <BrainCircuit size={20} />,
    tone: "primary" as const,
  },
  {
    label: "Bài sàng lọc",
    value: "532",
    helper: "Hoàn tất trong tháng",
    trend: "+4.5%",
    icon: <Activity size={20} />,
    tone: "teal" as const,
  },
  {
    label: "Tỷ lệ hài lòng",
    value: "94%",
    helper: "Đánh giá trung bình",
    trend: "+1.1%",
    icon: <HeartPulse size={20} />,
    tone: "neutral" as const,
  },
] as const

const moodData = [
  { day: "T2", value: 62, avg: 54 },
  { day: "T3", value: 68, avg: 56 },
  { day: "T4", value: 58, avg: 55 },
  { day: "T5", value: 76, avg: 59 },
  { day: "T6", value: 72, avg: 60 },
  { day: "T7", value: 79, avg: 62 },
  { day: "CN", value: 85, avg: 64 },
] as const

const activityData = [
  { day: "T2", steps: 4200 },
  { day: "T3", steps: 3600 },
  { day: "T4", steps: 7100 },
  { day: "T5", steps: 6100 },
  { day: "T6", steps: 5300 },
  { day: "T7", steps: 4700 },
  { day: "CN", steps: 7600 },
] as const

const insightItems = [
  "Tâm trạng trong 7 ngày gần đây tốt hơn 15% so với trung bình tháng trước.",
  "Hoạt động thể chất buổi sáng có tương quan tích cực với chất lượng giấc ngủ.",
  "Những ngày ghi nhật ký cảm xúc đều có chỉ số ổn định hơn và ít biến động hơn vào buổi tối.",
] as const

const sleepBreakdown = [
  { label: "Deep", value: 25, color: "bg-primary" },
  { label: "Light", value: 50, color: "bg-primary/60" },
  { label: "REM", value: 15, color: "bg-teal-accent" },
  { label: "Awake", value: 10, color: "bg-destructive/40" },
] as const

export default function StatisticsPage() {
  const maxSteps = Math.max(...activityData.map((item) => item.steps))

  return (
    <PortalShell
      eyebrow="Health Statistics"
      title="Bảng thống kê sức khỏe"
      description="Theo dõi xu hướng cảm xúc, mức độ hoạt động và chất lượng giấc ngủ trong một màn dashboard đồng nhất với hệ thống."
      actions={
        <button className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-all hover:-translate-y-0.5 hover:bg-primary/90">
          <Download size={16} />
          Xuất báo cáo
        </button>
      }
      aside={
        <div className="space-y-6">
          <SectionCard
            title="AI Insights"
            description="Những điểm nổi bật được diễn giải để người dùng dễ hiểu thay vì chỉ nhìn số."
            badge={
              <span className="rounded-full bg-teal-accent/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-teal-accent">
                Insight
              </span>
            }
            contentClassName="space-y-4"
          >
            {insightItems.map((item, index) => (
              <div key={item} className="flex items-start gap-3 rounded-2xl bg-secondary/70 px-4 py-3">
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Sparkles size={16} />
                </div>
                <p className="text-sm leading-6 text-foreground">
                  <span className="mr-1 font-semibold text-primary">0{index + 1}.</span>
                  {item}
                </p>
              </div>
            ))}
          </SectionCard>

          <div className="app-surface overflow-hidden rounded-[1.4rem] bg-primary p-5 text-primary-foreground">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary-foreground/75">Quick Action</p>
                <h3 className="mt-2 text-2xl font-semibold tracking-tight">Monthly Report</h3>
                <p className="mt-2 text-sm leading-6 text-primary-foreground/80">
                  Tổng hợp nhanh toàn bộ thống kê để chia sẻ với bác sĩ hoặc lưu vào hồ sơ cá nhân.
                </p>
              </div>
              <TrendingUp className="mt-1 h-6 w-6 shrink-0 text-primary-foreground/80" />
            </div>
          </div>
        </div>
      }
    >
      <div className="grid gap-6 md:grid-cols-3">
        {overviewCards.map((card) => (
          <StatCard key={card.label} {...card} />
        ))}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <SectionCard
          title="Mood Trends"
          description="So sánh chỉ số cá nhân với trung bình hệ thống để thấy rõ độ lệch và xu hướng phục hồi."
          badge={
            <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
              7 ngày
            </span>
          }
        >
          <div className="space-y-5">
            <div className="grid grid-cols-7 items-end gap-3 rounded-[1.25rem] bg-secondary/45 px-4 py-5">
              {moodData.map((item) => (
                <div key={item.day} className="flex flex-col items-center gap-3">
                  <div className="flex h-44 items-end gap-2">
                    <div
                      className="w-4 rounded-full bg-primary shadow-[0_12px_24px_-18px_rgba(20,71,230,0.95)]"
                      style={{ height: `${item.value}%` }}
                    />
                    <div className="w-2 rounded-full bg-teal-accent/45" style={{ height: `${item.avg}%` }} />
                  </div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{item.day}</div>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-primary" />
                Cá nhân
              </div>
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-teal-accent/50" />
                Trung bình
              </div>
            </div>
          </div>
        </SectionCard>

        <SectionCard
          title="Activity Levels"
          description="Tổng hợp số bước mỗi ngày để phát hiện thời điểm cơ thể hoạt động hiệu quả nhất."
          badge={
            <span className="rounded-full bg-teal-accent/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-teal-accent">
              +12.4%
            </span>
          }
        >
          <div className="space-y-4">
            <div className="flex h-56 items-end justify-between gap-3 rounded-[1.25rem] bg-secondary/45 px-4 py-5">
              {activityData.map((item) => (
                <div key={item.day} className="flex flex-1 flex-col items-center gap-3">
                  <div
                    className={`w-full max-w-10 rounded-t-2xl ${item.steps === maxSteps ? "bg-primary" : "bg-primary/20"} transition-all`}
                    style={{ height: `${Math.max(24, (item.steps / maxSteps) * 100)}%` }}
                  />
                  <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{item.day}</div>
                </div>
              ))}
            </div>
            <div className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-3">
              <div className="rounded-xl bg-secondary/65 px-3 py-3">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em]">Đỉnh hoạt động</div>
                <div className="mt-1 text-base font-semibold text-foreground">7,600 bước</div>
              </div>
              <div className="rounded-xl bg-secondary/65 px-3 py-3">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em]">Trung bình</div>
                <div className="mt-1 text-base font-semibold text-foreground">5,514 bước</div>
              </div>
              <div className="rounded-xl bg-secondary/65 px-3 py-3">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em]">Khuyến nghị</div>
                <div className="mt-1 text-base font-semibold text-foreground">Tăng sáng T3-T4</div>
              </div>
            </div>
          </div>
        </SectionCard>
      </div>

      <div className="mt-6">
        <SectionCard
          title="Sleep Quality"
          description="Mô phỏng phân bố chu kỳ ngủ để người dùng có góc nhìn rõ ràng về độ sâu và chất lượng giấc ngủ."
          badge={
            <span className="rounded-full bg-secondary px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Average 7h 45m
            </span>
          }
        >
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="space-y-4">
              <div>
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Sleep cycles</span>
                  <span className="font-semibold text-foreground">Good</span>
                </div>
                <div className="flex h-8 overflow-hidden rounded-full bg-secondary">
                  {sleepBreakdown.map((item) => (
                    <div key={item.label} className={item.color} style={{ width: `${item.value}%` }} />
                  ))}
                </div>
              </div>
              <div className="flex flex-wrap gap-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                {sleepBreakdown.map((item) => (
                  <div key={item.label} className="flex items-center gap-2">
                    <span className={`h-2.5 w-2.5 rounded-full ${item.color}`} />
                    {item.label}
                  </div>
                ))}
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
              <div className="rounded-[1.2rem] bg-secondary/70 p-4">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MoonStar size={16} />
                  <span className="text-[11px] font-semibold uppercase tracking-[0.18em]">Fall Asleep</span>
                </div>
                <div className="mt-2 text-2xl font-semibold text-foreground">22:45</div>
              </div>
              <div className="rounded-[1.2rem] bg-secondary/70 p-4">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MoonStar size={16} />
                  <span className="text-[11px] font-semibold uppercase tracking-[0.18em]">Wake Up</span>
                </div>
                <div className="mt-2 text-2xl font-semibold text-foreground">06:30</div>
              </div>
            </div>
          </div>
        </SectionCard>
      </div>
    </PortalShell>
  )
}
