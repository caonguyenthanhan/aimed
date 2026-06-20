"use client"

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
      icon: <Sparkles className="h-4 w-4" />,
    },
    {
      label: "Mode",
      value: String(agentStatus?.mode || "auto"),
      icon: <Cpu className="h-4 w-4" />,
    },
    {
      label: "Provider",
      value: String(agentStatus?.provider || "auto"),
      icon: <Activity className="h-4 w-4" />,
    },
    {
      label: "Graph",
      value: graphLabel,
      icon: <BrainCircuit className="h-4 w-4" />,
    },
    {
      label: "Tools",
      value: String(agentStatus?.mcp_tool_calls_count ?? 0),
      icon: <Wrench className="h-4 w-4" />,
    },
  ]

  return (
    <div className="mx-3 mb-3 flex-shrink-0 sm:mx-4">
      <div className="app-surface mx-auto w-full max-w-4xl rounded-[1.5rem] bg-card/85 px-4 py-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-foreground">Trợ lý AI Agent</div>
            <div className="mt-1 text-xs text-muted-foreground">
              Trạng thái runtime, profile và graph được hiển thị trực tiếp để theo dõi fallback/reasoning.
            </div>
          </div>
          <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
            Runtime visible
          </span>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
          {items.map((item) => (
            <div key={item.label} className="rounded-[1rem] bg-secondary/70 px-3 py-3">
              <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                {item.icon}
                {item.label}
              </div>
              <div className="mt-2 text-sm font-semibold text-foreground">{item.value}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
