import { NextResponse } from "next/server"
import crypto from "crypto"
import { GeminiService, geminiService } from "@/lib/gemini-service"
import { shouldBlock, buildBlockResponse } from "@/lib/safety"
import { assessSos, buildSosResponse } from "@/lib/sos-mode"
import { geminiToolDeclarations, toolCallsToActions } from "@/lib/agent-tools"
import { AgentResponseSchema, isAllowedPath, normalizeActions } from "@/lib/agent-actions"
import { persistChatTurn } from "@/lib/chat-persistence"
import { runLocalAgent } from "@/lib/agent-local-provider"

export async function POST(req: Request) {
  const started = Date.now()
  try {
    const body: any = await req.json().catch(() => null)
    const message = String(body?.message || body?.question || "").trim()
    const conversation_id = String(body?.conversation_id || "").trim() || crypto.randomUUID()
    const messages = Array.isArray(body?.messages) ? body.messages : []
    const tier = body?.tier === "pro" ? "pro" : "flash"
    const category = body?.category === "friend" ? "friend" : "consultation"
    const accessPass = String(body?.access_pass || "").trim()

    if (!message) return NextResponse.json({ error: "Message is required" }, { status: 400 })

    const ruleBasedActionsGuess = () => {
      const lower = message.toLowerCase()
      if (lower.includes("sàng lọc") || lower.includes("sang loc")) return [{ type: "navigate", args: { path: "/sang-loc" } }]
      if (lower.includes("trị liệu") || lower.includes("tri lieu")) return [{ type: "navigate", args: { path: "/tri-lieu" } }]
      if (lower.includes("nhắc nhở") || lower.includes("nhac nho")) return [{ type: "navigate", args: { path: "/nhac-nho" } }]
      return []
    }

    const sos = assessSos(message, messages)
    if (sos.triggered) {
      const content = buildSosResponse(sos.hotlines)
      try {
        await persistChatTurn({ sessionId: conversation_id, kind: category === "friend" ? "friend" : "consultation", userText: message, assistantText: content })
      } catch {}
      return NextResponse.json({
        response: content,
        actions: [],
        conversation_id,
        metadata: { mode: "cpu", sos: true, hotlines: sos.hotlines, reasons: sos.reasons, situation: "sos", duration_ms: Date.now() - started },
      })
    }

    const safetyHits = shouldBlock(message, messages)
    if (safetyHits.length) {
      const content = buildBlockResponse(safetyHits)
      try {
        await persistChatTurn({ sessionId: conversation_id, kind: category === "friend" ? "friend" : "consultation", userText: message, assistantText: content })
      } catch {}
      return NextResponse.json({
        response: content,
        actions: [],
        conversation_id,
        metadata: { mode: "cpu", blocked: true, hits: safetyHits, situation: "safety", duration_ms: Date.now() - started },
      })
    }

    const provider = String(process.env.AGENT_PROVIDER || "gemini").trim().toLowerCase()
    if (provider === "local") {
      const allow = [
        "/sang-loc",
        "/tri-lieu",
        "/nhac-nho",
        "/tin-tuc-y-khoa",
        "/tam-su",
        "/tu-van",
        "/bac-si",
        "/doctor",
        "/ke-hoach",
      ]
      const cpuBase = (process.env.CPU_SERVER_URL || process.env.BACKEND_URL || "").trim().replace(/\/$/, "")
      const urlCandidate = (process.env.LOCAL_AGENT_URL || process.env.INTERNAL_LLM_URL || (cpuBase ? `${cpuBase}/v1/chat/completions` : "") || "http://127.0.0.1:8000/v1/chat/completions").trim()
      const model = (process.env.LOCAL_AGENT_MODEL || process.env.LOCAL_LLM_MODEL || "").trim() || "local-agent"
      const local = await runLocalAgent({ url: urlCandidate, model, message, history: messages, allowPaths: allow }).catch(() => null)
      if (!local) {
        const actions = normalizeActions(ruleBasedActionsGuess())
        const content = actions.length ? "Được, mình sẽ mở trang phù hợp." : "Mình gặp sự cố khi gọi agent local. Bạn thử lại giúp mình."
        try {
          await persistChatTurn({ sessionId: conversation_id, kind: category === "friend" ? "friend" : "consultation", userText: message, assistantText: content })
        } catch {}
        return NextResponse.json(
          AgentResponseSchema.parse({
            response: content,
            actions,
            conversation_id,
            metadata: { mode: "cpu", provider: "local", fallback: "rule_based", duration_ms: Date.now() - started },
          })
        )
      }

      const json = local.json
      const actions = normalizeActions(json?.actions)
        .map((a) => {
          if (a.type === "navigate") {
            const p = String(a.args?.path || "").trim()
            if (!isAllowedPath(p)) return null
            return { type: "navigate", args: { path: p } }
          }
          if (a.type === "speak") {
            const t = String((a as any)?.args?.text || "").trim()
            if (!t) return null
            const text = t.length > 800 ? t.slice(0, 800) : t
            return { type: "speak", args: { text } }
          }
          return null
        })
        .filter(Boolean) as any

      const fromJson = typeof json?.response === "string" ? String(json.response).trim() : ""
      const content = fromJson || local.text || (actions.length ? "Đã thực hiện yêu cầu." : "Mình chưa rõ bạn muốn mình thực hiện hành động nào.")
      try {
        await persistChatTurn({ sessionId: conversation_id, kind: category === "friend" ? "friend" : "consultation", userText: message, assistantText: content })
      } catch {}
      return NextResponse.json(
        AgentResponseSchema.parse({
          response: content,
          actions,
          conversation_id,
          metadata: { mode: "cpu", provider: "local", model: local.model, parsed_json: !!json, duration_ms: Date.now() - started },
        })
      )
    }
    if (provider !== "gemini") {
      const actions = normalizeActions(ruleBasedActionsGuess())
      const content = actions.length ? "Được, mình sẽ mở trang phù hợp." : "Chế độ agent local đang ở dạng demo (rule-based)."
      try {
        await persistChatTurn({ sessionId: conversation_id, kind: category === "friend" ? "friend" : "consultation", userText: message, assistantText: content })
      } catch {}
      return NextResponse.json({ response: content, actions, conversation_id, metadata: { mode: "cpu", provider, duration_ms: Date.now() - started } }, { status: 200 })
    }

    const expectedPass = String(process.env.AGENT_KEY_PASS || "").trim()
    const passOk = expectedPass && accessPass && accessPass === expectedPass
    const systemKey = String(process.env.GEMINI_API_KEY || "").trim()
    const access = passOk ? "pass" : (accessPass ? "user_key" : "system_key")
    const keyToUse = passOk ? systemKey : (accessPass || systemKey)
    if (!keyToUse) {
      const actions = normalizeActions(ruleBasedActionsGuess())
      const content = actions.length ? "Được, mình sẽ mở trang phù hợp." : "Thiếu cấu hình Gemini nên agent đang chạy local demo (rule-based)."
      try {
        await persistChatTurn({ sessionId: conversation_id, kind: category === "friend" ? "friend" : "consultation", userText: message, assistantText: content })
      } catch {}
      const out = AgentResponseSchema.parse({
        response: content,
        actions,
        conversation_id,
        metadata: { mode: "cpu", provider: "local", fallback: "missing_gemini_key", duration_ms: Date.now() - started },
      })
      return NextResponse.json(out)
    }

    const toolDecl = geminiToolDeclarations()
    let geminiErr: string | null = null
    let r: Awaited<ReturnType<typeof geminiService.generateAgent>> | null = null
    try {
      const svc = keyToUse === String(process.env.GEMINI_API_KEY || "").trim() ? geminiService : new GeminiService(keyToUse)
      r = await svc.generateAgent({ category, tier, question: message, messages, tools: toolDecl })
    } catch (e: any) {
      geminiErr = String(e?.message || e || "").trim() || "unknown_error"
      if (geminiErr.length > 280) geminiErr = geminiErr.slice(0, 280)
      r = null
    }
    if (!r) {
      const parseRetryAfterSec = (s: string) => {
        const raw = String(s || "")
        const m1 = raw.match(/"retryDelay"\s*:\s*"(\d+)s"/)
        if (m1?.[1]) return Number(m1[1])
        const m2 = raw.match(/Please retry in\s+([0-9.]+)s/i)
        if (m2?.[1]) return Math.ceil(Number(m2[1]))
        return null
      }
      const retryAfter = parseRetryAfterSec(geminiErr || "")
      const is429 = String(geminiErr || "").includes(" 429 ") || String(geminiErr || "").includes("RESOURCE_EXHAUSTED") || String(geminiErr || "").includes("\"code\": 429")
      if (is429) {
        const content = retryAfter
          ? `Hiện Gemini đang giới hạn lượt dùng. Bạn thử lại sau khoảng ${retryAfter}s, hoặc nhập API key/pass để tiếp tục.`
          : "Hiện Gemini đang giới hạn lượt dùng. Bạn thử lại sau, hoặc nhập API key/pass để tiếp tục."
        try {
          await persistChatTurn({ sessionId: conversation_id, kind: category === "friend" ? "friend" : "consultation", userText: message, assistantText: content })
        } catch {}
        const out = AgentResponseSchema.parse({
          response: content,
          actions: [],
          conversation_id,
          metadata: { mode: "gpu", provider: "gemini", access, rate_limited: true, retry_after_sec: retryAfter ?? undefined, gemini_error: geminiErr, duration_ms: Date.now() - started },
        })
        return NextResponse.json(out)
      }

      const actions = normalizeActions(ruleBasedActionsGuess())
      const content = actions.length ? "Được, mình sẽ mở trang phù hợp." : "Mình gặp sự cố khi gọi agent (Gemini). Bạn thử lại giúp mình."
      try {
        await persistChatTurn({ sessionId: conversation_id, kind: category === "friend" ? "friend" : "consultation", userText: message, assistantText: content })
      } catch {}
      const out = AgentResponseSchema.parse({
        response: content,
        actions,
        conversation_id,
        metadata: { mode: "cpu", provider: "gemini", access, fallback: "local_rule_based", gemini_error: geminiErr, duration_ms: Date.now() - started },
      })
      return NextResponse.json(out)
    }

    const actionsRaw = toolCallsToActions(r.toolCalls)
    const actions = normalizeActions(actionsRaw)
      .map((a) => {
        if (a.type === "open_screening") return { type: "navigate", args: { path: "/sang-loc" } }
        if (a.type === "open_therapy") return { type: "navigate", args: { path: "/tri-lieu" } }
        if (a.type === "open_reminders") return { type: "navigate", args: { path: "/nhac-nho" } }
        return a
      })
      .map((a) => {
        if (a.type === "navigate") {
          const p = String(a.args?.path || "").trim()
          if (!isAllowedPath(p)) return null
          return { ...a, args: { path: p } }
        }
        if (a.type === "speak") {
          const t = String((a as any)?.args?.text || "").trim()
          if (!t) return null
          const text = t.length > 800 ? t.slice(0, 800) : t
          return { type: "speak", args: { text } }
        }
        return null
      })
      .filter(Boolean) as any

    const content = r.text || (actions.length ? "Đã thực hiện yêu cầu." : "Mình chưa rõ bạn muốn mình thực hiện hành động nào.")
    try {
      await persistChatTurn({ sessionId: conversation_id, kind: category === "friend" ? "friend" : "consultation", userText: message, assistantText: content })
    } catch {}

    const out = AgentResponseSchema.parse({
      response: content,
      actions,
      conversation_id,
      metadata: { mode: "gpu", provider: "gemini", access, model: r.model, duration_ms: Date.now() - started },
    })
    return NextResponse.json(out)
  } catch (e: any) {
    return NextResponse.json(
      AgentResponseSchema.parse({
        response: "Xin lỗi, agent đang gặp sự cố kỹ thuật. Bạn thử lại giúp mình.",
        actions: [],
        metadata: { mode: "cpu", provider: "agent", error: "internal_error", duration_ms: Date.now() - started },
      }),
      { status: 200 }
    )
  }
}
