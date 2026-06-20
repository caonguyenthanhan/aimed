"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { DatabaseZap, RefreshCcw, ServerCog, ShieldCheck, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import PortalShell from "@/components/portal-shell"
import { SectionCard } from "@/components/ui/section-card"
import { StatCard } from "@/components/ui/stat-card"

type ServerItem = {
  id: string
  name?: string
  url: string
  status: "active" | "inactive" | "unknown"
  updated_at: string
}

export default function AdminServerPage() {
  const [servers, setServers] = useState<ServerItem[]>([])
  const [logs, setLogs] = useState<any[]>([])
  const [form, setForm] = useState({ url: "https://elissa-villous-scourgingly.ngrok-free.dev" })
  const [checkingId, setCheckingId] = useState<string | null>(null)
  const [autoRefresh, setAutoRefresh] = useState(false)
  const [events, setEvents] = useState<any[]>([])
  const [eventsAutoRefresh, setEventsAutoRefresh] = useState(false)
  const [clearing, setClearing] = useState(false)

  useEffect(() => {
    const run = async () => {
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
    run()
  }, [])

  const latestUrl = useMemo(() => {
    const active = servers.filter(s => s.status === "active")
    const sorted = (active.length ? active : servers).sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    return sorted[0]?.url || ""
  }, [servers])

  const load = async () => {
    const a = await fetch("/api/servers").then(r => r.json())
    setServers(a?.servers || [])
    const l = await fetch("/api/servers/logs").then(r => r.json())
    setLogs(l?.logs || [])
    const e = await fetch("/api/runtime/events").then(r => r.json())
    setEvents(e?.events || [])
  }

  useEffect(() => { load() }, [])

  useEffect(() => {
    let t: any
    if (autoRefresh) t = setInterval(load, 5000)
    return () => { if (t) clearInterval(t) }
  }, [autoRefresh])

  useEffect(() => {
    let t: any
    if (eventsAutoRefresh) t = setInterval(load, 5000)
    return () => { if (t) clearInterval(t) }
  }, [eventsAutoRefresh])

  const submit = async () => {
    const url = (form.url || "").trim()
    if (!url) return
    const payload = { id: "colab-ngrok", name: "Colab Ngrok", url, status: "active" }
    await fetch("/api/servers", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
    await fetch('/api/runtime/mode', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ target: 'gpu', gpu_url: url }) })
    setForm({ url: "" })
    await load()
  }

  const check = async (s: ServerItem) => {
    setCheckingId(s.id)
    try {
      const r = await fetch("/api/servers/check", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: s.url, timeoutMs: 3000 }) }).then(r => r.json())
      const status = r?.ok ? "active" : "inactive"
      await fetch("/api/servers", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: s.id, name: s.name, url: s.url, status }) })
      await load()
    } finally {
      setCheckingId(null)
    }
  }

  const updateFromColab = async () => {
    const url = (form.url || "").trim()
    if (!url) return
    await fetch("/api/servers/colab-update", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: "colab-ngrok", url }) })
    await load()
  }

  const clearEvents = async () => {
    setClearing(true)
    try {
      await fetch("/api/runtime/events", { method: "DELETE" })
      await load()
    } finally {
      setClearing(false)
    }
  }

  const clearAllConversations = async () => {
    setClearing(true)
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null
      if (token) {
        const list = await fetch('/api/backend/v1/conversations', { headers: { 'Authorization': `Bearer ${token}` } }).then(r => r.json())
        const ids = (list?.conversations || []).map((c: any) => c.id)
        for (const id of ids) {
          await fetch(`/api/backend/v1/conversations/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } })
        }
      }
      if (typeof window !== 'undefined') {
        const keys = Object.keys(localStorage)
        for (const k of keys) {
          if (k.startsWith('conv_messages_') || k.startsWith('conv_title_')) {
            localStorage.removeItem(k)
          }
        }
      }
      await load()
    } finally {
      setClearing(false)
    }
  }

  return (
    <PortalShell
      eyebrow="Admin Runtime"
      title="Quản trị địa chỉ Server"
      description="Màn vận hành cho server registry, GPU URL, logs thay đổi và runtime events. Tất cả action hiện vẫn dùng đúng API admin/runtime cũ."
      actions={
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" className="rounded-xl" onClick={load}>
            <RefreshCcw className="mr-2 h-4 w-4" />
            Tải lại
          </Button>
          <Button variant="outline" className="rounded-xl" asChild>
            <Link href="/api/servers/latest">API latest</Link>
          </Button>
        </div>
      }
      aside={
        <div className="space-y-6">
          <SectionCard title="Cập nhật URL GPU" description="Lưu URL Colab/Ngrok mới và đồng bộ runtime mode sang GPU.">
            <div className="space-y-3">
              <Input value={form.url} onChange={e => setForm({ url: e.target.value })} placeholder="https://xxx.ngrok-free.dev" className="input-glow" />
              <div className="flex flex-wrap gap-3">
                <Button className="rounded-xl" onClick={submit}>Lưu</Button>
                <Button variant="outline" className="rounded-xl" onClick={updateFromColab}>Đồng bộ Colab</Button>
              </div>
            </div>
          </SectionCard>
          <SectionCard title="Danger Zone" description="Các thao tác xóa log/runtime để dọn môi trường demo.">
            <div className="grid gap-3">
              <Button variant="outline" className="justify-start rounded-xl" disabled={clearing} onClick={clearEvents}>
                <Trash2 className="mr-2 h-4 w-4" />
                {clearing ? "Đang xóa..." : "Xóa log runtime"}
              </Button>
              <Button variant="outline" className="justify-start rounded-xl text-destructive" disabled={clearing} onClick={clearAllConversations}>
                <DatabaseZap className="mr-2 h-4 w-4" />
                {clearing ? "Đang xóa..." : "Xóa tất cả hội thoại"}
              </Button>
            </div>
          </SectionCard>
        </div>
      }
    >
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Servers" value={servers.length} helper="Registry hiện có" icon={<ServerCog className="h-5 w-5" />} tone="primary" />
        <StatCard label="Active" value={servers.filter(s => s.status === "active").length} helper="Server hoạt động" icon={<ShieldCheck className="h-5 w-5" />} tone="teal" />
        <StatCard label="Events" value={events.length} helper="Runtime events đã ghi" icon={<RefreshCcw className="h-5 w-5" />} tone="neutral" />
      </div>

      <SectionCard
        title="Danh sách server"
        description={`Mới nhất: ${latestUrl || "(chưa có)"}`}
        badge={
          <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            <input type="checkbox" checked={autoRefresh} onChange={e => setAutoRefresh(e.target.checked)} />
            Auto refresh
          </label>
        }
      >
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="py-2 pr-4">ID</th><th className="py-2 pr-4">Tên</th><th className="py-2 pr-4">URL</th><th className="py-2 pr-4">Trạng thái</th><th className="py-2 pr-4">Cập nhật</th><th className="py-2 pr-4">Kiểm tra</th>
              </tr>
            </thead>
            <tbody>
              {servers.map(s => (
                <tr key={s.id} className="border-b border-border/60">
                  <td className="py-3 pr-4 font-mono">{s.id}</td>
                  <td className="py-3 pr-4">{s.name || "-"}</td>
                  <td className="py-3 pr-4"><a href={s.url} className="text-primary hover:underline" target="_blank" rel="noreferrer">{s.url}</a></td>
                  <td className={`py-3 pr-4 ${s.status === "active" ? "text-teal-accent" : s.status === "inactive" ? "text-destructive" : "text-muted-foreground"}`}>{s.status}</td>
                  <td className="py-3 pr-4">{new Date(s.updated_at).toISOString()}</td>
                  <td className="py-3 pr-4"><Button size="sm" className="rounded-lg" disabled={checkingId === s.id} onClick={() => check(s)}>{checkingId === s.id ? "Đang kiểm tra..." : "Kiểm tra"}</Button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>

      <SectionCard title="Lịch sử thay đổi" description="Các bản ghi add/update của server registry.">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="py-2 pr-4">Thời gian</th><th className="py-2 pr-4">Loại</th><th className="py-2 pr-4">ID</th><th className="py-2 pr-4">URL</th>
              </tr>
            </thead>
            <tbody>
              {logs.slice().reverse().map((l, i) => (
                <tr key={i} className="border-b border-border/60">
                  <td className="py-3 pr-4">{new Date(l.ts).toISOString()}</td>
                  <td className="py-3 pr-4">{l.type}</td>
                  <td className="py-3 pr-4 font-mono">{l.id}</td>
                  <td className="py-3 pr-4"><a href={l.url} className="text-primary hover:underline" target="_blank" rel="noreferrer">{l.url}</a></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>

      <SectionCard
        title="Lịch sử runtime"
        description="Theo dõi mode changes, fallback và các runtime transitions trong app."
        badge={
          <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            <input type="checkbox" checked={eventsAutoRefresh} onChange={e => setEventsAutoRefresh(e.target.checked)} />
            Auto refresh
          </label>
        }
      >
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="py-2 pr-4">Thời gian</th><th className="py-2 pr-4">Loại</th><th className="py-2 pr-4">Chi tiết</th>
              </tr>
            </thead>
            <tbody>
              {events.slice().reverse().map((ev, i) => (
                <tr key={i} className="border-b border-border/60">
                  <td className="py-3 pr-4">{new Date(ev.ts).toISOString()}</td>
                  <td className="py-3 pr-4">{ev.type}</td>
                  <td className="py-3 pr-4">{ev.type === "mode_change" ? `target: ${ev.target}${ev.gpu_url ? `, gpu_url: ${ev.gpu_url}` : ""}` : ev.type === "fallback" ? `from: ${ev.from}, to: ${ev.to}` : JSON.stringify(ev)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </PortalShell>
  )
}
