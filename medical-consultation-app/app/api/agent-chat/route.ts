import { NextResponse } from "next/server"
import crypto from "crypto"
import { GeminiService, geminiService } from "@/lib/gemini-service"
import { shouldBlock, buildBlockResponse } from "@/lib/safety"
import { assessSos, buildSosResponse } from "@/lib/sos-mode"
import { geminiToolDeclarations, toolCallsToActions } from "@/lib/agent-tools"
import { AgentResponseSchema, isAllowedPath, normalizeActions } from "@/lib/agent-actions"
import { persistChatTurn } from "@/lib/chat-persistence"
import { runLocalAgent } from "@/lib/agent-local-provider"
import { buildNavLinkMessage, planChunkedMessages } from "@/lib/chat-delivery"
import { getRateLimit } from "@/lib/rate-limiter"
import { retryWithBackoff } from "@/lib/retry-backoff"

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
    const deliveryMode = body?.delivery_mode === "live" ? "live" : "chunked"
    const userId = String(body?.user_id || conversation_id || "unknown").trim()

    if (!message) return NextResponse.json({ error: "Message is required" }, { status: 400 })

    // Check rate limit
    const rateLimitCheck = getRateLimit(userId)
    if (!rateLimitCheck.allowed) {
      return NextResponse.json(
        {
          error: "Rate limit exceeded",
          details: `Too many requests. Please wait ${rateLimitCheck.retryAfter}s before trying again`,
          retry_after: rateLimitCheck.retryAfter,
        },
        { status: 429, headers: { "Retry-After": String(rateLimitCheck.retryAfter || 60) } }
      )
    }

    const planResponseMessages = (content: string, actions: any[]) => {
      const msgs: any[] = []
      
      // Add text content first
      if (deliveryMode === "chunked") {
        const planned = planChunkedMessages(content)
        if (planned.length) {
          msgs.push(...planned)
        } else {
          msgs.push({ content: String(content || "").trim() || " ", kind: "text", delay_ms: 0 })
        }
      } else {
        msgs.push({ content: String(content || "").trim() || " ", kind: "text", delay_ms: 0 })
      }
      
      // Process actions and add special messages
      if (Array.isArray(actions)) {
        for (const action of actions) {
          if (!action?.type) continue
          
          // Navigate action - add navigation link
          if (action.type === "navigate" && isAllowedPath(String(action?.args?.path || ""))) {
            const p = String(action.args.path).trim()
            msgs.push(buildNavLinkMessage(p))
          }
          
          // Ask navigation - add prompt message
          if (action.type === "ask_navigation") {
            msgs.push({
              content: "",
              kind: "ask_navigation",
              delay_ms: 300,
              data: {
                feature: action.args?.feature,
                reason: action.args?.reason || "Bạn muốn mở tính năng này không?",
                context: action.args?.context || {},
              },
            })
          }
          
          // Embed - add embed message
          if (action.type === "embed") {
            msgs.push({
              content: "",
              kind: "embed",
              delay_ms: 300,
              data: {
                feature: action.args?.feature,
                context: action.args?.context || {},
              },
            })
          }
          
          // Play music - add music player
          if (action.type === "play_music") {
            msgs.push({
              content: "",
              kind: "play_music",
              delay_ms: 200,
              data: {
                videoId: action.args?.videoId,
                title: action.args?.title,
                artist: action.args?.artist,
                autoplay: action.args?.autoplay !== false,
              },
            })
          }
          
          // Recommend music - add music list
          if (action.type === "recommend_music") {
            msgs.push({
              content: "",
              kind: "recommend_music",
              delay_ms: 300,
              data: {
                recommendations: action.args?.recommendations || [],
                mood: action.args?.mood,
                message: action.args?.message,
              },
            })
          }
        }
      }
      
      return msgs.length ? msgs : [{ content: String(content || "").trim() || " ", kind: "text", delay_ms: 0 }]
    }

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
        messages: planResponseMessages(content, []),
        delivery: { mode: deliveryMode },
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
        messages: planResponseMessages(content, []),
        delivery: { mode: deliveryMode },
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
            messages: planResponseMessages(content, actions),
            delivery: { mode: deliveryMode },
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
          messages: planResponseMessages(content, actions),
          delivery: { mode: deliveryMode },
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
      return NextResponse.json(
        AgentResponseSchema.parse({
          response: content,
          messages: planResponseMessages(content, actions),
          delivery: { mode: deliveryMode },
          actions,
          conversation_id,
          metadata: { mode: "cpu", provider, duration_ms: Date.now() - started },
        }),
        { status: 200 }
      )
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
        messages: planResponseMessages(content, actions),
        delivery: { mode: deliveryMode },
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
      
      // Wrap Gemini call with exponential backoff retry
      r = await retryWithBackoff(
        () => svc.generateAgent({ category, tier, question: message, messages, tools: toolDecl }),
        { maxRetries: 3, initialDelayMs: 500, maxDelayMs: 5000, backoffMultiplier: 2 }
      )
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
      const is429 =
        String(geminiErr || "").includes(" 429 ") ||
        String(geminiErr || "").includes("RESOURCE_EXHAUSTED") ||
        String(geminiErr || "").includes("\"code\": 429")
      if (is429) {
        const content = retryAfter
          ? `Hiện Gemini đang giới hạn lượt dùng. Bạn thử lại sau khoảng ${retryAfter}s, hoặc nhập API key/pass để tiếp tục.`
          : "Hiện Gemini đang giới hạn lượt dùng. Bạn thử lại sau, hoặc nhập API key/pass để tiếp tục."
        try {
          await persistChatTurn({ sessionId: conversation_id, kind: category === "friend" ? "friend" : "consultation", userText: message, assistantText: content })
        } catch {}
        const out = AgentResponseSchema.parse({
          response: content,
          messages: planResponseMessages(content, []),
          delivery: { mode: deliveryMode },
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
        messages: planResponseMessages(content, actions),
        delivery: { mode: deliveryMode },
        actions,
        conversation_id,
        metadata: { mode: "cpu", provider: "gemini", access, fallback: "local_rule_based", gemini_error: geminiErr, duration_ms: Date.now() - started },
      })
      return NextResponse.json(out)
    }

    const actionsRaw = toolCallsToActions(r.toolCalls)
    // Also try to extract actions from text response (JSON format)
    let textActions: any[] = []
    try {
      const jsonMatch = r.text.match(/\{[\s\S]*"actions"[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0])
        if (Array.isArray(parsed.actions)) {
          textActions = parsed.actions
        }
      }
    } catch (e) {
      // Silently ignore JSON parsing errors
    }
    
    // Debug logging
    console.log('[v0] Agent response:', {
      toolCallsCount: r.toolCalls?.length || 0,
      textActionsCount: textActions.length,
      messagePreview: r.text.substring(0, 100),
      hasJson: !!textActions.length,
    })
    
    // Intelligent action detection - if LLM says it can help with therapy/exercises, FORCE navigate to tri-lieu
    const intelligentActionForcing = () => {
      const msg = String(message || '').toLowerCase()
      const response = String(r?.text || '').toLowerCase()
      
      const actions: any[] = []
      
      // User asks about therapy methods/exercises and LLM offers to help
      if ((msg.includes('liệu pháp') || msg.includes('trị liệu') || msg.includes('bài tập') || msg.includes('cách') || msg.includes('phương pháp')) &&
          (response.includes('hỗ trợ') || response.includes('tập') || response.includes('phương pháp') || response.includes('liệu pháp'))) {
        actions.push({ 
          type: 'embed', 
          args: { 
            feature: 'tri-lieu', 
            context: { fromAgent: true, reason: 'Dựa trên câu hỏi của bạn' } 
          } 
        })
        actions.push({
          type: 'ask_navigation',
          args: { feature: 'tri-lieu', reason: 'Bạn muốn xem các bài tập trị liệu được gợi ý không?' }
        })
      }
      
      // User asks about anxiety/stress relief + agent mentions it can help
      if ((msg.includes('lo âu') || msg.includes('stress') || msg.includes('căng thẳng') || msg.includes('thư giãn')) &&
          (response.includes('nhạc') || response.includes('thư giãn') || response.includes('bài tập'))) {
        // Add music recommendations
        actions.push({
          type: 'recommend_music',
          args: {
            mood: 'calm',
            recommendations: [
              { videoId: 'ZHf2bTjvXr0', title: 'Relaxing Piano Music', mood: 'calm' },
              { videoId: 'cjVVmezr-t8', title: 'Peaceful Meditation Music', mood: 'meditation' },
              { videoId: 'Js8Qf4vGI70', title: 'Calming Sleep Music', mood: 'sleep' }
            ],
            message: 'Hãy nghe một số bài nhạc thư giãn để giảm lo âu'
          }
        })
        // Also add therapy embed
        actions.push({
          type: 'embed',
          args: { feature: 'tri-lieu', context: { fromAgent: true } }
        })
      }
      
      // User asks about screening/assessment
      if ((msg.includes('sàng lọc') || msg.includes('kiểm tra') || msg.includes('đánh giá') || msg.includes('test') || msg.includes('tâm lý')) &&
          !msg.includes('trị liệu')) {
        actions.push({
          type: 'ask_navigation',
          args: { feature: 'sang-loc', reason: 'Bạn muốn thử sàng lọc tâm lý để hiểu bản thân tốt hơn không?' }
        })
      }
      
      // User asks about doctors/appointments
      if (msg.includes('bác sĩ') || msg.includes('tư vấn') || msg.includes('đặt lịch')) {
        actions.push({
          type: 'ask_navigation',
          args: { feature: 'bac-si', reason: 'Bạn muốn tìm và đặt lịch với bác sĩ chuyên khoa không?' }
        })
      }
      
      // User asks about diseases/medicines
      if ((msg.includes('bệnh') || msg.includes('thuốc') || msg.includes('triệu chứng')) &&
          !msg.includes('liệu pháp')) {
        actions.push({
          type: 'ask_navigation',
          args: { feature: 'tra-cuu', reason: 'Bạn muốn tra cứu thêm thông tin chi tiết về bệnh/thuốc không?' }
        })
      }
      
      return actions.filter(a => a?.type)
    }
    
    const forcedActions = intelligentActionForcing()
    const combinedActions = [...actionsRaw, ...textActions, ...forcedActions]
    const actions = normalizeActions(combinedActions.filter(a => a?.type))
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
      messages: planResponseMessages(content, actions),
      delivery: { mode: deliveryMode },
      actions,
      conversation_id,
      metadata: { mode: "gpu", provider: "gemini", access, model: r.model, duration_ms: Date.now() - started },
    })
    return NextResponse.json(out)
  } catch (e: any) {
    return NextResponse.json(
      AgentResponseSchema.parse({
        response: "Xin lỗi, agent đang gặp sự cố kỹ thuật. Bạn thử lại giúp mình.",
        messages: [{ content: "Xin lỗi, agent đang gặp sự cố kỹ thuật. Bạn thử lại giúp mình.", kind: "text", delay_ms: 0 }],
        delivery: { mode: "chunked" },
        actions: [],
        metadata: { mode: "cpu", provider: "agent", error: "internal_error", duration_ms: Date.now() - started },
      }),
      { status: 200 }
    )
  }
}
