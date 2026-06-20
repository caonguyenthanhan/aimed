"use client"

import Link from "next/link"
import {
  Activity,
  ArrowRight,
  Bell,
  BookOpenText,
  Brain,
  BrainCircuit,
  Heart,
  Newspaper,
  Search,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  TrendingUp,
  UserRound,
  Users,
  Zap,
} from "lucide-react"
import { SectionCard } from "@/components/ui/section-card"
import { StatCard } from "@/components/ui/stat-card"

const featureCards = [
  {
    title: "Tư vấn AI",
    description: "Chat trực tiếp với trợ lý y tế để hỏi đáp triệu chứng, chăm sóc sức khỏe và nhận hướng dẫn bước tiếp theo.",
    icon: Stethoscope,
    link: "/tu-van",
    tone: "from-primary/10 to-accent/10",
  },
  {
    title: "Tâm sự",
    description: "Đối thoại nhẹ nhàng với AI companion để giải tỏa cảm xúc và chuyển tiếp sang trị liệu hoặc bác sĩ khi cần.",
    icon: Heart,
    link: "/tam-su",
    tone: "from-teal-accent/10 to-primary/5",
  },
  {
    title: "Bác sĩ",
    description: "Tìm hồ sơ bác sĩ, xem thông tin công khai và đi thẳng vào luồng đặt lịch ngay trên hệ thống.",
    icon: Users,
    link: "/bac-si",
    tone: "from-primary/10 to-teal-accent/10",
  },
  {
    title: "Tra cứu",
    description: "Thư viện bệnh lý, thuốc và kiến thức sức khỏe được trình bày theo hướng dễ tra cứu và an toàn hơn.",
    icon: Search,
    link: "/tra-cuu",
    tone: "from-secondary to-muted",
  },
] as const

const quickAccessItems = [
  { title: "Tư vấn", subtitle: "AI medical chat", icon: Stethoscope, link: "/tu-van" },
  { title: "Sàng lọc", subtitle: "Bài test tâm lý", icon: Activity, link: "/sang-loc" },
  { title: "Tâm sự", subtitle: "Companion mode", icon: Heart, link: "/tam-su" },
  { title: "Trị liệu", subtitle: "Mood tracking", icon: BookOpenText, link: "/tri-lieu" },
  { title: "Nhắc nhở", subtitle: "Thói quen & thuốc", icon: Bell, link: "/nhac-nho" },
  { title: "Tin tức", subtitle: "Kiến thức y khoa", icon: Newspaper, link: "/tin-tuc-y-khoa" },
  { title: "Bác sĩ", subtitle: "Directory & booking", icon: Users, link: "/bac-si" },
  { title: "Tài khoản", subtitle: "Lịch sử & hồ sơ", icon: ShieldCheck, link: "/account" },
] as const

const technologyHighlights = [
  {
    title: "Hybrid LLM Routing",
    description: "Ưu tiên GPU, fallback Gemini rồi CPU để giữ trải nghiệm ổn định ngay cả khi upstream gián đoạn.",
    icon: Sparkles,
  },
  {
    title: "GraphRAG Evidence",
    description: "Kết nối tri thức dạng đồ thị để tăng grounding và giúp AI trả lời có bối cảnh y tế rõ ràng hơn.",
    icon: BrainCircuit,
  },
  {
    title: "Data Security",
    description: "Thiết kế local-first và nhiều tầng an toàn giúp giảm rủi ro mất dữ liệu hoặc lộ thông tin nhạy cảm.",
    icon: ShieldCheck,
  },
] as const

function FeatureCard({
  title,
  description,
  icon: IconComp,
  link,
  tone,
}: {
  title: string
  description: string
  icon: any
  link: string
  tone: string
}) {
  return (
    <Link
      href={link}
      className="app-surface hover-lift group relative flex h-full flex-col overflow-hidden rounded-[1.5rem] bg-card/85 p-7"
    >
      <div className={`absolute inset-0 bg-gradient-to-br ${tone} opacity-0 transition-opacity duration-300 group-hover:opacity-100`} />
      <div className="relative flex h-full flex-col">
        <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary text-primary shadow-[0_14px_28px_-22px_rgba(20,71,230,0.8)] transition-transform duration-300 group-hover:scale-110">
          <IconComp size={28} />
        </div>
        <h3 className="mb-3 text-xl font-semibold tracking-tight text-foreground">{title}</h3>
        <p className="mb-6 flex-grow text-sm leading-6 text-muted-foreground sm:text-base">{description}</p>
        <div className="flex items-center gap-2 text-sm font-semibold text-primary transition-transform group-hover:translate-x-1">
          Khám phá
          <ArrowRight size={16} />
        </div>
      </div>
    </Link>
  )
}

