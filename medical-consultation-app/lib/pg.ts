import { Pool } from 'pg'

type AnyPgClient = { query: (text: string, params?: any[]) => Promise<any> }

let pool: Pool | null = null

export function resolveDatabaseUrl(): string {
  const candidates = [
    process.env.DATABASE_URL,
    process.env.POSTGRES_URL,
    process.env.POSTGRES_PRISMA_URL,
    process.env.DATABASE_URL_UNPOOLED,
    process.env.POSTGRES_URL_NON_POOLING,
    process.env.POSTGRES_URL_NO_SSL,
  ]
  for (const v of candidates) {
    const s = String(v || '').trim()
    if (s) return s
  }
  return ''
}

function toInt(v: any, def: number) {
  const n = Number.parseInt(String(v ?? '').trim(), 10)
  return Number.isFinite(n) && n > 0 ? n : def
}

export function getPgPool(): Pool {
  if (pool) return pool
  const connectionString = resolveDatabaseUrl()
  if (!connectionString) {
    throw new Error('DATABASE_URL is not set')
  }
  pool = new Pool({
    connectionString,
    max: toInt(process.env.DB_POOL_MAX, 5),
    idleTimeoutMillis: toInt(process.env.DB_POOL_IDLE_TIMEOUT_MS, 30000),
    connectionTimeoutMillis: toInt(process.env.DB_POOL_CONN_TIMEOUT_MS, 5000),
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

