'use client'

import { useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Bot, Copy, ExternalLink, FileText, ShieldCheck, Sparkles, Workflow } from "lucide-react"
import PortalShell from "@/components/portal-shell"
import { SectionCard } from "@/components/ui/section-card"
import { StatCard } from "@/components/ui/stat-card"
import { getAllAgentProfiles, type AgentProfileId } from "@/lib/agent-profiles"

type DemoScenario = {
  id: string
  title: string
  profile: AgentProfileId | "auto"
  prompt: string
  expected: string[]
}

export default function AgentHubPage() {
  const router = useRouter()
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const profiles = useMemo(() => getAllAgentProfiles(), [])

  const demos = useMemo<DemoScenario[]>(
    () => [
      {
        id: "demo-triage",
        title: "Triage: đau ngực/khó thở (an toàn trước)",
        profile: "auto",
        prompt: "Tôi 45 tuổi, đau ngực trái kèm khó thở nhẹ 30 phút nay. Nên làm gì ngay bây giờ?",
        expected: ["Cảnh báo red flags", "Hỏi follow-up tối thiểu", "Gợi ý đi khám/cấp cứu nếu cần", "Có thể gợi ý mở /bac-si hoặc /sang-loc"],
      },
      {
        id: "demo-medication",
        title: "Thuốc: tương tác & tác dụng phụ",
        profile: "auto",
        prompt: "Tôi đang uống amlodipine. Nếu uống thêm ibuprofen thì có vấn đề gì không? Tôi có huyết áp cao.",
        expected: ["Hỏi bệnh nền/thuốc khác/dị ứng", "Nêu cảnh báo tương tác & dấu hiệu cần đi khám", "Gợi ý mở /tra-cuu"],
      },
      {
        id: "demo-care-plan",
        title: "Kế hoạch: giảm cân an toàn",
        profile: "auto",
        prompt: "Hãy lập kế hoạch 7 ngày giúp tôi giảm cân an toàn: ăn uống, vận động, theo dõi chỉ số. Tôi ít thời gian.",
        expected: ["Kế hoạch theo ngày/tuần", "Nhắc mốc theo dõi", "Gợi ý mở /ke-hoach"],
      },
      {
        id: "demo-therapy",
        title: "Trị liệu: giảm lo âu + bài tập thở",
        profile: "auto",
        prompt: "Tôi đang lo âu, tim đập nhanh, khó ngủ. Bạn hướng dẫn bài tập thở và cách xử lý trong 10 phút được không?",
        expected: ["Đồng cảm + hướng dẫn bài tập", "Sàng lọc nguy cơ", "Gợi ý mở /tri-lieu hoặc /sang-loc"],
      },
      {
        id: "demo-graph",
        title: "Graph: hỏi theo dữ liệu nội bộ",
        profile: "auto",
        prompt: "Hãy lấy evidence từ graph cho câu hỏi: triệu chứng của tăng huyết áp và khuyến nghị theo dõi là gì?",
        expected: ["Graph indicator báo ok/down", "Nếu graph ok: có nhắc evidence", "Nếu graph down: degrade gracefully"],
      },
    ],
    [],
  )

  const supportedFeatures = useMemo(() => {
    return Array.from(new Set(profiles.flatMap((profile) => profile.preferredFeatures)))
  }, [profiles])

  const doCopy = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedId(id)
      setTimeout(() => setCopiedId(null), 1200)
    } catch {
      setCopiedId(null)
    }
  }

  const openChatWithPrompt = (prompt: string) => {
    try {
      localStorage.setItem("mcs_agent_mode_v1", "1")
      localStorage.setItem("mcs_demo_prompt_v1", prompt)
    } catch {}
    router.push("/tu-van")
  }

  return (
    <div suppressHydrationWarning className="min-h-screen hero-gradient dark:hero-gradient-dark">
      <PortalShell
        eyebrow="Agent Demo"
        title="Agent Hub"
        description="Giới thiệu agent profiles, năng lực điều hướng và bộ demo 1-click để trình bày với hội đồng. Logic copy prompt, bật Agent mode và mở `/tu-van` vẫn giữ nguyên."
        actions={
          <Link
            href="/tu-van"
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 transition"
          >
            <ExternalLink className="h-4 w-4" />
            Mở Chat
          </Link>
        }
        aside={
          <div className="space-y-6">
            <SectionCard title="Flow demo" description="Nhịp trình bày được tối ưu cho bảo vệ hoặc smoke demo.">
              <div className="space-y-3 text-sm text-muted-foreground">
                <div className="rounded-2xl border border-border/70 bg-background/70 p-4">Chọn một kịch bản 1-click hoặc copy prompt mẫu.</div>
                <div className="rounded-2xl border border-border/70 bg-background/70 p-4">Mở `/tu-van`, Agent mode được bật sẵn qua local storage.</div>
                <div className="rounded-2xl border border-border/70 bg-background/70 p-4">Trong chat, trình bày thêm context viewer để giải thích runtime, evidence và fallback.</div>
              </div>
            </SectionCard>
            <SectionCard title="Vùng ưu tiên" description="Điểm cần quan sát trong lúc demo agent.">
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>Ưu tiên profile `auto` để thể hiện semantic routing thay vì chọn tay.</p>
                <p>Nhấn mạnh degrade gracefully khi graph hoặc tool không sẵn sàng.</p>
                <p>Giữ các expected outcomes như checklist nói miệng cho hội đồng.</p>
              </div>
            </SectionCard>
          </div>
        }
      >
        <div className="grid gap-4 md:grid-cols-3">
          <StatCard
            label="Profiles"
            value={profiles.length}
            helper="Các persona đang có trong hệ thống"
            icon={<Bot className="h-5 w-5" />}
            tone="primary"
          />
          <StatCard
            label="Demo scenarios"
            value={demos.length}
            helper="Bộ tình huống 1-click hiện tại"
            icon={<Workflow className="h-5 w-5" />}
            tone="teal"
          />
          <StatCard
            label="Feature coverage"
            value={supportedFeatures.length}
            helper="Tổng số feature điều hướng được nhắc tới"
            icon={<ShieldCheck className="h-5 w-5" />}
            tone="neutral"
          />
        </div>

        <SectionCard title="Agent profiles" description="Tóm tắt persona và feature ưa dùng cho từng profile.">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {profiles.map((profile) => (
              <article key={profile.id} className="rounded-[1rem] border border-border/70 bg-background/70 p-5">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-foreground truncate">{profile.name}</div>
                    <div className="mt-1 text-xs text-muted-foreground">{profile.description}</div>
                  </div>
                  <div className="rounded-full bg-secondary px-2 py-1 text-[11px] font-semibold text-foreground">
                    {profile.id}
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {profile.preferredFeatures.map((feature) => (
                    <span key={feature} className="rounded-full bg-secondary px-2 py-0.5 text-[11px] text-foreground">
                      {feature}
                    </span>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </SectionCard>

        <SectionCard
          title="Kịch bản demo 1-click"
          description="Prompt mẫu, điểm kỳ vọng và đường tắt để chuyển thẳng sang chat agent."
          badge={
            <div className="inline-flex items-center gap-2 rounded-full bg-secondary px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5" />
              Demo ready
            </div>
          }
        >
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            {demos.map((demo) => (
              <article key={demo.id} className="rounded-[1rem] border border-border/70 bg-background/70 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-foreground">{demo.title}</div>
                    <div className="mt-1 text-[11px] text-muted-foreground">profile: {demo.profile}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => doCopy(demo.id, demo.prompt)}
                    className="inline-flex items-center gap-2 rounded-xl bg-secondary px-3 py-2 text-xs font-semibold text-foreground hover:bg-accent hover:text-accent-foreground transition"
                  >
                    <Copy className="h-3.5 w-3.5" />
                    {copiedId === demo.id ? "Đã copy" : "Copy"}
                  </button>
                </div>
                <div className="mt-3 rounded-xl border border-border bg-card/60 p-3 text-xs text-foreground whitespace-pre-wrap">
                  {demo.prompt}
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => openChatWithPrompt(demo.prompt)}
                    className="inline-flex items-center gap-2 rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:opacity-90 transition"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    Mở /tu-van (Agent)
                  </button>
                  <Link
                    href="/tu-van"
                    className="inline-flex items-center gap-2 rounded-xl bg-secondary px-3 py-2 text-xs font-semibold text-foreground hover:bg-accent hover:text-accent-foreground transition"
                  >
                    <FileText className="h-3.5 w-3.5" />
                    Xem context
                  </Link>
                </div>
                <div className="mt-3 space-y-2 text-[11px] text-muted-foreground">
                  <div className="font-semibold uppercase tracking-[0.16em] text-foreground/70">Kỳ vọng</div>
                  {demo.expected.map((item) => (
                    <div key={item} className="rounded-lg border border-dashed border-border/70 px-3 py-2">
                      {item}
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>
          <div className="mt-4 text-[11px] text-muted-foreground">
            Gợi ý demo: bật Agent mode → gửi prompt → bấm nút xem context trong chat để trình bày evidence/prompt/runtime.
          </div>
        </SectionCard>
      </PortalShell>
    </div>
  )
}
