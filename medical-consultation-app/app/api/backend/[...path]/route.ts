import { NextRequest } from 'next/server'

function getBackendBase(): string {
  const base = (process.env.CPU_SERVER_URL || process.env.BACKEND_URL || '').trim().replace(/\/$/, '')
  return base || 'http://127.0.0.1:8000'
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

  const resp = await fetch(target, {
    method,
    headers,
    body: body ? body : undefined,
    redirect: 'manual'
  })

  const outHeaders = new Headers(resp.headers)
  outHeaders.delete('content-encoding')
  outHeaders.delete('content-length')

  return new Response(resp.body, {
    status: resp.status,
    statusText: resp.statusText,
    headers: outHeaders
  })
}

export async function GET(req: NextRequest, ctx: { params: { path?: string[] } }) {
  return proxy(req, ctx.params)
}

export async function POST(req: NextRequest, ctx: { params: { path?: string[] } }) {
  return proxy(req, ctx.params)
}

export async function PUT(req: NextRequest, ctx: { params: { path?: string[] } }) {
  return proxy(req, ctx.params)
}

export async function PATCH(req: NextRequest, ctx: { params: { path?: string[] } }) {
  return proxy(req, ctx.params)
}

export async function DELETE(req: NextRequest, ctx: { params: { path?: string[] } }) {
  return proxy(req, ctx.params)
}

export async function OPTIONS(req: NextRequest, ctx: { params: { path?: string[] } }) {
  return proxy(req, ctx.params)
}
