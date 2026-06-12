import { Pool } from 'pg'

type AnyPgClient = { query: (text: string, params?: any[]) => Promise<any> }

let pool: Pool | null = null

function normalizeDatabaseUrl(connectionString: string) {
  const raw = String(connectionString || '').trim()
  if (!raw) return raw
  if (!/^postgres(ql)?:\/\//i.test(raw)) return raw
  try {
    const u = new URL(raw)
    const compat = String(u.searchParams.get('uselibpqcompat') || '').toLowerCase()
    if (compat === 'true') return raw
    const sslmode = String(u.searchParams.get('sslmode') || '').toLowerCase()
    if (sslmode === 'prefer' || sslmode === 'require' || sslmode === 'verify-ca') {
      u.searchParams.set('sslmode', 'verify-full')
      return u.toString()
    }
    return raw
  } catch {
    return raw
  }
}

export function resolveDatabaseUrl(): string {
  return resolveDatabaseConfig().url
}

export function resolveDatabaseConfig(): { url: string; source: string } {
  const candidates: Array<{ key: string; value: any }> = [
    { key: 'DATABASE_URL', value: process.env.DATABASE_URL },
    { key: 'POSTGRES_URL', value: process.env.POSTGRES_URL },
    { key: 'POSTGRES_PRISMA_URL', value: process.env.POSTGRES_PRISMA_URL },
    { key: 'DATABASE_URL_UNPOOLED', value: process.env.DATABASE_URL_UNPOOLED },
    { key: 'POSTGRES_URL_NON_POOLING', value: process.env.POSTGRES_URL_NON_POOLING },
    { key: 'POSTGRES_URL_NO_SSL', value: process.env.POSTGRES_URL_NO_SSL },
  ]
  for (const c of candidates) {
    const s = String(c.value || '').trim()
    if (s) return { url: normalizeDatabaseUrl(s), source: c.key }
  }
  return { url: '', source: '' }
}

function toInt(v: any, def: number) {
  const n = Number.parseInt(String(v ?? '').trim(), 10)
  return Number.isFinite(n) && n > 0 ? n : def
}

function shouldUseSsl(connectionString: string) {
  const raw = String(connectionString || '').trim()
  if (!raw) return false
  if (!/^postgres(ql)?:\/\//i.test(raw)) return false
  try {
    const u = new URL(raw)
    const sslmode = String(u.searchParams.get('sslmode') || '').toLowerCase()
    if (sslmode === 'disable') return false
    const host = String(u.hostname || '').toLowerCase()
    const localHosts = new Set(['localhost', '127.0.0.1', '::1'])
    if (localHosts.has(host)) return false
    return sslmode === 'require' || sslmode === 'verify-full' || sslmode === 'verify-ca' || sslmode === 'prefer' || !sslmode
  } catch {
    return true
  }
}

export function getPgPool(): Pool {
  if (pool) return pool
  const { url: connectionString } = resolveDatabaseConfig()
  if (!connectionString) {
    throw new Error('DATABASE_URL is not set')
  }
  pool = new Pool({
    connectionString,
    max: toInt(process.env.DB_POOL_MAX, 5),
    idleTimeoutMillis: toInt(process.env.DB_POOL_IDLE_TIMEOUT_MS, 30000),
    connectionTimeoutMillis: toInt(process.env.DB_POOL_CONN_TIMEOUT_MS, 5000),
    keepAlive: true,
    ...(shouldUseSsl(connectionString) ? { ssl: { rejectUnauthorized: false } } : {}),
  })
  return pool
}

export async function withPgClient<T>(fn: (client: AnyPgClient) => Promise<T>): Promise<T> {
  const p = getPgPool()
  const client = await p.connect()
  try {
    return await fn(client as any)
  } finally {
    client.release()
  }
}

function isRetryablePgError(e: any) {
  const code = String(e?.code || '').trim()
  if (code === '57P01') return true
  if (code === '53300') return true
  if (code === '55000') return true
  const msg = String(e?.message || '').toLowerCase()
  if (msg.includes('timeout')) return true
  if (msg.includes('econnreset')) return true
  if (msg.includes('connection terminated')) return true
  if (msg.includes('connection error')) return true
  if (msg.includes('too many clients')) return true
  return false
}

export async function withPgClientRetry<T>(
  fn: (client: AnyPgClient) => Promise<T>,
  opts?: { attempts?: number; baseDelayMs?: number },
): Promise<{ value: T; attempts: number; elapsed_ms: number }> {
  const started = Date.now()
  const attempts = Math.max(1, Number(opts?.attempts ?? 2))
  const baseDelayMs = Math.max(0, Number(opts?.baseDelayMs ?? 200))
  let lastErr: any = null
  for (let i = 1; i <= attempts; i++) {
    try {
      const value = await withPgClient(fn)
      return { value, attempts: i, elapsed_ms: Date.now() - started }
    } catch (e: any) {
      lastErr = e
      if (i >= attempts || !isRetryablePgError(e)) break
      await new Promise((r) => setTimeout(r, baseDelayMs * i))
    }
  }
  lastErr = lastErr || new Error('db_error')
  ;(lastErr as any).__pg_retry_attempts = attempts
  ;(lastErr as any).__pg_retry_elapsed_ms = Date.now() - started
  throw lastErr
}
