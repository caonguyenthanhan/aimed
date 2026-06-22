"use client"

import { Activity, BrainCircuit, Cpu, Sparkles, Wrench, AlertTriangle, ArrowRight } from "lucide-react"
import type { SystemState } from "@/lib/runtime-sync"

type AgentStatus = {
  provider?: string
  mode?: string
  agent_profile?: string
  mcp_tool_calls_count?: number
  graph_tool_called?: boolean
  mcp_tool_names?: string[]
}

interface AgentRuntimePanelProps {
  agentStatus: AgentStatus | null
  systemState: SystemState
  labelAgentProfile: (value?: string | null) => string
}

export function AgentRuntimePanel({
  agentStatus,
  systemState,
  labelAgentProfile,
}: AgentRuntimePanelProps) {
  const profileId = String(agentStatus?.agent_profile || "default").trim().toLowerCase()
  
  // Custom colors for different agent profiles
  const profileTheme = (() => {
    switch (profileId) {
      case "triage":
        return { bg: "bg-red-500/10", text: "text-red-500", border: "border-red-500/30", label: "Triage" }
      case "therapy":
        return { bg: "bg-teal-500/10", text: "text-teal-500", border: "border-teal-500/30", label: "Trị liệu" }
      case "medication":
        return { bg: "bg-indigo-500/10", text: "text-indigo-500", border: "border-indigo-500/30", label: "Thuốc" }
      case "care_plan":
        return { bg: "bg-emerald-500/10", text: "text-emerald-500", border: "border-emerald-500/30", label: "Kế hoạch" }
      case "doctor_referral":
        return { bg: "bg-sky-500/10", text: "text-sky-500", border: "border-sky-500/30", label: "Bác sĩ" }
      default:
        return { bg: "bg-violet-500/10", text: "text-violet-500", border: "border-violet-500/30", label: "Tổng quát" }
    }
  })()

  const graphStatus = (() => {
    const reason = systemState.graph_reason
    if (systemState.graph_injected) return { label: "Đã nhúng tri thức", color: "text-emerald-500", state: "active" }
    if (reason === "graph_disabled_no_cpu_url") return { label: "Tắt (thiếu CPU URL)", color: "text-muted-foreground", state: "disabled" }
    if (reason === "graph_404") return { label: "Lỗi kết nối (404)", color: "text-amber-500", state: "error" }
    if (reason === "graph_timeout") return { label: "Timeout", color: "text-amber-500", state: "error" }
    if (reason === "graph_empty") return { label: "Không có dữ liệu", color: "text-muted-foreground", state: "empty" }
    if (reason === "graph_down") return { label: "Graph Offline", color: "text-red-500", state: "down" }
    if (systemState.graph_connected) return { label: `Online${typeof systemState.graph_latency_ms === "number" ? ` (${systemState.graph_latency_ms}ms)` : ""}`, color: "text-emerald-500", state: "active" }
    return { label: "Tắt", color: "text-muted-foreground", state: "disabled" }
  })()

  const providerName = String(agentStatus?.provider || systemState.provider || "auto").toUpperCase()

  return (
    <div className="glass-panel dark:glass-panel-dark flex h-full flex-col overflow-hidden rounded-[1.85rem] border border-border/60 p-5 shadow-[0_28px_80px_-38px_rgba(15,20,25,0.45)]">
      <div className="mb-4 flex items-center justify-between border-b border-border/40 pb-3">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 animate-pulse text-primary" />
          <span className="text-sm font-bold text-foreground">Giám sát AI Agent</span>
        </div>
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
        </span>
      </div>

      {/* Active Profile Card */}
      <div className={`mb-4 rounded-[1.25rem] border p-4 ${profileTheme.bg} ${profileTheme.border}`}>
        <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Active Profile</div>
        <div className="mt-1.5 flex items-center gap-2">
          <Sparkles className={`h-5 w-5 ${profileTheme.text}`} />
          <span className={`text-base font-bold ${profileTheme.text}`}>{labelAgentProfile(agentStatus?.agent_profile)}</span>
        </div>
        <div className="mt-2 text-xs text-muted-foreground leading-relaxed">
          Đang điều phối các hành động tư vấn và gợi ý liên quan đến {profileTheme.label.toLowerCase()}.
        </div>
      </div>

      {/* Runtime details */}
      <div className="flex-1 space-y-4 overflow-y-auto pr-1">
        {/* Status Section */}
        <div className="space-y-2.5">
          <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-foreground/50">Runtime State</div>
          
          <div className="flex items-center justify-between rounded-xl bg-secondary/35 px-3.5 py-2.5">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Cpu className="h-3.5 w-3.5" />
              <span>Chế độ (Mode)</span>
            </div>
            <span className="text-xs font-bold text-foreground capitalize">{String(agentStatus?.mode || systemState.mode || "auto")}</span>
          </div>

          <div className="flex items-center justify-between rounded-xl bg-secondary/35 px-3.5 py-2.5">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Activity className="h-3.5 w-3.5" />
              <span>Provider hiện tại</span>
            </div>
            <span className="text-xs font-bold text-primary">{providerName}</span>
          </div>

          <div className="flex items-center justify-between rounded-xl bg-secondary/35 px-3.5 py-2.5">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <BrainCircuit className="h-3.5 w-3.5" />
              <span>Tri thức Graph</span>
            </div>
            <span className={`text-xs font-bold ${graphStatus.color}`}>{graphStatus.label}</span>
          </div>

          <div className="flex items-center justify-between rounded-xl bg-secondary/35 px-3.5 py-2.5">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Wrench className="h-3.5 w-3.5" />
              <span>MCP Tools đã gọi</span>
            </div>
            <span className="text-xs font-bold text-foreground">{String(agentStatus?.mcp_tool_calls_count ?? 0)}</span>
          </div>
        </div>

        {/* Fallback Chain Timeline */}
        <div className="space-y-3 pt-2">
          <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-foreground/50">Fallback Chain</div>
          <div className="relative border-l-2 border-border/60 pl-4 ml-2 space-y-4 py-1">
            {/* Step 1: Foza */}
            <div className="relative">
              <div className={`absolute -left-[21px] top-1 flex h-2.5 w-2.5 items-center justify-center rounded-full border ${
                providerName === "FOZA" ? "bg-primary border-primary animate-pulse" : "bg-background border-border/80"
              }`} />
              <div className="text-xs font-semibold text-foreground">Foza API (GPU)</div>
              <div className="text-[10px] text-muted-foreground">Mô hình GPT-5.5 (Chính)</div>
            </div>

            {/* Step 2: Gemini */}
            <div className="relative">
              <div className={`absolute -left-[21px] top-1 flex h-2.5 w-2.5 items-center justify-center rounded-full border ${
                providerName === "GEMINI" ? "bg-primary border-primary animate-pulse" : "bg-background border-border/80"
              }`} />
              <div className="text-xs font-semibold text-foreground">Gemini API (Cloud)</div>
              <div className="text-[10px] text-muted-foreground">Fallback 1 (Dự phòng đám mây)</div>
            </div>

            {/* Step 3: Local CPU */}
            <div className="relative">
              <div className={`absolute -left-[21px] top-1 flex h-2.5 w-2.5 items-center justify-center rounded-full border ${
                providerName === "OPENAI_LIKE" || providerName === "SERVER" ? "bg-primary border-primary animate-pulse" : "bg-background border-border/80"
              }`} />
              <div className="text-xs font-semibold text-foreground">CPU Server (Local)</div>
              <div className="text-[10px] text-muted-foreground">Fallback 2 (Dự phòng cục bộ)</div>
            </div>
          </div>
        </div>

        {/* Tool Log List */}
        {agentStatus?.mcp_tool_names && agentStatus.mcp_tool_names.length > 0 && (
          <div className="space-y-2 pt-2">
            <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-foreground/50">Lịch sử Gọi Tools</div>
            <div className="max-h-[120px] overflow-y-auto space-y-1.5 pr-1 custom-scrollbar">
              {agentStatus.mcp_tool_names.map((name, idx) => (
                <div key={`${name}-${idx}`} className="flex items-center gap-1.5 rounded-lg border border-border/40 bg-secondary/15 px-2 py-1 text-[11px] font-mono text-muted-foreground">
                  <ArrowRight className="h-3 w-3 text-primary flex-shrink-0" />
                  <span className="truncate">{name}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Diagnostic errors */}
        {(systemState.error || systemState.fallback) && (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-600 dark:text-amber-400">
            <div className="flex items-center gap-1.5 font-semibold">
              <AlertTriangle className="h-3.5 w-3.5" />
              <span>Chẩn đoán & Fallback</span>
            </div>
            <div className="mt-1 text-[11px] leading-relaxed">
              {systemState.fallback && <div>• Trạng thái: Fallback do {systemState.fallback}</div>}
              {systemState.error && <div className="mt-0.5 truncate">• Lỗi: {systemState.error}</div>}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
