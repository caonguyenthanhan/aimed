import { NextRequest, NextResponse } from "next/server"
import { resolveDatabaseConfig, withPgClientRetry } from "@/lib/pg"

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
      "Content-Type": "application/json; charset=utf-8",
    },
  })

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null)
  if (!body?.subscription || !body.subscription.endpoint) {
    return json({ success: false, reason: "missing_subscription" }, { status: 400 })
  }

  const { endpoint, keys } = body.subscription
  const p256dh = keys?.p256dh || ""
  const auth = keys?.auth || ""

  const { url: dbUrl, source } = resolveDatabaseConfig()
  if (!dbUrl) {
    // Graceful fallback for local development or demo mode
    return json({
      success: true,
      demo: true,
      reason: "database_not_configured_fallback_to_client",
      subscription: body.subscription,
    })
  }

  try {
    await withPgClientRetry(async (client) => {
      // Create table if not exists
      await client.query(`
        CREATE TABLE IF NOT EXISTS mcs_push_subscriptions (
          id SERIAL PRIMARY KEY,
          endpoint TEXT UNIQUE NOT NULL,
          keys_p256dh TEXT NOT NULL,
          keys_auth TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `)

      // Insert or update subscription
      await client.query(
        `
        INSERT INTO mcs_push_subscriptions (endpoint, keys_p256dh, keys_auth)
        VALUES ($1, $2, $3)
        ON CONFLICT (endpoint) DO UPDATE 
        SET keys_p256dh = EXCLUDED.keys_p256dh, keys_auth = EXCLUDED.keys_auth
      `,
        [endpoint, p256dh, auth]
      )
    }, { attempts: 3, baseDelayMs: 250 })

    return json({ success: true, saved: true })
  } catch (error) {
    return json(
      {
        success: false,
        reason: "db_unavailable_fallback_to_client",
        error: String((error as any)?.message || "db_error"),
        subscription: body.subscription,
      },
      { status: 200 } // Keep 200 OK so client falls back gracefully
    )
  }
}
