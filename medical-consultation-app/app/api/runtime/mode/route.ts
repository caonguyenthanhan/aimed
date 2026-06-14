import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import { buildSystemState, normalizeRuntimeProvider, normalizeRuntimeTarget } from '@/lib/runtime-sync'
import { getPgPool, resolveDatabaseConfig } from '@/lib/pg'

const toHeaderRecord = (headers?: HeadersInit): Record<string, string> => {
  if (!headers) return {}
  if (headers instanceof Headers) {
    const out: Record<string, string> = {}
    headers.forEach((v, k) => (out[k] = v))
    return out
  }
  if (Array.isArray(headers)) return Object.fromEntries(headers)
  return { ...(headers as Record<string, string>) }
}

const json = (data: any, init?: ResponseInit) =>
  NextResponse.json(data, {
    ...(init || {}),
    headers: {
      ...toHeaderRecord(init?.headers),
      'Content-Type': 'application/json; charset=utf-8',
    },
  })

const dataDir = path.join(process.cwd(), 'data')
const modePath = path.join(dataDir, 'runtime-mode.json')
const eventsPath = path.join(dataDir, 'runtime-events.jsonl')
const configuredProvider = () => normalizeRuntimeProvider(process.env.AGENT_PROVIDER || process.env.LLM_PROVIDER || 'server')
const cpuBase = () => (process.env.CPU_SERVER_URL || process.env.BACKEND_URL || '').trim().replace(/\/$/, '')

function ensure() {
  if (process.env.VERCEL) return
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true })
  if (!fs.existsSync(modePath)) {
    fs.writeFileSync(
      modePath,
      JSON.stringify({ target: 'cpu', provider: configuredProvider(), updated_at: new Date().toISOString() }),
    )
  }
  if (!fs.existsSync(eventsPath)) fs.writeFileSync(eventsPath, '')
}

const probeDb = async () => {
  if (!String(resolveDatabaseConfig().url || '').trim()) {
    return { ok: null as boolean | null, latencyMs: null as number | null, error: null as string | null }
  }
  const started = Date.now()
  try {
    const pool = getPgPool()
    await pool.query('SELECT 1 as ok')
    return { ok: true, latencyMs: Date.now() - started, error: null as string | null }
  } catch (e: any) {
    return { ok: false, latencyMs: Date.now() - started, error: String(e?.message || 'db_error') }
  }
}

const probeGraph = async () => {
  const base = cpuBase()
  const isProd = process.env.VERCEL === '1' || process.env.NODE_ENV === 'production'
  if (!base && isProd) {
    return {
      connected: false,
      reason: 'graph_disabled_no_cpu_url',
      latencyMs: null as number | null,
      endpoint: null as string | null,
      statusCode: null as number | null,
      error: null as string | null,
    }
  }

  const upstream = `${base || 'http://127.0.0.1:8000'}/v1/graph/status`
  const apiKey = (process.env.GRAPH_API_KEY || '').trim()
  const started = Date.now()
  const controller = new AbortController()
  const timeoutMs = 3000
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const resp = await fetch(upstream, {
      method: 'GET',
      headers: apiKey ? { 'x-api-key': apiKey } : undefined,
      signal: controller.signal,
    })
    const payload = await resp.json().catch(() => null)
    if (!resp.ok) {
      const graphReason = resp.status === 404 ? 'graph_404' : 'graph_down'
      return {
        connected: false,
        reason: graphReason,
        latencyMs: Date.now() - started,
        endpoint: upstream,
        statusCode: resp.status,
        error: typeof payload?.error === 'string' ? payload.error : `HTTP ${resp.status}`,
      }
    }
    return {
      connected: Boolean(payload?.connected),
      reason: Boolean(payload?.connected) ? null : (typeof payload?.reason === 'string' ? payload.reason : 'graph_down'),
      latencyMs: typeof payload?.latency_ms === 'number' ? payload.latency_ms : Date.now() - started,
      endpoint: upstream,
      statusCode: resp.status,
      error: typeof payload?.error === 'string' ? payload.error : null,
    }
  } catch (e: any) {
    const rawMessage = String(e?.message || e || '')
    const reason = /abort|timeout/i.test(rawMessage) ? 'graph_timeout' : 'graph_down'
    return {
      connected: false,
      reason,
      latencyMs: Date.now() - started,
      endpoint: upstream,
      statusCode: null as number | null,
      error: rawMessage || reason,
    }
  } finally {
    clearTimeout(timer)
  }
}

