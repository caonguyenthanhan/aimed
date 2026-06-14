import { NextRequest } from 'next/server'
import defaultStubConfig from '@/data/backend-proxy-stub.json'

export const runtime = 'nodejs'

type DeployMode = 'demo' | 'prod'

function getDeployMode(): DeployMode {
  const raw = String(process.env.MCS_DEPLOY_MODE || '').trim().toLowerCase()
  return raw === 'prod' ? 'prod' : 'demo'
}

function getBackendBase(): string | null {
  const base = (process.env.CPU_SERVER_URL || process.env.BACKEND_URL || '').trim().replace(/\/$/, '')
  if (!base) return null

  const isVercel = String(process.env.VERCEL || '').trim() === '1'
  if (isVercel && /^(https?:\/\/)?(127\.0\.0\.1|localhost)(:\d+)?$/i.test(base)) return null

  return base
}

type StubConversation = {
  id: string
  title: string
  messages: Array<{ id: string; role: 'user' | 'assistant'; content: string; timestamp: string }>
  last_active: string
}

type StubProfile = {
  full_name: string
  nickname?: string
  bio?: string
  email?: string
  email_verified?: boolean
  phone?: string
  joined_at?: string
  avatar_url?: string
  social_links?: { google?: boolean; facebook?: boolean }
}

type StubConsent = {
  share_scores: boolean
  share_chat_content: boolean
}

type StubConfig = {
  profile?: StubProfile
  consent?: StubConsent
}

let stubConfigLoaded = false
let stubConfig: StubConfig | null = defaultStubConfig as any

const stubStore: {
  runtime: { target: 'cpu' | 'gpu'; gpu_url?: string; updated_at: string }
  conversations: Map<string, StubConversation>
  profile: StubProfile
  consent: StubConsent
} = {
  runtime: { target: 'cpu', updated_at: new Date().toISOString() },
  conversations: new Map(),
  profile: {
    full_name: 'Minh Anh',
    nickname: 'patient.minh',
    bio: 'Tai khoan demo patient cho ban deploy Vercel.',
    email: 'patient.minh@aimed.demo',
    email_verified: true,
    phone: '0901234567',
    joined_at: '2026-01-01T00:00:00.000Z',
    avatar_url: '',
    social_links: { google: true, facebook: false },
  },
  consent: {
    share_scores: true,
    share_chat_content: true,
  },
}

function loadStubConfig() {
  if (stubConfigLoaded) return
  stubConfigLoaded = true

  try {
    const overrideRaw = String(process.env.BACKEND_PROXY_STUB_JSON || '').trim()
    if (overrideRaw) {
      const parsed = JSON.parse(overrideRaw)
      if (parsed && typeof parsed === 'object') stubConfig = { ...(stubConfig || {}), ...(parsed as any) }
    }
  } catch {}

  if (stubConfig?.profile && typeof stubConfig.profile === 'object') {
    stubStore.profile = { ...stubStore.profile, ...(stubConfig.profile as any) }
  }
  if (stubConfig?.consent && typeof stubConfig.consent === 'object') {
    stubStore.consent = { ...stubStore.consent, ...(stubConfig.consent as any) }
  }
}

function buildHeaders(req: NextRequest): Headers {
  const headers = new Headers()
  req.headers.forEach((value, key) => {
    const k = key.toLowerCase()
    if (k === 'host') return
    if (k === 'connection') return
    if (k === 'content-length') return
    if (k === 'accept-encoding') return
    headers.set(key, value)
  })
  if (!headers.has('ngrok-skip-browser-warning')) headers.set('ngrok-skip-browser-warning', 'true')
  return headers
}

function json(body: any, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  })
}

async function tryReadJson(req: Request) {
  try {
    return await req.json()
  } catch {
    return null
  }
}

async function tryReadPayload(req: Request) {
  const contentType = String(req.headers.get('content-type') || '').toLowerCase()
  if (contentType.includes('application/json')) {
    return tryReadJson(req)
  }
  if (contentType.includes('multipart/form-data') || contentType.includes('application/x-www-form-urlencoded')) {
    try {
      const form = await req.formData()
      const out: Record<string, any> = {}
      for (const [key, value] of form.entries()) {
        if (typeof value === 'string') out[key] = value
      }
      return out
    } catch {
      return null
    }
  }
  return null
}

