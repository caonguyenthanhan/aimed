import { NextRequest } from 'next/server'

function getBackendBase(): string {
  const base = (process.env.CPU_SERVER_URL || process.env.BACKEND_URL || '').trim().replace(/\/$/, '')
  return base || 'http://127.0.0.1:8000'
}

type StubConversation = {
  id: string
  title: string
  messages: Array<{ id: string; role: 'user' | 'assistant'; content: string; timestamp: string }>
  last_active: string
}

const stubStore: {
  runtime: { target: 'cpu' | 'gpu'; gpu_url?: string; updated_at: string }
  conversations: Map<string, StubConversation>
} = {
  runtime: { target: 'cpu', updated_at: new Date().toISOString() },
  conversations: new Map(),
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

async function tryReadJson(req: NextRequest) {
  try {
    return await req.json()
  } catch {
    return null
  }
}

function isConversationsPath(parts: string[]) {
  return parts?.[0] === 'v1' && parts?.[1] === 'conversations'
}

function isRuntimeStatePath(parts: string[]) {
  return parts?.[0] === 'v1' && parts?.[1] === 'runtime' && parts?.[2] === 'state'
}

function newConvId() {
  return `conv-${Math.random().toString(16).slice(2)}${Date.now().toString(16)}`
}

function touchConversation(c: StubConversation) {
  c.last_active = new Date().toISOString()
  return c
}

async function handleStub(req: NextRequest, pathParts: string[]) {
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
  const base = getBackendBase()
  const pathParts = Array.isArray(params?.path) ? params.path : []
  const subPath = pathParts.map(p => encodeURIComponent(p)).join('/')
  const url = new URL(req.url)
  const target = `${base}/${subPath}${url.search}`

  const method = req.method.toUpperCase()
  const headers = buildHeaders(req)

  let body: ArrayBuffer | undefined
  if (method !== 'GET' && method !== 'HEAD') {
    body = await req.arrayBuffer()
  }

  try {
    const resp = await fetch(target, {
      method,
      headers,
      body: body ? body : undefined,
      redirect: 'manual'
    })

    if (resp.status !== 404) {
      const outHeaders = new Headers(resp.headers)
      outHeaders.delete('content-encoding')
      outHeaders.delete('content-length')
      return new Response(resp.body, {
        status: resp.status,
        statusText: resp.statusText,
        headers: outHeaders
      })
    }
  } catch {}

  const stub = await handleStub(req, pathParts)
  if (stub) return stub

  return json({ error: 'Not found' }, 404)
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