const buildRuntimePayload = async (payload?: Record<string, any>) => {
  const provider = normalizeRuntimeProvider(payload?.provider || configuredProvider())
  const target = normalizeRuntimeTarget(payload?.target, provider === 'gemini' || provider === 'foza' ? 'gpu' : 'cpu')
  const gpu_url = typeof payload?.gpu_url === 'string' && payload.gpu_url.trim() ? payload.gpu_url.trim() : undefined
  const updated_at = typeof payload?.updated_at === 'string' && payload.updated_at.trim()
    ? payload.updated_at
    : new Date().toISOString()
  const [db, graph] = await Promise.all([probeDb(), probeGraph()])
  const error = db.error || graph.error || null
  const system_state = buildSystemState({
    provider,
    mode: target,
    graph_connected: graph.connected,
    graph_injected: false,
    graph_reason: graph.reason,
    db_ok: db.ok,
    fallback: null,
    error,
    demo_mode: false,
    graph_endpoint: graph.endpoint,
    graph_status_code: graph.statusCode,
    graph_latency_ms: graph.latencyMs,
    db_latency_ms: db.latencyMs,
  })
  return { target, provider, gpu_url, updated_at, system_state }
}

export async function GET() {
  try {
    ensure()
    if (process.env.VERCEL) {
      const gpuBase = (process.env.GPU_SERVER_URL || '').trim().replace(/\/$/, '')
      const localCpuBase = cpuBase()
      if (gpuBase) return json(await buildRuntimePayload({ target: 'gpu', gpu_url: gpuBase, provider: configuredProvider() }))
      if (localCpuBase) return json(await buildRuntimePayload({ target: 'cpu', provider: configuredProvider() }))
      return json(await buildRuntimePayload({ target: 'cpu', provider: configuredProvider() }))
    }
    const raw = fs.readFileSync(modePath, 'utf-8')
    const data = JSON.parse(raw)
    return json(await buildRuntimePayload({ ...data, provider: data?.provider || configuredProvider() }))
  } catch (e: any) {
    return json({ error: e?.message || 'read_error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    ensure()
    const body = await req.json()
    const provider = normalizeRuntimeProvider(body?.provider || configuredProvider())
    const target = body?.target === 'gpu' ? 'gpu' : normalizeRuntimeTarget(body?.target, provider === 'gemini' || provider === 'foza' ? 'gpu' : 'cpu')
    const gpu_url = target === 'gpu' && typeof body?.gpu_url === 'string' ? body.gpu_url : undefined
    const now = new Date().toISOString()
    const payload: any = { target, gpu_url, provider, updated_at: now }
    if (!process.env.VERCEL) {
      fs.writeFileSync(modePath, JSON.stringify(payload, null, 2))
      fs.appendFileSync(eventsPath, JSON.stringify({ type: 'mode_change', target, gpu_url, provider, ts: now }) + '\n')
    }
    try {
      const backendUrl = (cpuBase() || 'http://127.0.0.1:8000').trim().replace(/\/$/, '')
      await fetch(`${backendUrl}/v1/runtime/mode`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }).catch(() => {})
    } catch {}
    return json({ ok: true, mode: await buildRuntimePayload(payload) })
  } catch (e: any) {
    return json({ error: e?.message || 'write_error' }, { status: 500 })
  }
}
