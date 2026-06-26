import { NextRequest, NextResponse } from "next/server"

export async function GET(req: NextRequest) {
  try {
    const cpuBase = (process.env.CPU_SERVER_URL || process.env.BACKEND_URL || "").trim().replace(/\/$/, "")
    if (!cpuBase) {
      return NextResponse.json({ error: "cpu_server_not_configured" }, { status: 503 })
    }
    const limit = req.nextUrl.searchParams.get("limit") || "50"
    const resp = await fetch(`${cpuBase}/v1/llmops/traces?limit=${limit}`, { cache: "no-store" })
    if (!resp.ok) {
      return NextResponse.json({ error: "backend_error" }, { status: resp.status })
    }
    const data = await resp.json()
    return NextResponse.json(data)
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "internal_error" }, { status: 500 })
  }
}
