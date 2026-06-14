"use client"

import { useEffect, useState } from "react"
import {
  buildSystemState,
  emptySystemState,
  RUNTIME_MODE_EVENT,
  normalizeRuntimeProvider,
  normalizeRuntimeTarget,
  setStoredProvider,
  type SystemState,
} from "@/lib/runtime-sync"

export default function ComputeToggle() {
  const [systemState, setSystemState] = useState<SystemState>(emptySystemState())
  const [gpuUrl, setGpuUrl] = useState<string>('')
  const [summary, setSummary] = useState<{cpu?: number, gpu?: number}>({})
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string>('')
  const provider = normalizeRuntimeProvider(systemState.provider)

  const quickModes = [
    {
      id: 'gpu',
      label: 'GPU',
      provider: 'server' as const,
      target: 'gpu' as const,
      title: 'GPU: chạy qua server GPU/Colab đã đăng ký',
    },
    {
      id: 'gemini',
      label: 'Gemini',
      provider: 'gemini' as const,
      target: 'gpu' as const,
      title: 'Gemini: dùng Gemini API trên cloud',
    },
    {
      id: 'foza',
      label: 'Foza',
      provider: 'foza' as const,
      target: 'gpu' as const,
      title: 'Foza: dùng OpenAI-compatible API trên cloud',
    },
  ]

  const load = async () => {
    try {
      const m = await fetch('/api/runtime/mode', { cache: 'no-store' }).then(r => r.json())
      const nextState = buildSystemState((m as any)?.system_state || {
        provider: m?.provider,
        mode: m?.target,
      })
      setSystemState(nextState)
      setStoredProvider(nextState.provider)
      if (m?.gpu_url) setGpuUrl(m.gpu_url)
      else setGpuUrl('')
      const s = await fetch('/api/runtime/metrics').then(r => r.json())
      setSummary(s?.summary || {})
    } catch {}
  }

  useEffect(() => { load() }, [])
  useEffect(() => {
    const handler = (e: any) => {
      try {
        const detail = e?.detail || {}
        const nextState = buildSystemState((detail as any)?.system_state || {
          provider: detail?.provider,
          mode: detail?.target,
          demo_mode: detail?.demo_mode,
        })
        setSystemState(nextState)
        setStoredProvider(nextState.provider)
        if (typeof detail?.gpu_url === 'string') setGpuUrl(detail.gpu_url)
        if (nextState.mode === 'cpu') setGpuUrl('')
        fetch('/api/runtime/metrics').then(r => r.json()).then(s => setSummary(s?.summary || {})).catch(() => {})
      } catch {}
    }
    if (typeof window !== 'undefined') {
      window.addEventListener(RUNTIME_MODE_EVENT, handler as any)
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener(RUNTIME_MODE_EVENT, handler as any)
      }
    }
  }, [])

  const resolveGpuUrl = async () => {
    if (gpuUrl) return gpuUrl
    const latest = await fetch('/api/servers/latest').then(r => r.json())
    const url = String(latest?.url || '').trim()
    if (!url) throw new Error('Không tìm thấy server GPU')
    const chk = await fetch('/api/servers/check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, timeoutMs: 2000 }),
    }).then(r => r.json())
    if (!chk?.ok) throw new Error('Server GPU không phản hồi')
    return url
  }

  const applyQuickMode = async (nextModeId: 'gpu' | 'gemini' | 'foza') => {
    setError('')
    setBusy(true)
    try {
      const selected = quickModes.find((item) => item.id === nextModeId)
      if (!selected) throw new Error('Chế độ không hợp lệ')
      const nextGpuUrl = selected.id === 'gpu' ? await resolveGpuUrl() : gpuUrl
      const payload = {
        target: selected.target,
        provider: selected.provider,
        ...(nextGpuUrl ? { gpu_url: nextGpuUrl } : {}),
      }
      await fetch('/api/runtime/mode', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      setStoredProvider(selected.provider)
      try {
        const auth = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null
        await fetch('/api/backend/v1/runtime/state', {
          method: 'POST',
          headers: auth ? { 'Content-Type': 'application/json', 'Authorization': `Bearer ${auth}` } : { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      } catch {}
      await load()
    } catch (e: any) {
      setError(e?.message || 'Lỗi chuyển chế độ')
    } finally {
      setBusy(false)
    }
  }

  const mode = normalizeRuntimeTarget(systemState.mode, 'cpu')
  const activeQuickMode = provider === 'gemini' ? 'gemini' : (provider === 'foza' ? 'foza' : 'gpu')
  const perf = `${summary.cpu ? `CPU~${summary.cpu}ms` : ''}${summary.gpu ? ` • GPU~${summary.gpu}ms` : ''}`

  return (
    <div className="flex items-center gap-2">
      <div className="inline-flex items-center rounded-md border border-slate-200 bg-white/70 p-1 dark:border-slate-800 dark:bg-slate-950/60">
        {quickModes.map((item) => {
          const active = item.id === activeQuickMode && mode === 'gpu'
          return (
            <button
              key={item.id}
              title={item.title}
              onClick={() => applyQuickMode(item.id as 'gpu' | 'gemini' | 'foza')}
              disabled={busy}
              className={`rounded px-2.5 py-1 text-sm transition ${active ? 'bg-primary text-primary-foreground' : 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800'}`}
            >
              {busy && active ? 'Đang chuyển...' : item.label}
            </button>
          )
        })}
      </div>
      {mode === 'cpu' ? <div className="text-xs text-amber-600">Đang ở CPU cũ, bấm một trong 3 chế độ để đồng bộ lại.</div> : null}
      {perf ? <div className="text-xs text-slate-500">{perf}</div> : null}
      {error && <div className="text-xs text-red-600">{error}</div>}
    </div>
  )
}
