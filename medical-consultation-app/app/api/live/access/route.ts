import { NextResponse } from "next/server"

export async function POST(req: Request) {
  const started = Date.now()
  try {
    const body: any = await req.json().catch(() => null)
    const pass = String(body?.access_pass || "").trim()
    const expected = String(process.env.AGENT_KEY_PASS || "").trim()
    if (!expected) return NextResponse.json({ ok: false, error: "Missing server pass" }, { status: 503 })
    if (!pass) return NextResponse.json({ ok: false, error: "Missing access_pass" }, { status: 400 })
    if (pass !== expected) return NextResponse.json({ ok: false, error: "Invalid pass" }, { status: 403 })
    const key = String(process.env.GEMINI_API_KEY || "").trim()
    if (!key) return NextResponse.json({ ok: false, error: "Missing GEMINI_API_KEY" }, { status: 503 })
    return NextResponse.json({ ok: true, api_key: key, duration_ms: Date.now() - started })
  } catch {
    return NextResponse.json({ ok: false, error: "Internal error" }, { status: 500 })
  }
}

