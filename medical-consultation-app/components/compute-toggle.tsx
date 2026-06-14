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

  const switchMode = async () => {
    setError('')
    setBusy(true)
    try {
      const provider = systemState.provider
      const mode = systemState.mode
      const nextProvider = provider === 'gemini' && mode === 'cpu' ? 'server' : provider
      if (mode === 'cpu') {
        const latest = await fetch('/api/servers/latest').then(r => r.json())
        const url = latest?.url || ''
        if (!url) throw new Error('Không tìm thấy server GPU')
        const chk = await fetch('/api/servers/check', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url, timeoutMs: 2000 }) }).then(r => r.json())
        if (!chk?.ok) throw new Error('Server GPU không phản hồi')
        await fetch('/api/runtime/mode', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ target: 'gpu', gpu_url: url, provider: nextProvider }) })
        try {
          const auth = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null
          await fetch('/api/backend/v1/runtime/state', { method: 'POST', headers: auth ? { 'Content-Type': 'application/json', 'Authorization': `Bearer ${auth}` } : { 'Content-Type': 'application/json' }, body: JSON.stringify({ target: 'gpu', gpu_url: url }) })
        } catch {}
      } else {
        await fetch('/api/runtime/mode', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ target: 'cpu', provider: nextProvider }) })
        try {
          const auth = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null
          await fetch('/api/backend/v1/runtime/state', { method: 'POST', headers: auth ? { 'Content-Type': 'application/json', 'Authorization': `Bearer ${auth}` } : { 'Content-Type': 'application/json' }, body: JSON.stringify({ target: 'cpu' }) })
        } catch {}
      }
      await load()
    } catch (e: any) {
      setError(e?.message || 'Lỗi chuyển chế độ')
    } finally {
      setBusy(false)
    }
  }

  const switchProvider = async () => {
    setError('')
    setBusy(true)
    try {
      const provider = systemState.provider
      const mode = systemState.mode
      const nextProvider = provider === 'server' ? 'gemini' : (provider === 'gemini' ? 'foza' : 'server')
      const nextTarget = nextProvider === 'server' ? mode : 'gpu'
      const payload = { target: nextTarget, provider: nextProvider, ...(nextTarget === 'gpu' && gpuUrl ? { gpu_url: gpuUrl } : {}) }
      await fetch('/api/runtime/mode', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      setStoredProvider(nextProvider)
      await load()
    } catch (e: any) {
      setError(e?.message || 'Lỗi chuyển chế độ')
    } finally {
      setBusy(false)
    }
  }

  const mode = normalizeRuntimeTarget(systemState.mode, 'cpu')
  const provider = normalizeRuntimeProvider(systemState.provider)
  const label = provider === 'gemini' ? 'API' : (provider === 'foza' ? 'FOZA' : (mode === 'cpu' ? 'CPU' : 'GPU'))
  const tooltip = provider === 'gemini'
    ? 'API: dùng Gemini (cần GEMINI_API_KEY), phù hợp test nhanh trên Vercel'
    : (provider === 'foza'
      ? 'FOZA: OpenAI-compatible API (cần FOZA_TOKEN), phù hợp làm provider cloud'
      : (mode === 'cpu' ? 'CPU: chạy mô hình GGUF nội bộ, ổn định hơn nhưng chậm hơn' : 'GPU: chạy trên Colab/Ngrok, nhanh hơn nhưng phụ thuộc kết nối'))
  const perf = `${summary.cpu ? `CPU~${summary.cpu}ms` : ''}${summary.gpu ? ` • GPU~${summary.gpu}ms` : ''}`

  return (
    <div className="flex items-center gap-2">
      <button title={tooltip} onClick={switchMode} disabled={busy} className={`px-3 py-1.5 rounded-md text-sm ${mode === 'gpu' ? 'bg-accent text-white' : 'bg-primary text-primary-foreground'}`}>
        {busy ? 'Đang chuyển...' : label}
      </button>
      <button title="Chuyển nhà cung cấp (Server/Gemini)" onClick={switchProvider} disabled={busy} className="px-2 py-1.5 rounded-md text-sm bg-slate-100 text-slate-700 hover:bg-slate-200">
        {provider === 'gemini' ? 'Gemini' : (provider === 'foza' ? 'Foza' : 'Server')}
      </button>
      {error && <div className="text-xs text-red-600">{error}</div>}
    </div>
  )
}
