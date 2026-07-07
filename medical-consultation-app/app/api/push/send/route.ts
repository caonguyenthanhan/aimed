import { NextRequest, NextResponse } from "next/server"
import webPush from "web-push"
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

// Set up VAPID details
const publicVapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || ""
const privateVapidKey = process.env.VAPID_PRIVATE_KEY || ""
const vapidSubject = process.env.VAPID_SUBJECT || "mailto:support@aimed.com"

if (publicVapidKey && privateVapidKey) {
  webPush.setVapidDetails(vapidSubject, publicVapidKey, privateVapidKey)
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null)
  const title = body?.title || "Nhắc nhở từ AIMed"
  const text = body?.body || "Đã đến giờ bài tập hành vi của bạn rồi!"
  const targetUrl = body?.url || "/tri-lieu"

  const payload = JSON.stringify({
    title,
    body: text,
    url: targetUrl,
  })

  // 1. If client provided a subscription directly (testing/mocking), push directly to it
  if (body?.subscription && body.subscription.endpoint) {
    try {
      if (!publicVapidKey || !privateVapidKey) {
        return json(
          { success: false, reason: "vapid_keys_missing_on_server" },
          { status: 500 }
        )
      }
      await webPush.sendNotification(body.subscription, payload)
      return json({ success: true, sent_to_direct_client: true })
    } catch (err) {
      return json(
        { success: false, reason: "push_failed", error: String(err) },
        { status: 500 }
      )
    }
  }

  // 2. Otherwise, fetch all registered subscriptions from Postgres and send push
  const { url: dbUrl } = resolveDatabaseConfig()
  if (!dbUrl) {
    return json(
      { success: false, reason: "database_not_configured_cannot_broadcast" },
      { status: 400 }
    )
  }

  try {
    const { value: subscriptions } = await withPgClientRetry(async (client) => {
      // Check if table exists
      const tableCheck = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = 'mcs_push_subscriptions'
        );
      `)
      if (!tableCheck.rows[0].exists) {
        return []
      }

      const res = await client.query("SELECT endpoint, keys_p256dh, keys_auth FROM mcs_push_subscriptions")
      return res.rows
    }, { attempts: 2, baseDelayMs: 250 })

    if (subscriptions.length === 0) {
      return json({ success: true, sent_count: 0, message: "No active subscriptions found" })
    }

    if (!publicVapidKey || !privateVapidKey) {
      return json(
        { success: false, reason: "vapid_keys_missing_on_server" },
        { status: 500 }
      )
    }

    let successCount = 0
    let failureCount = 0

    // Send notifications in parallel
    await Promise.all(
      subscriptions.map(async (sub: any) => {
        const pushSubscription = {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.keys_p256dh,
            auth: sub.keys_auth,
          },
        }

        try {
          await webPush.sendNotification(pushSubscription, payload)
          successCount++
        } catch (err: any) {
          failureCount++
          // If status is 410 (Gone) or 404 (Not Found), the subscription has expired or unsubscribed.
          // We can remove it from DB
          if (err.statusCode === 410 || err.statusCode === 404) {
            try {
              await withPgClientRetry(async (client) => {
                await client.query("DELETE FROM mcs_push_subscriptions WHERE endpoint = $1", [sub.endpoint])
              })
            } catch {}
          }
        }
      })
    )

    return json({
      success: true,
      sent_count: successCount,
      failed_count: failureCount,
    })
  } catch (error) {
    return json(
      {
        success: false,
        reason: "broadcast_failed",
        error: String((error as any)?.message || "db_error"),
      },
      { status: 500 }
    )
  }
}
