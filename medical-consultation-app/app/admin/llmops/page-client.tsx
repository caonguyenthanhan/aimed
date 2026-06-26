"use client"

import { useEffect, useState } from "react"
import { Activity, Clock, Compass, ExternalLink, RefreshCcw, ShieldCheck, Zap } from "lucide-react"
import PortalShell from "@/components/portal-shell"
import { SectionCard } from "@/components/ui/section-card"
import { StatCard } from "@/components/ui/stat-card"
import { Button } from "@/components/ui/button"

type NodeStat = {
  count: number
  avg_latency_ms: number
  max_latency_ms: number
}

type MetricsData = {
  request_count: number
  avg_latency_ms: number
  min_latency_ms: number
  max_latency_ms: number
  p95_latency_ms: number
  node_stats: Record<string, NodeStat>
}

type TraceStep = {
  node: string
  started_at: string
  ended_at: string | null
  elapsed_ms: number | null
  error: string | null
  status: "running" | "completed" | "failed"
}

type TraceItem = {
  conversation_id: string
  started_at: string
  ended_at: string | null
  steps: TraceStep[]
  status: "running" | "completed" | "failed"
  langsmith_run_id: string | null
}

export default function AdminLLMOpsPage() {
  const [metrics, setMetrics] = useState<MetricsData | null>(null)
  const [traces, setTraces] = useState<TraceItem[]>([])
  const [loading, setLoading] = useState(false)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [selectedTrace, setSelectedTrace] = useState<TraceItem | null>(null)

  // Auth role validation
  useEffect(() => {
    const checkAuth = async () => {
      const t = typeof window !== "undefined" ? localStorage.getItem("authToken") : null
      if (!t) {
        window.location.href = "/login"
        return
      }
      try {
        const r = await fetch("/api/backend/v1/user", { headers: { Authorization: `Bearer ${t}` } })
        if (!r.ok) {
          window.location.href = "/login"
          return
        }
        const u = await r.json()
        const role = String(u?.role || "").toUpperCase()
        if (role !== "ADMIN") {
          window.location.href = "/"
          return
        }
      } catch {
        window.location.href = "/login"
      }
    }
    checkAuth()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [mRes, tRes] = await Promise.all([
        fetch("/api/llmops/metrics").then(r => r.ok ? r.json() : null),
        fetch("/api/llmops/traces").then(r => r.ok ? r.json() : null)
      ])
      if (mRes) setMetrics(mRes)
      if (tRes) setTraces(tRes.traces || [])
    } catch (err) {
      console.error("Failed to fetch telemetry data:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    let t: any
    if (autoRefresh) {
      t = setInterval(loadData, 3000)
    }
    return () => {
      if (t) clearInterval(t)
    }
  }, [autoRefresh])

  const getNodeColor = (nodeName: string) => {
    const lower = nodeName.toLowerCase()
    if (lower.includes("route")) return "bg-blue-500/10 text-blue-400 border-blue-500/20"
    if (lower.includes("tools")) return "bg-amber-500/10 text-amber-400 border-amber-500/20"
    if (lower.includes("supervisor")) return "bg-purple-500/10 text-purple-400 border-purple-500/20"
    return "bg-teal-500/10 text-teal-400 border-teal-500/20"
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Completed</span>
      case "failed":
        return <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20">Failed</span>
      default:
        return <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 animate-pulse">Running</span>
    }
  }

  return (
    <PortalShell
      eyebrow="Admin LLMOps"
      title="Giám sát Agent Telemetry"
      description="Theo dõi trực tiếp Chain-of-Thought từ LangGraph, vết traces LangSmith, và các metrics thời gian phản hồi thực tế."
      actions={
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary select-none cursor-pointer">
            <input
              type="checkbox"
              className="rounded border-border bg-background text-primary focus:ring-primary"
              checked={autoRefresh}
              onChange={e => setAutoRefresh(e.target.checked)}
            />
            Live update
          </label>
          <Button variant="outline" className="rounded-xl" onClick={loadData} disabled={loading}>
            <RefreshCcw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Làm mới
          </Button>
        </div>
      }
      aside={
        <div className="space-y-6">
          {selectedTrace ? (
            <SectionCard title="Chi tiết Trace" description="Chi tiết bước chạy LangGraph của cuộc hội thoại được chọn.">
              <div className="space-y-4">
                <div>
                  <label className="text-xs text-muted-foreground block font-mono">CONVERSATION ID</label>
                  <span className="text-sm font-mono break-all">{selectedTrace.conversation_id}</span>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block font-mono">STARTED AT</label>
                  <span className="text-sm">{new Date(selectedTrace.started_at).toLocaleString("vi-VN")}</span>
                </div>
                {selectedTrace.langsmith_run_id && (
                  <div>
                    <label className="text-xs text-muted-foreground block font-mono mb-1">LANGSMITH LINK</label>
                    <a
                      href={`https://smith.langchain.com/o/default/projects/p/aimed-medical-consulting/runs/${selectedTrace.langsmith_run_id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
                    >
                      Xem Trace trong LangSmith
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                )}
                
                <div className="border-t border-border/60 pt-4">
                  <h4 className="text-sm font-semibold mb-3">Sơ đồ Chain-of-Thought</h4>
                  <div className="relative border-l border-border/80 pl-4 ml-2 space-y-4">
                    {selectedTrace.steps.map((step, idx) => (
                      <div key={idx} className="relative">
                        {/* Dot indicator */}
                        <div className={`absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full border bg-background ${step.status === "completed" ? "border-emerald-400" : step.status === "failed" ? "border-rose-500" : "border-blue-400 animate-ping"}`} />
                        
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-mono font-bold uppercase tracking-wider">{step.node}</span>
                            {step.elapsed_ms !== null && (
                              <span className="text-xs text-muted-foreground">{step.elapsed_ms}ms</span>
                            )}
                          </div>
                          {step.error && (
                            <p className="text-xs text-rose-400 bg-rose-500/5 border border-rose-500/10 p-2 rounded-lg font-mono whitespace-pre-wrap">
                              {step.error}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </SectionCard>
          ) : (
            <SectionCard title="Chọn Trace" description="Hãy chọn một hội thoại từ danh sách bên phải để xem sơ đồ Chain-of-Thought chi tiết.">
              <div className="text-center py-8 text-muted-foreground text-sm">
                Chưa có hội thoại nào được chọn.
              </div>
            </SectionCard>
          )}
        </div>
      }
    >
      {/* Metrics Row */}
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard
          label="Tổng Lượt Gọi"
          value={metrics?.request_count ?? 0}
          helper="Lượt request ghi nhận"
          icon={<Activity className="h-5 w-5" />}
          tone="primary"
        />
        <StatCard
          label="Độ Trễ Trung Bình"
          value={metrics?.avg_latency_ms ? `${metrics.avg_latency_ms} ms` : "0 ms"}
          helper="Độ trễ trung bình toàn phần"
          icon={<Clock className="h-5 w-5" />}
          tone="teal"
        />
        <StatCard
          label="Độ Trễ P95"
          value={metrics?.p95_latency_ms ? `${metrics.p95_latency_ms} ms` : "0 ms"}
          helper="95% request nhanh hơn mức này"
          icon={<Zap className="h-5 w-5" />}
          tone="teal"
        />
        <StatCard
          label="LangSmith Project"
          value="Active"
          helper="aimed-medical-consulting"
          icon={<ShieldCheck className="h-5 w-5" />}
          tone="neutral"
        />
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Node Latencies breakdown */}
        <div className="md:col-span-1">
          <SectionCard title="Độ Trễ Từng Node" description="Thống kê hiệu năng chi tiết của các node trong LangGraph.">
            <div className="space-y-4">
              {metrics && Object.keys(metrics.node_stats).length > 0 ? (
                Object.entries(metrics.node_stats).map(([nodeName, stat]) => (
                  <div key={nodeName} className="p-3 rounded-xl border border-border/40 bg-background/50 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className={`px-2 py-0.5 text-xs font-mono rounded-md border ${getNodeColor(nodeName)}`}>
                        {nodeName}
                      </span>
                      <span className="text-xs text-muted-foreground">Called: {stat.count}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-muted-foreground block">AVG LATENCY</span>
                        <span className="font-semibold text-foreground">{stat.avg_latency_ms}ms</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block">MAX LATENCY</span>
                        <span className="font-semibold text-foreground">{stat.max_latency_ms}ms</span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  Chưa có dữ liệu thống kê node.
                </div>
              )}
            </div>
          </SectionCard>
        </div>

        {/* Traces Log list */}
        <div className="md:col-span-2">
          <SectionCard title="Lịch Sử Traces" description="Danh sách các LangGraph execution runs gần đây nhất.">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="py-2 pr-4 font-semibold">Thời Gian</th>
                    <th className="py-2 pr-4 font-semibold">Conversation ID</th>
                    <th className="py-2 pr-4 font-semibold">Trạng Thái</th>
                    <th className="py-2 pr-4 font-semibold">Chain-of-Thought Path</th>
                    <th className="py-2 pr-4 font-semibold text-right">Hành Động</th>
                  </tr>
                </thead>
                <tbody>
                  {traces.length > 0 ? (
                    traces.map((trace, idx) => {
                      const path = trace.steps.map(s => s.node).join(" → ")
                      const isSelected = selectedTrace?.conversation_id === trace.conversation_id
                      return (
                        <tr
                          key={idx}
                          className={`border-b border-border/60 transition-colors hover:bg-muted/30 cursor-pointer ${isSelected ? "bg-primary/5" : ""}`}
                          onClick={() => setSelectedTrace(trace)}
                        >
                          <td className="py-3 pr-4 whitespace-nowrap text-xs text-muted-foreground">
                            {new Date(trace.started_at).toLocaleString("vi-VN")}
                          </td>
                          <td className="py-3 pr-4 font-mono text-xs max-w-[120px] truncate">
                            {trace.conversation_id}
                          </td>
                          <td className="py-3 pr-4">
                            {getStatusBadge(trace.status)}
                          </td>
                          <td className="py-3 pr-4 text-xs font-mono text-muted-foreground max-w-[200px] truncate" title={path}>
                            {path || "-"}
                          </td>
                          <td className="py-3 pr-4 text-right">
                            <Button size="sm" variant="ghost" className="rounded-lg h-7 text-xs">
                              Chi tiết
                            </Button>
                          </td>
                        </tr>
                      )
                    })
                  ) : (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-muted-foreground text-sm">
                        Chưa có lịch sử runs. Hãy bắt đầu chat để ghi nhận logs.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </SectionCard>
        </div>
      </div>
    </PortalShell>
  )
}