function isConversationsPath(parts: string[]) {
  return parts?.[0] === 'v1' && parts?.[1] === 'conversations'
}

function isRuntimeStatePath(parts: string[]) {
  return parts?.[0] === 'v1' && parts?.[1] === 'runtime' && parts?.[2] === 'state'
}

function isUserPath(parts: string[]) {
  return parts?.[0] === 'v1' && parts?.[1] === 'user'
}

function isConsentPath(parts: string[]) {
  return parts?.[0] === 'v1' && parts?.[1] === 'consent'
}

function newConvId() {
  return `conv-${Math.random().toString(16).slice(2)}${Date.now().toString(16)}`
}

function touchConversation(c: StubConversation) {
  c.last_active = new Date().toISOString()
  return c
}

async function handleStub(req: Request, pathParts: string[]) {
  loadStubConfig()
  const method = req.method.toUpperCase()

  if (isRuntimeStatePath(pathParts)) {
    if (method === 'GET') return json(stubStore.runtime)
    if (method === 'POST') {
      const body = await tryReadJson(req)
      const target = body?.target === 'gpu' ? 'gpu' : 'cpu'
      const gpu_url = typeof body?.gpu_url === 'string' && body.gpu_url.trim() ? body.gpu_url.trim() : undefined
      stubStore.runtime = { target, gpu_url, updated_at: new Date().toISOString() }
      return json({ ok: true, ...stubStore.runtime })
    }
    return json({ error: 'Method not allowed' }, 405)
  }

  if (isUserPath(pathParts)) {
    const sub = pathParts.slice(2)
    if (sub.length === 0) {
      if (method === 'GET') return json(stubStore.profile)
      if (method === 'PUT' || method === 'PATCH') {
        const body = await tryReadPayload(req)
        stubStore.profile = {
          ...stubStore.profile,
          full_name: typeof body?.full_name === 'string' && body.full_name.trim() ? body.full_name.trim() : stubStore.profile.full_name,
          nickname: typeof body?.nickname === 'string' ? body.nickname.trim() : stubStore.profile.nickname,
          bio: typeof body?.bio === 'string' ? body.bio.trim() : stubStore.profile.bio,
          avatar_url: typeof body?.avatar_url === 'string' ? body.avatar_url.trim() : stubStore.profile.avatar_url,
        }
        return json(stubStore.profile)
      }
      return json({ error: 'Method not allowed' }, 405)
    }

    if (sub[0] === 'password') {
      if (method !== 'PUT') return json({ error: 'Method not allowed' }, 405)
      return json({ ok: true, message: 'Password updated in demo stub mode' })
    }

    if (sub[0] === 'sessions' && sub[1] === 'logout-all') {
      if (method !== 'POST') return json({ error: 'Method not allowed' }, 405)
      return json({ ok: true, message: 'All sessions cleared in demo stub mode' })
    }

    return json({ error: 'Not found' }, 404)
  }

  if (isConsentPath(pathParts)) {
    if (method === 'GET') return json(stubStore.consent)
    if (method === 'PUT' || method === 'PATCH') {
      const body = await tryReadPayload(req)
      stubStore.consent = {
        share_scores: typeof body?.share_scores === 'boolean' ? body.share_scores : stubStore.consent.share_scores,
        share_chat_content: typeof body?.share_chat_content === 'boolean' ? body.share_chat_content : stubStore.consent.share_chat_content,
      }
      return json(stubStore.consent)
    }
    return json({ error: 'Method not allowed' }, 405)
  }

  if (!isConversationsPath(pathParts)) return null

  const sub = pathParts.slice(2)
  if (sub.length === 0) {
    if (method === 'GET') {
      const list = Array.from(stubStore.conversations.values()).map((c) => ({ id: c.id, title: c.title, last_active: c.last_active }))
      list.sort((a, b) => (a.last_active > b.last_active ? -1 : 1))
      return json({ conversations: list })
    }
    return json({ error: 'Not found' }, 404)
  }

  if (sub[0] === 'start' || sub[0] === 'new') {
    if (method !== 'POST') return json({ error: 'Method not allowed' }, 405)
    const id = newConvId()
    const body = await tryReadJson(req)
    const title = typeof body?.title === 'string' && body.title.trim() ? body.title.trim() : 'Hội thoại'
    const conv: StubConversation = { id, title, messages: [], last_active: new Date().toISOString() }
    stubStore.conversations.set(id, conv)
    return json({ id, conversation_id: id })
  }

  const id = String(sub[0] || '').trim()
  if (!id) return json({ error: 'Not found' }, 404)

  if (sub.length === 1) {
    if (method === 'GET') {
      const c = stubStore.conversations.get(id)
      if (!c) return json({ error: 'Not found' }, 404)
      return json({ id: c.id, title: c.title, last_active: c.last_active, messages: c.messages })
    }
    if (method === 'DELETE') {
      stubStore.conversations.delete(id)
      return json({ ok: true })
    }
  }

  if (sub[1] === 'title') {
    if (method !== 'PATCH') return json({ error: 'Method not allowed' }, 405)
    const c = stubStore.conversations.get(id)
    if (!c) return json({ error: 'Not found' }, 404)
    const body = await tryReadJson(req)
    const title = typeof body?.title === 'string' ? body.title.trim() : ''
    if (title) c.title = title
    touchConversation(c)
    return json({ ok: true, id: c.id, title: c.title, last_active: c.last_active })
  }

  return json({ error: 'Not found' }, 404)
}

