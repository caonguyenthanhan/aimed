'use client'

import { useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Copy, ExternalLink, FileText, Sparkles } from "lucide-react"
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
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Agent Hub</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Giới thiệu agent profiles, tool hỗ trợ và kịch bản demo 1-click để trình bày với hội đồng.
            </p>
          </div>
          <Link
            href="/tu-van"
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 transition"
          >
            <ExternalLink className="h-4 w-4" />
            Mở Chat
          </Link>
        </div>

        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
          {profiles.map((p) => (
            <div key={p.id} className="rounded-2xl border border-border bg-card/70 backdrop-blur-sm p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-bold text-foreground truncate">{p.name}</div>
                  <div className="mt-1 text-xs text-muted-foreground">{p.description}</div>
                </div>
                <div className="px-2 py-1 rounded-full bg-secondary text-[11px] font-semibold text-foreground">
                  {p.id}
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {p.preferredFeatures.map((f) => (
                  <span key={f} className="px-2 py-0.5 rounded-full bg-secondary text-[11px] text-foreground">
                    {f}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-10 rounded-2xl border border-border bg-card/70 backdrop-blur-sm p-4">
          <div className="flex items-center gap-2 text-sm font-bold text-foreground">
            <Sparkles className="h-4 w-4" />
            Kịch bản demo 1-click
          </div>
          <div className="mt-3 grid grid-cols-1 lg:grid-cols-2 gap-3">
            {demos.map((d) => (
              <div key={d.id} className="rounded-2xl border border-border bg-background/60 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-foreground">{d.title}</div>
                    <div className="mt-1 text-[11px] text-muted-foreground">profile: {d.profile}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => doCopy(d.id, d.prompt)}
                    className="inline-flex items-center gap-2 rounded-xl bg-secondary px-3 py-2 text-xs font-semibold text-foreground hover:bg-accent hover:text-accent-foreground transition"
                  >
                    <Copy className="h-3.5 w-3.5" />
                    {copiedId === d.id ? "Đã copy" : "Copy"}
                  </button>
                </div>
                <div className="mt-3 rounded-xl border border-border bg-card/60 p-3 text-xs text-foreground whitespace-pre-wrap">
                  {d.prompt}
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => openChatWithPrompt(d.prompt)}
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
                <div className="mt-3 text-[11px] text-muted-foreground">
                  Kỳ vọng:
                  <ul className="list-disc ml-5 mt-1 space-y-0.5">
                    {d.expected.map((x) => (
                      <li key={x}>{x}</li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 text-[11px] text-muted-foreground">
            Gợi ý demo: bật Agent mode → gửi prompt → bấm nút xem context trong chat để trình bày evidence/prompt/runtime.
          </div>
        </div>
      </div>
    </div>
  )
}

