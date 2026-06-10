/**
 * System monitoring dashboard — reads from runtime-metrics.jsonl and runtime-errors.jsonl.
 * Route: /api/runtime/monitor
 * WHY: gives doctors a real-time view of system health, latency, and errors
 * without requiring external tools or admin access.
 */
import fs from "fs"
import path from "path"

const METRICS_PATH = path.join(process.cwd(), "data", "runtime-metrics.jsonl")
const ERRORS_PATH = path.join(process.cwd(), "data", "runtime-errors.jsonl")

function readJSONL(filePath: string) {
  if (!fs.existsSync(filePath)) return []
  const raw = fs.readFileSync(filePath, "utf-8")
  return raw.split("\n").filter(Boolean).map((l) => {
    try { return JSON.parse(l) } catch { return null }
  }).filter(Boolean)
}

function pct(arr: number[], p: number) {
  if (!arr?.length) return 0
  const s = [...arr].sort((a, b) => a - b)
  return s[Math.floor(s.length * p / 100)] || 0
}

function mean(arr: number[]) {
  if (!arr?.length) return 0
  return arr.reduce((a, b) => a + b, 0) / arr.length
}

export const dynamic = "force-dynamic"

export default async function MonitorPage() {
  const metrics = readJSONL(METRICS_PATH)
  const errors = readJSONL(ERRORS_PATH)

  const durations = metrics.map((m: any) => m.duration_ms).filter(Boolean) as number[]
  const cpuDurations = metrics.filter((m: any) => m.mode === "cpu").map((m: any) => m.duration_ms).filter(Boolean) as number[]
  const gpuDurations = metrics.filter((m: any) => m.mode === "gpu").map((m: any) => m.duration_ms).filter(Boolean) as number[]

  const p95 = pct(durations, 95)
  const avg = mean(durations)
  const errCount = errors.filter((e: any) => e.level === "error").length
  const warnCount = errors.filter((e: any) => e.level === "warning").length
  const errRate = errors.length ? ((errCount / errors.length) * 100).toFixed(1) : "0"

  const recentErrors = errors.slice(-20).reverse()

  return (
    <div style={{ padding: "24px", maxWidth: "1200px", margin: "0 auto", fontFamily: "system-ui, sans-serif", color: "#e2e8f0", background: "#0f172a", minHeight: "100vh" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
        <h1 style={{ fontSize: "20px", fontWeight: 600 }}>AIMed System Monitor</h1>
        <span style={{
          display: "inline-flex", alignItems: "center", gap: "6px",
          padding: "4px 12px", borderRadius: "20px", fontSize: "12px",
          background: parseFloat(errRate) === 0 ? "rgba(34,197,94,.15)" : "rgba(245,158,11,.15)",
          border: `1px solid ${parseFloat(errRate) === 0 ? "rgba(34,197,94,.3)" : "rgba(245,158,11,.3)"}`,
          color: parseFloat(errRate) === 0 ? "#22c55e" : "#f59e0b"
        }}>
          {parseFloat(errRate) === 0 ? "All systems normal" : `Error rate ${errRate}%`}
        </span>
      </div>

      {/* Stats Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px", marginBottom: "24px" }}>
        {[
          { label: "Total Events", value: errors.length, sub: `${errCount} errors, ${warnCount} warnings` },
          { label: "Error Rate", value: `${errRate}%`, sub: `${errCount} / ${errors.length} events` },
          { label: "Latency p95", value: `${Math.round(p95)}ms`, sub: `avg: ${Math.round(avg)}ms` },
          { label: "Requests", value: metrics.length, sub: `cpu: ${cpuDurations.length} / gpu: ${gpuDurations.length}` },
        ].map((s) => (
          <div key={s.label} style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: "12px", padding: "20px" }}>
            <div style={{ fontSize: "12px", color: "#94a3b8", marginBottom: "8px", textTransform: "uppercase", letterSpacing: ".05em" }}>{s.label}</div>
            <div style={{ fontSize: "28px", fontWeight: 700 }}>{s.value}</div>
            <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "4px" }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Latency Table */}
      <div style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: "12px", marginBottom: "24px", overflow: "hidden" }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid #334155", fontSize: "14px", fontWeight: 600 }}>Latency by Mode</div>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
          <thead>
            <tr>
              {["Mode", "Count", "p50", "p95", "p99", "Avg"].map((h) => (
                <th key={h} style={{ padding: "10px 16px", textAlign: "left", color: "#94a3b8", fontWeight: 500, fontSize: "11px", textTransform: "uppercase", borderBottom: "1px solid #334155", background: "rgba(0,0,0,.2)" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[
              { mode: "cpu", durations: cpuDurations, limit: 1500 },
              { mode: "gpu", durations: gpuDurations, limit: 3000 },
            ].map(({ mode, durations: d, limit }) => {
              if (!d.length) return (
                <tr key={mode}>
                  <td style={{ padding: "10px 16px" }}>
                    <span style={{ padding: "2px 8px", borderRadius: "4px", fontSize: "11px", background: mode === "cpu" ? "rgba(59,130,246,.15)" : "rgba(139,92,246,.15)", color: mode === "cpu" ? "#3b82f6" : "#a78bfa" }}>{mode}</span>
                  </td>
                  <td colSpan={5} style={{ padding: "10px 16px", color: "#94a3b8" }}>No data</td>
                </tr>
              )
              const p50 = pct(d, 50), p95 = pct(d, 95), p99 = pct(d, 99), avgM = mean(d)
              const barPct = Math.min(100, (p95 / limit) * 100)
              const barColor = barPct > 80 ? (barPct > 95 ? "#ef4444" : "#f59e0b") : "#22c55e"
              return (
                <tr key={mode}>
                  <td style={{ padding: "10px 16px" }}>
                    <span style={{ padding: "2px 8px", borderRadius: "4px", fontSize: "11px", background: mode === "cpu" ? "rgba(59,130,246,.15)" : "rgba(139,92,246,.15)", color: mode === "cpu" ? "#3b82f6" : "#a78bfa" }}>{mode}</span>
                  </td>
                  <td style={{ padding: "10px 16px" }}>{d.length}</td>
                  <td style={{ padding: "10px 16px", fontFamily: "monospace" }}>{Math.round(p50)}ms</td>
                  <td style={{ padding: "10px 16px", fontFamily: "monospace" }}>{Math.round(p95)}ms</td>
                  <td style={{ padding: "10px 16px", fontFamily: "monospace" }}>{Math.round(p99)}ms</td>
                  <td style={{ padding: "10px 16px", fontFamily: "monospace" }}>{Math.round(avgM)}ms</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Recent Events */}
      <div style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: "12px", overflow: "hidden" }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid #334155", fontSize: "14px", fontWeight: 600 }}>Recent Events (last 20)</div>
        {recentErrors.length === 0 ? (
          <div style={{ padding: "40px", textAlign: "center", color: "#94a3b8" }}>No events recorded yet.</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
            <thead>
              <tr>
                {["Time", "Level", "Message", "Route", "Mode"].map((h) => (
                  <th key={h} style={{ padding: "10px 16px", textAlign: "left", color: "#94a3b8", fontWeight: 500, fontSize: "11px", textTransform: "uppercase", borderBottom: "1px solid #334155", background: "rgba(0,0,0,.2)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recentErrors.map((e: any, i: number) => (
                <tr key={i} style={{ borderBottom: "1px solid rgba(255,255,255,.04)" }}>
                  <td style={{ padding: "10px 16px", fontFamily: "monospace", fontSize: "12px" }}>
                    {new Date(e.timestamp).toLocaleTimeString()}
                  </td>
                  <td style={{ padding: "10px 16px" }}>
                    <span style={{
                      padding: "2px 8px", borderRadius: "4px", fontSize: "11px",
                      background: e.level === "error" ? "rgba(239,68,68,.15)" : "rgba(245,158,11,.15)",
                      color: e.level === "error" ? "#ef4444" : "#f59e0b"
                    }}>{e.level}</span>
                  </td>
                  <td style={{ padding: "10px 16px", maxWidth: "400px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {e.message}
                  </td>
                  <td style={{ padding: "10px 16px", fontFamily: "monospace", fontSize: "12px" }}>{e.route || "-"}</td>
                  <td style={{ padding: "10px 16px" }}>
                    <span style={{
                      padding: "2px 8px", borderRadius: "4px", fontSize: "11px",
                      background: e.mode === "gpu" ? "rgba(139,92,246,.15)" : "rgba(59,130,246,.15)",
                      color: e.mode === "gpu" ? "#a78bfa" : "#3b82f6"
                    }}>{e.mode || "-"}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
