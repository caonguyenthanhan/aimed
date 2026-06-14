declare module "pg" {
  export interface QueryResultRow {
    [column: string]: any
  }

  export interface QueryResult<R = any> {
    rows: R[]
    rowCount: number | null
  }

  export interface PoolConfig {
    connectionString?: string
    max?: number
    idleTimeoutMillis?: number
    connectionTimeoutMillis?: number
    keepAlive?: boolean
    ssl?: boolean | { rejectUnauthorized?: boolean }
  }

  export interface Queryable {
    query<R = any>(
      text: string,
      params?: readonly unknown[],
    ): Promise<QueryResult<R>>
  }

  export interface PoolClient extends Queryable {
    release(): void
  }

  export class Pool implements Queryable {
    constructor(config?: PoolConfig)
    connect(): Promise<PoolClient>
    end(): Promise<void>
    query<R = any>(
      text: string,
      params?: readonly unknown[],
    ): Promise<QueryResult<R>>
  }

  export class Client implements Queryable {
    constructor(config?: PoolConfig)
    connect(): Promise<void>
    end(): Promise<void>
    query<R = any>(
      text: string,
      params?: readonly unknown[],
    ): Promise<QueryResult<R>>
  }
}

declare module "uuid" {
  export function v4(): string
}

declare module "@sentry/nextjs" {
  export type SeverityLevel = "fatal" | "error" | "warning" | "log" | "info" | "debug"

  export interface Scope {
    setUser(user: { id?: string | null } | null): void
    setTag(key: string, value: string): void
    setExtras(extras: Record<string, unknown>): void
  }

  export function withScope(callback: (scope: Scope) => void): void
  export function captureException(error: unknown): string
  export function captureMessage(message: string, level?: SeverityLevel): string
}
