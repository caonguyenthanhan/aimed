import { NextResponse } from "next/server"
import { buildSystemState, hasInternalDemoPass, isInternalDemoPass } from "@/lib/runtime-sync"

export async function POST(req: Request) {
  const started = Date.now()
  try {
    const body: any = await req.json().catch(() => null)
    const pass = String(body?.access_pass || "").trim()
    if (!hasInternalDemoPass()) {
      return NextResponse.json(
        {
          ok: false,
          error: "Missing INTERNAL_DEMO_PASS",
          system_state: buildSystemState({
            provider: "gemini",
            mode: "gpu",
            error: "Missing INTERNAL_DEMO_PASS",
          }),
        },
        { status: 503 },
      )
    }
    if (!pass) return NextResponse.json({ ok: false, error: "Missing access_pass" }, { status: 400 })
    if (!isInternalDemoPass(pass)) {
      return NextResponse.json(
        {
          ok: false,
          error: "Invalid pass",
          system_state: buildSystemState({
            provider: "gemini",
            mode: "gpu",
            error: "Invalid pass",
            internal_pass_matched: false,
          }),
        },
        { status: 403 },
      )
    }
    const key = String(process.env.GEMINI_API_KEY || "").trim()
    if (!key) {
      return NextResponse.json(
        {
          ok: false,
          error: "Missing GEMINI_API_KEY",
          system_state: buildSystemState({
            provider: "gemini",
            mode: "gpu",
            error: "Missing GEMINI_API_KEY",
            demo_mode: true,
            internal_pass_matched: true,
          }),
        },
        { status: 503 },
      )
    }
    return NextResponse.json({
      ok: true,
      api_key: key,
      demo_mode: true,
      duration_ms: Date.now() - started,
      system_state: buildSystemState({
        provider: "gemini",
        mode: "gpu",
        demo_mode: true,
        internal_pass_matched: true,
      }),
    })
  } catch {
    return NextResponse.json({ ok: false, error: "Internal error" }, { status: 500 })
  }
}

