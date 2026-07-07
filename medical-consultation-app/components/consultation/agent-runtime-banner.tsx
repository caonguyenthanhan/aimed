import { useState } from "react"
import { Activity, BrainCircuit, Cpu, Sparkles, Wrench } from "lucide-react"
import type { SystemState } from "@/lib/runtime-sync"

type AgentStatus = {
  provider?: string
  mode?: string
  agent_profile?: string
  mcp_tool_calls_count?: number
  graph_tool_called?: boolean
}

interface AgentRuntimeBannerProps {
  agentStatus: AgentStatus | null
  systemState: SystemState
  labelAgentProfile: (value?: string | null) => string
}

export function AgentRuntimeBanner({
  agentStatus,
  systemState,
  labelAgentProfile,
}: AgentRuntimeBannerProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const graphLabel = (() => {
    const reason = systemState.graph_reason
    if (systemState.graph_injected) return "bật"
    if (reason === "graph_disabled_no_cpu_url") return "tắt (chưa cấu hình CPU)"
    if (reason === "graph_404") return "lỗi 404"
    if (reason === "graph_timeout") return "timeout"
    if (reason === "graph_empty") return "không có dữ liệu"
    if (reason === "graph_down") return "down"
    if (systemState.graph_connected) return `ok${typeof systemState.graph_latency_ms === "number" ? ` (${systemState.graph_latency_ms}ms)` : ""}`
    if (agentStatus?.graph_tool_called) return "lỗi/tắt"
    return "tắt"
  })()

  const items = [
    {
      label: "Profile",
      value: labelAgentProfile(agentStatus?.agent_profile),
      icon: <Sparkles className="h-3.5 w-3.5" />,
    },
    {
      label: "Mode",
      value: String(agentStatus?.mode || "auto"),
      icon: <Cpu className="h-3.5 w-3.5" />,
    },
    {
      label: "Provider",
      value: String(agentStatus?.provider || "auto"),
      icon: <Activity className="h-3.5 w-3.5" />,
    },
    {
      label: "Graph",
      value: graphLabel,
      icon: <BrainCircuit className="h-3.5 w-3.5" />,
    },
    {
      label: "Tools",
      value: String(agentStatus?.mcp_tool_calls_count ?? 0),
      icon: <Wrench className="h-3.5 w-3.5" />,
    },
  ]

  return (
    <div className="mx-3 mb-2 flex-shrink-0 sm:mx-4 transition-all duration-300">
      <div className="app-surface mx-auto w-full max-w-4xl rounded-[1.25rem] bg-card/85 px-3 py-2 sm:px-4 sm:py-2.5 shadow-md border border-border/40">
        <div className="flex items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="flex items-center gap-1.5 font-bold text-foreground">
              <Activity className="h-3.5 w-3.5 text-primary animate-pulse" />
              AI Runtime
            </span>
            {!isExpanded && (
              <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-muted-foreground bg-secondary/50 px-2 py-0.5 rounded-full">
                <span>Profile: <strong className="text-foreground">{items[0].value}</strong></span>
                <span className="text-muted-foreground/30">•</span>
                <span>Graph: <strong className="text-foreground">{items[3].value}</strong></span>
                <span className="text-muted-foreground/30">•</span>
                <span>Tools: <strong className="text-foreground">{items[4].value}</strong></span>
              </div>
            )}
          </div>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-semibold text-primary transition hover:bg-primary/20 flex items-center gap-1"
          >
            {isExpanded ? "Thu gọn ▴" : "Chi tiết ▾"}
          </button>
        </div>

        {isExpanded && (
          <div className="mt-2.5 pt-2.5 border-t border-border/30 animate-fade-in">
            <div className="mb-2 text-[10px] text-muted-foreground">
              Thông tin runtime giúp theo dõi quá trình định tuyến của Agent, kết nối GraphRAG và số lượng MCP Tools đã gọi.
            </div>
            <div className="grid gap-1.5 grid-cols-2 sm:grid-cols-3 md:grid-cols-5">
              {items.map((item) => (
                <div key={item.label} className="rounded-[0.75rem] bg-secondary/60 px-2 py-1.5">
                  <div className="flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-[0.05em] text-muted-foreground">
                    {item.icon}
                    {item.label}
                  </div>
                  <div className="mt-1 text-xs font-semibold text-foreground truncate">{item.value}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