async function proxy(req: NextRequest, params: { path?: string[] }) {
  const mode = getDeployMode()
  const isDemo = mode === 'demo'

  const base = getBackendBase()
  const pathParts = Array.isArray(params?.path) ? params.path : []
  const subPath = pathParts.map(p => encodeURIComponent(p)).join('/')
  const url = new URL(req.url)
  const target = base ? `${base}/${subPath}${url.search}` : ''

  const method = req.method.toUpperCase()
  const headers = buildHeaders(req)
  const fallbackReq = method === 'GET' || method === 'HEAD' ? req : req.clone()

  let body: ArrayBuffer | undefined
  if (method !== 'GET' && method !== 'HEAD') {
    body = await req.arrayBuffer()
  }

  if (base) {
    try {
      const resp = await fetch(target, {
        method,
        headers,
        body: body ? body : undefined,
        redirect: 'manual'
      })

      if (!isDemo || resp.status !== 404) {
        const outHeaders = new Headers(resp.headers)
        outHeaders.delete('content-encoding')
        outHeaders.delete('content-length')
        return new Response(resp.body, {
          status: resp.status,
          statusText: resp.statusText,
          headers: outHeaders
        })
      }
    } catch (e: any) {
      if (!isDemo) {
        return json(
          {
            error: 'CPU server unreachable',
            mode,
            hint: 'Set CPU_SERVER_URL to a reachable backend (https://...) or switch to MCS_DEPLOY_MODE=demo',
            details: String(e?.message || e || 'unknown'),
          },
          503
        )
      }
    }
  } else if (!isDemo) {
    return json(
      {
        error: 'CPU server not configured',
        mode,
        hint: 'Set CPU_SERVER_URL in Vercel env to a reachable backend (https://...) or switch to MCS_DEPLOY_MODE=demo',
      },
      503
    )
  }

  if (isDemo) {
    const stub = await handleStub(fallbackReq, pathParts)
    if (stub) return stub
  }

  return json({ error: 'Not found', mode }, 404)
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const p = await ctx.params
  return proxy(req, { path: p?.path })
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const p = await ctx.params
  return proxy(req, { path: p?.path })
}

export async function PUT(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const p = await ctx.params
  return proxy(req, { path: p?.path })
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const p = await ctx.params
  return proxy(req, { path: p?.path })
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const p = await ctx.params
  return proxy(req, { path: p?.path })
}

export async function OPTIONS(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const p = await ctx.params
  return proxy(req, { path: p?.path })
}
