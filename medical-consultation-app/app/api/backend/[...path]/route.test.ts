import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

describe('Next.js API Gateway Proxy (/api/backend)', () => {
  const originalEnv = { ...process.env }
  const routeParams = { params: Promise.resolve({ path: ['v1', 'user'] }) }

  function restoreEnv() {
    for (const key of Object.keys(process.env)) {
      if (!(key in originalEnv)) delete process.env[key]
    }
    for (const [key, value] of Object.entries(originalEnv)) {
      if (typeof value === 'string') process.env[key] = value
    }
  }

  function setEnv(overrides: Record<string, string | undefined>) {
    for (const [key, value] of Object.entries(overrides)) {
      if (typeof value === 'undefined') delete process.env[key]
      else process.env[key] = value
    }
  }

  async function loadGetHandler() {
    vi.resetModules()
    const mod = await import('./route')
    return mod.GET
  }

  function makeRequest() {
    return new Request('http://localhost/api/backend/v1/user', { method: 'GET' })
  }

  beforeEach(() => {
    vi.clearAllMocks()
    restoreEnv()
  })

  afterEach(() => {
    restoreEnv()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  test('Case A: Demo mode, no CPU server -> returns stub data (200 OK)', async () => {
    setEnv({
      MCS_DEPLOY_MODE: 'demo',
      CPU_SERVER_URL: undefined,
      BACKEND_URL: undefined,
      BACKEND_PROXY_STUB_JSON: undefined,
    })
    const GET = await loadGetHandler()

    const res = await GET(makeRequest() as any, routeParams)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.full_name).toBe('Minh Anh')
    expect(body.nickname).toBe('patient.minh')
    expect(body.email).toBe('patient.minh@aimed.demo')
  })

  test('Case B: Prod mode, no CPU server -> returns 503 Service Unavailable', async () => {
    setEnv({
      MCS_DEPLOY_MODE: 'prod',
      CPU_SERVER_URL: undefined,
      BACKEND_URL: undefined,
    })
    const GET = await loadGetHandler()

    const res = await GET(makeRequest() as any, routeParams)
    expect(res.status).toBe(503)
    const body = await res.json()
    expect(body.error).toBe('CPU server not configured')
    expect(body.mode).toBe('prod')
    expect(body.hint).toContain('Set CPU_SERVER_URL')
  })

  test('Case C: Live CPU server configured -> proxies request directly to CPU server', async () => {
    setEnv({
      MCS_DEPLOY_MODE: 'prod',
      CPU_SERVER_URL: 'https://my-mock-ngrok.ngrok-free.dev',
    })

    const mockCpuResponse = {
      full_name: 'Real Doctor Tuan from CPU server',
      specialty: 'Mental Health',
    }
    vi.stubGlobal('fetch', vi.fn().mockImplementation(async (targetUrl: string) => {
      expect(targetUrl).toBe('https://my-mock-ngrok.ngrok-free.dev/v1/user')
      return new Response(JSON.stringify(mockCpuResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }))
    const GET = await loadGetHandler()

    const res = await GET(makeRequest() as any, routeParams)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.full_name).toBe('Real Doctor Tuan from CPU server')
    expect(body.specialty).toBe('Mental Health')
    expect(global.fetch).toHaveBeenCalled()
  })

  test('Case D: Demo mode, backend 404 -> falls back to stub data', async () => {
    setEnv({
      MCS_DEPLOY_MODE: 'demo',
      CPU_SERVER_URL: 'https://demo-backend.example.com',
      BACKEND_PROXY_STUB_JSON: JSON.stringify({
        profile: {
          full_name: 'Fallback Demo User',
          nickname: 'fallback.user',
          email: 'fallback@example.com',
        },
      }),
    })

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('missing', { status: 404 })))
    const GET = await loadGetHandler()

    const res = await GET(makeRequest() as any, routeParams)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.full_name).toBe('Fallback Demo User')
    expect(body.nickname).toBe('fallback.user')
    expect(global.fetch).toHaveBeenCalledOnce()
  })

  test('Case E: Demo mode, backend 200 -> returns proxied response instead of stub', async () => {
    setEnv({
      MCS_DEPLOY_MODE: 'demo',
      CPU_SERVER_URL: 'https://demo-backend.example.com',
      BACKEND_PROXY_STUB_JSON: JSON.stringify({
        profile: {
          full_name: 'Stub Should Not Win',
        },
      }),
    })

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ full_name: 'Live Demo Backend' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    ))
    const GET = await loadGetHandler()

    const res = await GET(makeRequest() as any, routeParams)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.full_name).toBe('Live Demo Backend')
    expect(global.fetch).toHaveBeenCalledOnce()
  })
})
