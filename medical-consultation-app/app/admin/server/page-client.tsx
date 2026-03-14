"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"

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
    const t = typeof window !== "undefined" ? localStorage.getItem("authToken") : null
    if (!t) window.location.href = "/login"
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
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Quản trị địa chỉ Server</h1>
        <div className="text-sm text-slate-600">Mới nhất: <span className="font-semibold text-primary">{latestUrl || "(chưa có)"}</span></div>
      </div>
      <div className="mt-6 grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2 bg-white rounded-xl border p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Danh sách server</h2>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={autoRefresh} onChange={e => setAutoRefresh(e.target.checked)} />
              Tự làm mới
            </label>
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500">
                  <th className="py-2 pr-4">ID</th>
                  <th className="py-2 pr-4">Tên</th>
                  <th className="py-2 pr-4">URL</th>
                  <th className="py-2 pr-4">Trạng thái</th>
                  <th className="py-2 pr-4">Cập nhật</th>
                  <th className="py-2 pr-4">Kiểm tra</th>
                </tr>
              </thead>
              <tbody>
                {servers.map(s => (
                  <tr key={s.id} className="border-t">
                    <td className="py-2 pr-4 font-mono">{s.id}</td>
                    <td className="py-2 pr-4">{s.name || "-"}</td>
                    <td className="py-2 pr-4"><a href={s.url} className="text-primary hover:underline" target="_blank" rel="noreferrer">{s.url}</a></td>
                    <td className={`py-2 pr-4 ${s.status === 'active' ? 'text-green-600' : s.status === 'inactive' ? 'text-red-600' : 'text-slate-600'}`}>{s.status}</td>
                    <td className="py-2 pr-4">{new Date(s.updated_at).toISOString()}</td>
                    <td className="py-2 pr-4">
                      <button disabled={checkingId === s.id} onClick={() => check(s)} className="inline-flex items-center rounded-md bg-primary text-primary-foreground px-3 py-1.5">
                        {checkingId === s.id ? 'Đang kiểm tra...' : 'Kiểm tra'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="bg-white rounded-xl border p-6">
          <h2 className="font-semibold">Cập nhật URL GPU (Ngrok)</h2>
          <div className="mt-4 space-y-3">
            <input value={form.url} onChange={e => setForm({ url: e.target.value })} placeholder="https://xxx.ngrok-free.dev" className="w-full border rounded-md px-3 py-2" />
            <div className="flex gap-2">
              <button onClick={submit} className="inline-flex items-center rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm">Lưu</button>
            </div>
            <div className="text-xs text-slate-500">API latest: <Link href="/api/servers/latest" className="text-primary hover:underline">/api/servers/latest</Link></div>
          </div>
        </div>
      </div>
      <div className="mt-8 bg-white rounded-xl border p-6">
        <h2 className="font-semibold">Lịch sử thay đổi</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500">
                <th className="py-2 pr-4">Thời gian</th>
                <th className="py-2 pr-4">Loại</th>
                <th className="py-2 pr-4">ID</th>
                <th className="py-2 pr-4">URL</th>
              </tr>
            </thead>
            <tbody>
              {logs.slice().reverse().map((l, i) => (
                <tr key={i} className="border-t">
                  <td className="py-2 pr-4">{new Date(l.ts).toISOString()}</td>
                  <td className="py-2 pr-4">{l.type}</td>
                  <td className="py-2 pr-4 font-mono">{l.id}</td>
                  <td className="py-2 pr-4"><a href={l.url} className="text-primary hover:underline" target="_blank" rel="noreferrer">{l.url}</a></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className="mt-8 bg-white rounded-xl border p-6">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Lịch sử runtime</h2>
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={eventsAutoRefresh} onChange={e => setEventsAutoRefresh(e.target.checked)} />
              Tự làm mới
            </label>
            <button onClick={load} className="inline-flex items-center rounded-md bg-slate-100 px-3 py-1.5 text-sm">Tải lại</button>
            <button disabled={clearing} onClick={clearEvents} className="inline-flex items-center rounded-md bg-red-500 text-white px-3 py-1.5 text-sm">{clearing ? 'Đang xóa...' : 'Xóa log runtime'}</button>
            <button disabled={clearing} onClick={clearAllConversations} className="inline-flex items-center rounded-md bg-red-600 text-white px-3 py-1.5 text-sm">{clearing ? 'Đang xóa...' : 'Xóa tất cả hội thoại'}</button>
          </div>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500">
                <th className="py-2 pr-4">Thời gian</th>
                <th className="py-2 pr-4">Loại</th>
                <th className="py-2 pr-4">Chi tiết</th>
              </tr>
            </thead>
            <tbody>
              {events.slice().reverse().map((ev, i) => (
                <tr key={i} className="border-t">
                  <td className="py-2 pr-4">{new Date(ev.ts).toISOString()}</td>
                  <td className="py-2 pr-4">{ev.type}</td>
                  <td className="py-2 pr-4">
                    {ev.type === 'mode_change' ? (
                      <span>target: {ev.target}{ev.gpu_url ? `, gpu_url: ${ev.gpu_url}` : ''}</span>
                    ) : ev.type === 'fallback' ? (
                      <span>from: {ev.from}, to: {ev.to}</span>
                    ) : (
                      <span>{JSON.stringify(ev)}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