function QuickAccessCard({
  title,
  subtitle,
  icon: IconComp,
  link
}: {
  title: string
  subtitle: string
  icon: any
  link: string
}) {
  return (
    <Link
      href={link}
      className="app-surface hover-lift group flex items-center gap-4 rounded-[1rem] bg-card/85 p-4"
    >
      <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-secondary text-primary transition-transform group-hover:scale-110">
        <IconComp size={22} />
      </div>
      <div className="flex-grow">
        <div className="text-base font-semibold text-foreground">{title}</div>
        <div className="text-sm text-muted-foreground">{subtitle}</div>
      </div>
      <ArrowRight size={18} className="text-primary transition-transform group-hover:translate-x-1" />
    </Link>
  )
}

export default function LandingPage() {
  return (
    <div
      className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/60 text-foreground"
      suppressHydrationWarning
    >
      <main className="flex-grow overflow-x-hidden pb-10">
        <section className="px-4 pb-18 pt-24 sm:px-6 lg:px-8 lg:pb-24 lg:pt-28">
          <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)] lg:items-center">
            <div className="space-y-8">
              <div className="inline-flex items-center gap-2 rounded-full bg-muted px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-teal-accent opacity-75" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-teal-accent" />
                </span>
                AI-Powered Medical Hub
              </div>

              <div className="space-y-5">
                <h1 className="max-w-4xl text-4xl font-bold leading-tight tracking-tight sm:text-5xl lg:text-6xl lg:leading-[1.08]">
                  <span className="gradient-heading">Hệ thống Tư vấn Y tế</span>
                  <br />
                  & Sức khỏe Tinh thần AI
                </h1>
                <p className="max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
                  Trải nghiệm nền tảng y tế app-like với tư vấn AI, hỗ trợ tâm lý, sàng lọc, tra cứu và kết nối bác sĩ
                  trong cùng một hệ thống đồng nhất, hiện đại và đáng tin cậy.
                </p>
              </div>

              <div className="flex flex-wrap gap-4">
                <Link
                  href="/tu-van"
                  className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-[0_18px_36px_-22px_rgba(20,71,230,0.95)] transition-all hover:-translate-y-1 hover:bg-primary/90"
                >
                  <Stethoscope size={18} />
                  Bắt đầu ngay
                </Link>
                <Link
                  href="/bac-si"
                  className="inline-flex items-center gap-2 rounded-xl bg-secondary px-6 py-3 text-sm font-semibold text-primary transition-all hover:-translate-y-1 hover:bg-secondary/80"
                >
                  <Users size={18} />
                  Tìm bác sĩ
                </Link>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <StatCard
                  label="Tư vấn liên tục"
                  value="24/7"
                  helper="AI routing đa tầng"
                  icon={<Zap size={20} />}
                  tone="primary"
                />
                <StatCard
                  label="Mức bảo vệ"
                  value="100%"
                  helper="Safety & fallback rõ ràng"
                  icon={<ShieldCheck size={20} />}
                  tone="teal"
                />
                <StatCard
                  label="Trạng thái hệ thống"
                  value="Hybrid"
                  helper="GPU · Gemini · CPU"
                  icon={<TrendingUp size={20} />}
                  tone="neutral"
                />
              </div>
            </div>

            <div className="relative hidden lg:block">
              <div className="absolute inset-6 rounded-[2rem] bg-gradient-to-br from-primary/20 to-teal-accent/20 blur-3xl" />
              <div className="glass-panel dark:glass-panel-dark relative overflow-hidden rounded-[2rem] border border-border/70 p-6">
                <div className="grid gap-4">
                  <div className="app-surface rounded-[1.5rem] bg-card/80 p-5">
                    <div className="mb-4 flex items-center justify-between">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Hệ thống trực tuyến</p>
                        <p className="mt-1 text-xl font-semibold text-primary">Clinical Clarity Portal</p>
                      </div>
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                        <Brain size={22} />
                      </div>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-2xl bg-secondary p-4">
                        <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">Uptime</p>
                        <p className="mt-2 text-2xl font-semibold text-foreground">100%</p>
                      </div>
                      <div className="rounded-2xl bg-secondary p-4">
                        <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">Mode</p>
                        <p className="mt-2 text-2xl font-semibold text-foreground">Hybrid</p>
                      </div>
                    </div>
                  </div>

                  <div className="app-surface rounded-[1.5rem] bg-card/85 p-5">
                    <div className="space-y-4">
                      <div className="flex gap-3">
                        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-secondary text-foreground">
                          <UserRound size={18} />
                        </div>
                        <div className="rounded-2xl rounded-bl-md bg-secondary px-4 py-3 text-sm text-foreground">
                          Tôi đang bị mất ngủ và khá lo lắng gần đây.
                        </div>
                      </div>
                      <div className="flex justify-end gap-3">
                        <div className="rounded-2xl rounded-br-md bg-primary px-4 py-3 text-sm text-primary-foreground">
                          Tôi sẽ gợi ý luồng an toàn nhất: tâm sự trước, sau đó chuyển sang sàng lọc GAD-7 nếu bạn muốn.
                        </div>
                        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                          AI
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="border-y border-border/60 bg-card/30 px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
          <div className="mx-auto max-w-7xl">
            <div className="mb-10 space-y-4 text-center">
              <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                Tiện ích sức khỏe <span className="gradient-heading">thông minh</span>
              </h2>
              <p className="mx-auto max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
                Chọn một dịch vụ để bắt đầu hành trình chăm sóc sức khỏe của bạn với giao diện đồng nhất và tối ưu cho mobile.
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
              {featureCards.map((item) => (
                <FeatureCard key={item.title} {...item} />
              ))}
            </div>
          </div>
        </section>

        <section className="px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
              <SectionCard
                title="Truy cập nhanh"
                description="Các entry-point được dùng nhiều nhất để bệnh nhân bắt đầu nhanh mà không bị lạc điều hướng."
                badge={
                  <span className="rounded-full bg-secondary px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    Fast access
                  </span>
                }
                contentClassName="grid gap-4 sm:grid-cols-2"
              >
                {quickAccessItems.map((item) => (
                  <QuickAccessCard key={item.title} {...item} />
                ))}
              </SectionCard>

              <SectionCard
                title="Công nghệ tiên phong"
                description="AIMed không chỉ là chatbot; đây là một hệ sinh thái AI y tế kết nối tri thức, định tuyến model và bảo vệ an toàn."
                badge={
                  <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
                    Clinical stack
                  </span>
                }
                contentClassName="space-y-4"
              >
                {technologyHighlights.map((item) => (
                  <div key={item.title} className="app-surface rounded-[1.2rem] bg-card/80 p-4">
                    <div className="flex items-start gap-4">
                      <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-secondary text-primary">
                        <item.icon size={22} />
                      </div>
                      <div>
                        <h3 className="text-base font-semibold text-foreground">{item.title}</h3>
                        <p className="mt-1 text-sm leading-6 text-muted-foreground">{item.description}</p>
                      </div>
                    </div>
                  </div>
                ))}
                <div className="rounded-[1.2rem] border border-dashed border-primary/20 bg-primary/5 px-4 py-4 text-sm leading-6 text-muted-foreground">
                  AI Med ưu tiên tính rõ ràng, điều hướng ít bước và trạng thái hệ thống minh bạch để phù hợp cả demo lẫn vận hành thực tế.
                </div>
              </SectionCard>
            </div>
          </div>
        </section>

        <section className="px-4 pb-16 pt-4 sm:px-6 lg:px-8 lg:pb-20">
          <div className="mx-auto max-w-5xl">
            <div className="app-surface overflow-hidden rounded-[2rem] bg-gradient-to-br from-primary/10 via-card to-teal-accent/10 px-6 py-10 text-center sm:px-10">
              <div className="mx-auto max-w-3xl space-y-5">
                <div className="inline-flex rounded-full bg-card/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Ready for action
                </div>
                <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                  Bắt đầu chăm sóc sức khỏe ngay hôm nay
                </h2>
                <p className="text-base leading-7 text-muted-foreground sm:text-lg">
                  Tham gia hệ thống để tư vấn với AI, tìm bác sĩ phù hợp hoặc bắt đầu hành trình sức khỏe tinh thần một cách có cấu trúc hơn.
                </p>
                <div className="flex flex-col justify-center gap-4 pt-2 sm:flex-row">
                  <Link
                    href="/tu-van"
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-8 py-3 text-sm font-semibold text-primary-foreground transition-all hover:-translate-y-1 hover:bg-primary/90"
                  >
                    <Zap size={18} />
                    Khám phá ngay
                  </Link>
                  <Link
                    href="/account"
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-card/90 px-8 py-3 text-sm font-semibold text-foreground transition-all hover:-translate-y-1 hover:bg-card"
                  >
                    <ShieldCheck size={18} />
                    Tài khoản của tôi
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        <footer className="border-t border-border/60 bg-card/30 px-4 py-10 sm:px-6 lg:px-8">
          <div className="mx-auto grid max-w-7xl gap-8 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
            <div className="space-y-3">
              <div className="text-lg font-bold tracking-tight text-primary">AIMed</div>
              <p className="max-w-xl text-sm leading-6 text-muted-foreground">
                Nền tảng tư vấn y tế và sức khỏe tinh thần ứng dụng AI. Nội dung chỉ mang tính tham khảo và không thay thế chẩn đoán chuyên môn của bác sĩ.
              </p>
            </div>
            <div className="flex flex-wrap gap-3 text-sm font-medium text-muted-foreground">
              <Link href="/gioi-thieu" className="transition-colors hover:text-primary">
                Hướng dẫn
              </Link>
              <Link href="/bac-si" className="transition-colors hover:text-primary">
                Bác sĩ
              </Link>
              <Link href="/tin-tuc-y-khoa" className="transition-colors hover:text-primary">
                Tin tức
              </Link>
              <Link href="/account" className="transition-colors hover:text-primary">
                Tài khoản
              </Link>
            </div>
          </div>
        </footer>
      </main>
    </div>
  )
}
