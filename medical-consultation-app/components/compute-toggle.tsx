"use client"

import { useEffect, useState } from "react"

export default function ComputeToggle() {
  const [mode, setMode] = useState<'cpu'|'gpu'>('cpu')
  const [provider, setProvider] = useState<'server'|'gemini'>('server')
  const [gpuUrl, setGpuUrl] = useState<string>('')
  const [summary, setSummary] = useState<{cpu?: number, gpu?: number}>({})
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string>('')

  const load = async () => {
    try {
      try {
        const p = typeof window !== 'undefined' ? localStorage.getItem('llm_provider') : null
        if (p === 'gemini') {
          setProvider('gemini')
          setMode('gpu')
        } else if (p === 'server') {
          setProvider('server')
        }
      } catch {}
      let auth: string | null = null
      if (typeof window !== 'undefined') auth = localStorage.getItem('authToken')
      let m: any = null
      try {
        const url = '/api/backend/v1/runtime/state'
        const resp = await fetch(url, { headers: auth ? { 'Authorization': `Bearer ${auth}` } : undefined })
        if (resp.ok) m = await resp.json()
      } catch {}
      if (!m) m = await fetch('/api/runtime/mode').then(r => r.json())
      if (m?.target) setMode(m.target)
      if (m?.gpu_url) setGpuUrl(m.gpu_url)
      const s = await fetch('/api/runtime/metrics').then(r => r.json())
      setSummary(s?.summary || {})
    } catch {}
  }

  useEffect(() => { load() }, [])
  useEffect(() => {
    const handler = (e: any) => {
      try {
        const detail = e?.detail || {}
        if (detail?.provider === 'gemini') {
          setProvider('gemini')
          setMode('gpu')
          try { if (typeof window !== 'undefined') localStorage.setItem('llm_provider', 'gemini') } catch {}
          return
        }
        if (detail?.provider === 'server') {
          setProvider('server')
          try { if (typeof window !== 'undefined') localStorage.setItem('llm_provider', 'server') } catch {}
        }
        if (detail?.target === 'gpu') {
          setMode('gpu')
          if (typeof detail?.gpu_url === 'string') setGpuUrl(detail.gpu_url)
          fetch('/api/runtime/metrics').then(r => r.json()).then(s => setSummary(s?.summary || {})).catch(() => {})
        } else if (detail?.target === 'cpu') {
          setMode('cpu')
          setGpuUrl('')
          fetch('/api/runtime/metrics').then(r => r.json()).then(s => setSummary(s?.summary || {})).catch(() => {})
        }
      } catch {}
    }
    if (typeof window !== 'undefined') {
      window.addEventListener('runtime_mode_changed', handler as any)
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('runtime_mode_changed', handler as any)
      }
    }
  }, [])

  const switchMode = async () => {
    setError('')
    setBusy(true)
    try {
      if (provider === 'gemini') {
        setProvider('server')
        try { if (typeof window !== 'undefined') localStorage.setItem('llm_provider', 'server') } catch {}
      }
      if (mode === 'cpu') {
        const latest = await fetch('/api/servers/latest').then(r => r.json())
        const url = latest?.url || ''
        if (!url) throw new Error('Không tìm thấy server GPU')
        const chk = await fetch('/api/servers/check', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url, timeoutMs: 2000 }) }).then(r => r.json())
        if (!chk?.ok) throw new Error('Server GPU không phản hồi')
        await fetch('/api/runtime/mode', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ target: 'gpu', gpu_url: url }) })
        setMode('gpu')
        setGpuUrl(url)
        try {
          const auth = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null
          await fetch('/api/backend/v1/runtime/state', { method: 'POST', headers: auth ? { 'Content-Type': 'application/json', 'Authorization': `Bearer ${auth}` } : { 'Content-Type': 'application/json' }, body: JSON.stringify({ target: 'gpu', gpu_url: url }) })
        } catch {}
      } else {
        await fetch('/api/runtime/mode', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ target: 'cpu' }) })
        setMode('cpu')
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
      if (provider === 'server') {
        setProvider('gemini')
        setMode('gpu')
        try { if (typeof window !== 'undefined') localStorage.setItem('llm_provider', 'gemini') } catch {}
        try {
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('runtime_mode_changed', { detail: { target: 'gpu', provider: 'gemini' } }))
          }
        } catch {}
      } else {
        setProvider('server')
        try { if (typeof window !== 'undefined') localStorage.setItem('llm_provider', 'server') } catch {}
        try {
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('runtime_mode_changed', { detail: { target: mode, provider: 'server' } }))
          }
        } catch {}
      }
      await load()
    } catch (e: any) {
      setError(e?.message || 'Lỗi chuyển chế độ')
    } finally {
      setBusy(false)
    }
  }

  const label = provider === 'gemini' ? 'API' : (mode === 'cpu' ? 'CPU' : 'GPU')
  const tooltip = provider === 'gemini'
    ? 'API: dùng Gemini (cần GEMINI_API_KEY), phù hợp test nhanh trên Vercel'
    : (mode === 'cpu' ? 'CPU: chạy mô hình GGUF nội bộ, ổn định hơn nhưng chậm hơn' : 'GPU: chạy trên Colab/Ngrok, nhanh hơn nhưng phụ thuộc kết nối')
  const perf = `${summary.cpu ? `CPU~${summary.cpu}ms` : ''}${summary.gpu ? ` • GPU~${summary.gpu}ms` : ''}`

  return (
    <div className="flex items-center gap-2">
      <button title={tooltip} onClick={switchMode} disabled={busy} className={`px-3 py-1.5 rounded-md text-sm ${mode === 'gpu' ? 'bg-accent text-white' : 'bg-primary text-primary-foreground'}`}>
        {busy ? 'Đang chuyển...' : label}
      </button>
      <button title="Chuyển nhà cung cấp (Server/Gemini)" onClick={switchProvider} disabled={busy} className="px-2 py-1.5 rounded-md text-sm bg-slate-100 text-slate-700 hover:bg-slate-200">
        {provider === 'gemini' ? 'Gemini' : 'Server'}
      </button>
      {error && <div className="text-xs text-red-600">{error}</div>}
    </div>
  )
}
