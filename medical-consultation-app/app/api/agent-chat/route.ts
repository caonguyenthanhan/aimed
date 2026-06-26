import { NextResponse } from "next/server"
import crypto from "crypto"
import fs from "fs"
import path from "path"
import { GeminiService, geminiService } from "@/lib/gemini-service"
import { shouldBlock, buildBlockResponse } from "@/lib/safety"
import { appendMedicalDisclaimer } from "@/lib/medical-disclaimer"
import { assessSos, buildSosResponse } from "@/lib/sos-mode"
import { geminiToolDeclarations, toolCallsToActions } from "@/lib/agent-tools"
// Temporarily disabled to isolate runtime error
// import { detectPatientScenario, getConsultationStylePrompt } from "@/lib/patient-scenarios"
import { AgentResponseSchema, ALLOWED_PATH_PREFIXES, isAllowedPath, normalizeActions } from "@/lib/agent-actions"
import { persistChatTurn } from "@/lib/chat-persistence"
import { runLocalAgent } from "@/lib/agent-local-provider"
import { buildNavLinkMessage, planChunkedMessages } from "@/lib/chat-delivery"
import { getRateLimit } from "@/lib/rate-limiter"
import { retryWithBackoff } from "@/lib/retry-backoff"
import { youtubeService } from "@/lib/youtube-service"
import { getAgentProfile } from "@/lib/agent-profiles"
import { buildSystemState, hasInternalDemoPass, isInternalDemoPass, normalizeRuntimeProvider, normalizeRuntimeTarget } from "@/lib/runtime-sync"
// Phase 2: Semantic Router + Conversation Context
import { semanticRoute, detectIntentFlags as semanticDetectIntentFlags, inferAgentProfileId as semanticInferProfileId } from "@/lib/semantic-router"
import { buildContext, mergeContextWithGatewayMeta, serializeContext } from "@/lib/conversation-context"
// Phase 3: Hallucination Guard
import { sanitizeInput, guardGraphEvidence, formatEvidenceForPrompt, buildFallbackWarning } from "@/lib/hallucination-guard"


// Allow up to 60s for Vercel serverless — FOZA via ngrok can take 40-45s
export const maxDuration = 60

type FozaCircuitState = { opened_until: number; failures: number; last_error: string }

const fozaCircuit: FozaCircuitState =
  ((globalThis as any).__mcs_foza_circuit_v1 as FozaCircuitState | undefined) || { opened_until: 0, failures: 0, last_error: "" }
;(globalThis as any).__mcs_foza_circuit_v1 = fozaCircuit

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

const withSystemState = (metadata: Record<string, any>) => {
  const provider = normalizeRuntimeProvider(metadata?.provider)
  const mode = normalizeRuntimeTarget(metadata?.mode, provider === "gemini" || provider === "foza" ? "gpu" : "cpu")
  const llmContext = metadata?.llm_context && typeof metadata.llm_context === "object" ? metadata.llm_context : {}
  return {
    ...metadata,
    system_state: buildSystemState({
      provider,
      mode,
      graph_connected: typeof metadata?.graph_connected === "boolean"
        ? metadata.graph_connected
        : Boolean(llmContext?.graph_connected ?? llmContext?.graph_injected),
      graph_injected: Boolean(llmContext?.graph_injected),
      graph_reason: typeof llmContext?.graph_reason === "string" ? llmContext.graph_reason : null,
      db_ok: null,
      fallback: typeof metadata?.fallback === "string" ? metadata.fallback : null,
      error: typeof metadata?.error === "string"
        ? metadata.error
        : (typeof metadata?.root_cause === "string" ? metadata.root_cause : (typeof metadata?.gemini_error === "string" ? metadata.gemini_error : (typeof metadata?.cpu_proxy_error === "string" ? metadata.cpu_proxy_error : null))),
      demo_mode: Boolean(metadata?.demo_mode),
      fallback_chain: Array.isArray(metadata?.fallback_chain) ? metadata.fallback_chain : [],
      graph_endpoint: typeof llmContext?.graph_endpoint === "string" ? llmContext.graph_endpoint : null,
      graph_status_code: typeof llmContext?.graph_status_code === "number" ? llmContext.graph_status_code : null,
      internal_pass_matched: Boolean(metadata?.demo_mode),
    }),
  }
}

export async function POST(req: Request) {
  const started = Date.now()
  let cpuProxyError: string | undefined
  let agentProfileIdForError = "default"
  try {
    const proxyBody: any = await req.clone().json().catch(() => null)
    const proxyMessage = String(proxyBody?.message || proxyBody?.question || "").trim()
    if (proxyMessage) {
      const cpuBase = (process.env.CPU_SERVER_URL || process.env.BACKEND_URL || "").trim().replace(/\/$/, "")
      if (cpuBase) {
        const timeoutMs = (() => {
          const n = Number.parseInt(String(process.env.AGENT_CHAT_TIMEOUT_MS || "").trim(), 10)
          return Number.isFinite(n) && n > 0 ? n : 45000
        })()
        const controller = new AbortController()
        const t = setTimeout(() => controller.abort(), timeoutMs)
        try {
          const conversation_id = String(proxyBody?.conversation_id || "").trim()
          const user_id = String(proxyBody?.user_id || "").trim()
          const agent_id = String(proxyBody?.agent_id || "auto").trim() || "auto"
          const include_tools =
            typeof proxyBody?.include_tools === "boolean"
              ? proxyBody.include_tools
              : true
          const headers: Record<string, string> = { "Content-Type": "application/json" }
          const auth = req.headers.get("authorization")
          if (auth) headers["authorization"] = auth
          const apiKey = req.headers.get("x-api-key")
          if (apiKey) headers["x-api-key"] = apiKey
          const isLive = proxyBody?.delivery_mode === "live" || proxyBody?.stream === true
          const endpoint = isLive ? "/v1/agent-chat/stream" : "/v1/agent-chat"
          const resp = await fetch(`${cpuBase}${endpoint}`, {
            method: "POST",
            headers,
            body: JSON.stringify({
              message: proxyMessage,
              conversation_id: conversation_id || undefined,
              user_id: user_id || undefined,
              agent_id,
              include_tools,
            }),
            signal: controller.signal,
          })
          if (resp.ok) {
            if (isLive && resp.body) {
              return new Response(resp.body, {
                headers: {
                  "Content-Type": "text/event-stream; charset=utf-8",
                  "Cache-Control": "no-cache",
                  "Connection": "keep-alive",
                }
              })
            }
            const raw = await resp.json().catch(() => null)
            const parsed = AgentResponseSchema.safeParse(raw)
            if (parsed.success) {
              const safeActions = normalizeActions(parsed.data.actions).map((a: any) => {
                if (a.type === "navigate") {
                  const p = String(a?.args?.path || "").trim()
                  if (!isAllowedPath(p)) return null
                  return { type: "navigate", args: { path: p } }
                }
                if (a.type === "speak") {
                  const tx = String(a?.args?.text || "").trim()
                  if (!tx) return null
                  return { type: "speak", args: { text: tx.length > 800 ? tx.slice(0, 800) : tx } }
                }
                return a
              }).filter(Boolean)
              return json({ ...parsed.data, actions: safeActions })
            }
            if (raw && typeof raw === "object" && typeof raw.response === "string") {
              return json(raw)
            }
          }
        } catch (e: any) {
          cpuProxyError = String(e?.message || e || "").slice(0, 200)
        } finally {
          clearTimeout(t)
        }
      }
    }
    const dataDir = path.join(process.cwd(), "data")
    const runtimeModePath = path.join(dataDir, "runtime-mode.json")
    const serverRegistryPath = path.join(dataDir, "server-registry.json")
    const runtimeEventsPath = path.join(dataDir, "runtime-events.jsonl")
    const runtimeMetricsPath = path.join(dataDir, "runtime-metrics.jsonl")

    const ensureDataDir = () => {
      if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true })
      if (!fs.existsSync(runtimeModePath)) {
        fs.writeFileSync(runtimeModePath, JSON.stringify({ target: "cpu", updated_at: new Date().toISOString() }, null, 2))
      }
      if (!fs.existsSync(serverRegistryPath)) {
        fs.writeFileSync(serverRegistryPath, JSON.stringify({ servers: [], updated_at: new Date().toISOString() }, null, 2))
      }
      if (!fs.existsSync(runtimeEventsPath)) fs.writeFileSync(runtimeEventsPath, "")
      if (!fs.existsSync(runtimeMetricsPath)) fs.writeFileSync(runtimeMetricsPath, "")
    }

    const appendEvent = (evt: any) => {
      try {
        ensureDataDir()
        fs.appendFileSync(runtimeEventsPath, JSON.stringify(evt) + "\n")
      } catch {}
    }

    const appendMetric = (metric: any) => {
      try {
        ensureDataDir()
        fs.appendFileSync(runtimeMetricsPath, JSON.stringify(metric) + "\n")
      } catch {}
    }

    const readRuntimeRouting = (): { target: "cpu" | "gpu"; gpuBaseUrl: string } => {
      try {
        ensureDataDir()
      } catch {}
      const envGpuBase = (process.env.GPU_SERVER_URL || process.env.DEFAULT_GPU_URL || "").trim().replace(/\/$/, "")
      const cpuBase = (process.env.CPU_SERVER_URL || process.env.BACKEND_URL || "").trim().replace(/\/$/, "")
      const localGpuFallback = envGpuBase || "http://127.0.0.1:8001"
      const localCpuFallback = cpuBase ? cpuBase : "http://127.0.0.1:8000"

      let target: "cpu" | "gpu" = "gpu"
      let gpuBaseUrl = localGpuFallback
      try {
        const raw = fs.readFileSync(runtimeModePath, "utf-8")
        const mode = JSON.parse(raw)
        if (mode?.target === "cpu" || mode?.target === "gpu") target = mode.target
        if (mode?.gpu_url) gpuBaseUrl = String(mode.gpu_url).replace(/\/$/, "")
      } catch {}

      if (target === "cpu") {
        return { target: "cpu", gpuBaseUrl: localCpuFallback }
      }

      try {
        const raw = fs.readFileSync(serverRegistryPath, "utf-8")
        const reg = JSON.parse(raw)
        const servers = Array.isArray(reg?.servers) ? reg.servers : []
        const active = servers.filter((s: any) => s?.status === "active")
        const latest = (active.length ? active : servers).sort(
          (a: any, b: any) => new Date(b?.updated_at || 0).getTime() - new Date(a?.updated_at || 0).getTime()
        )[0]
        if (latest?.url) gpuBaseUrl = String(latest.url).replace(/\/$/, "")
      } catch {}

      return { target, gpuBaseUrl }
    }

    const firstJsonObject = (text: string) => {
      const s = String(text || "").trim()
      if (!s) return null
      const start = s.indexOf("{")
      if (start < 0) return null
      let depth = 0
      let inStr = false
      let esc = false
      for (let i = start; i < s.length; i++) {
        const ch = s[i]
        if (inStr) {
          if (esc) {
            esc = false
          } else if (ch === "\\") {
            esc = true
          } else if (ch === "\"") {
            inStr = false
          }
          continue
        }
        if (ch === "\"") {
          inStr = true
          continue
        }
        if (ch === "{") depth++
        if (ch === "}") depth--
        if (depth === 0) return s.slice(start, i + 1)
      }
      return null
    }

    const toInt = (v: any, def: number) => {
      const n = Number.parseInt(String(v ?? "").trim(), 10)
      return Number.isFinite(n) && n > 0 ? n : def
    }
    const agentOverallTimeoutMs = toInt(process.env.AGENT_CHAT_TIMEOUT_MS, 45000)
    const agentLocalTimeoutMs = toInt(process.env.AGENT_CHAT_LOCAL_TIMEOUT_MS, 20000)
    const agentGeminiTimeoutMs = toInt(process.env.AGENT_CHAT_GEMINI_TIMEOUT_MS, 20000)
    const agentMcpTimeoutMs = toInt(process.env.AGENT_CHAT_MCP_TOOL_TIMEOUT_MS, 8000)
    const agentMcpMaxCalls = toInt(process.env.AGENT_CHAT_MCP_MAX_CALLS, 3)
    const deadline = started + agentOverallTimeoutMs
    const remainingMs = () => Math.max(0, deadline - Date.now())

    const callMcp = async (name: string, args: any) => {
      const left = remainingMs()
      if (left <= 0) throw new Error("timeout:overall")
      const timeoutMs = Math.max(500, Math.min(agentMcpTimeoutMs, left))
      const url = new URL("/api/mcp/call", req.url).toString()
      const controller = new AbortController()
      const t = setTimeout(() => controller.abort(), timeoutMs)
      const resp = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, args: args || {} }), signal: controller.signal }).finally(() => clearTimeout(t))
      const json = await resp.json().catch(() => null)
      if (!resp.ok) throw new Error(String(json?.error || `tool_error:${resp.status}`))
      return json
    }

    const formatSeconds = (sec: number | undefined) => {
      const s = Math.max(0, Math.floor(Number(sec || 0)))
      const h = Math.floor(s / 3600)
      const m = Math.floor((s % 3600) / 60)
      const ss = s % 60
      const mm = String(m).padStart(2, "0")
      const sss = String(ss).padStart(2, "0")
      if (h > 0) return `${h}:${mm}:${sss}`
      return `${m}:${sss}`
    }

    const body: any = await req.json().catch(() => null)
    const message = String(body?.message || body?.question || "").trim()
    const conversation_id = String(body?.conversation_id || "").trim() || crypto.randomUUID()
    const messages = Array.isArray(body?.messages) ? body.messages : []
    const tier = body?.tier === "pro" ? "pro" : "flash"
    const category = body?.category === "friend" ? "friend" : "consultation"
    const accessPass = String(body?.access_pass || "").trim()
    const deliveryMode = body?.delivery_mode === "live" ? "live" : "chunked"
    const userId = String(body?.user_id || conversation_id || "unknown").trim()
    const configuredAgentProvider =
      (typeof body?.provider === "string" && String(body.provider).trim() ? String(body.provider).trim() : "") ||
      String(process.env.AGENT_PROVIDER || "").trim()
    const agentProvider = String(configuredAgentProvider || "").trim().toLowerCase()
    const requestedProvider = agentProvider || "auto"
    let rootCause: string | undefined
    let graphReason: string | undefined
    let graphStatusCode: number | undefined
    let graphEndpoint: string | undefined
    const fallbackChain: string[] = [requestedProvider]
    // Phase 2: detectIntentFlags + inferAgentProfileId đã được chuyển sang lib/semantic-router.ts
    // Sử dụng: semanticDetectIntentFlags() và semanticInferProfileId() (imported ở trên)

    const requestedAgentId = String(body?.agent_id || body?.agent_profile || body?.agent || "").trim()
    const agentProfileSource = !requestedAgentId || requestedAgentId.toLowerCase() === "auto" ? "auto" : "explicit"

    // Phase 2: Semantic Router — thay thế inline detectIntentFlags + inferAgentProfileId
    const intentFlags = await semanticDetectIntentFlags(message, Array.isArray(messages) ? messages : [])
    const agentProfileId = !requestedAgentId || requestedAgentId.toLowerCase() === "auto"
      ? await semanticInferProfileId(message, Array.isArray(messages) ? messages : [])
      : requestedAgentId
    agentProfileIdForError = agentProfileId
    const agentProfile = getAgentProfile(agentProfileId)

    // Phase 2: Conversation Context — theo dõi tiến trình hội thoại
    const conversationCtx = buildContext(
      conversation_id || "",
      agentProfile.id as any,
      Array.isArray(messages) ? messages : []
    )

    // Phase 2: buildSystemPrompt() từ prompt-builder.ts — inject conversationCtx động
    const { buildSystemPrompt, buildFallbackActions } = await import("@/lib/prompt-builder")

    // Phase 3: Sanitize user input — chống Prompt Injection
    const sanitized = sanitizeInput(message, { maxLength: 3000, context: "user_input" })
    const safeMessage = sanitized.clean
    if (sanitized.injectionDetected) {
      console.warn(`[HallucinationGuard] Injection attempt detected in message. Patterns: ${sanitized.detectedPatterns.join(", ")}`)
    }

    const persona = buildSystemPrompt(agentProfile.id as any, conversationCtx, { includeJsonSchema: true })
    let personaForLLM = persona
    let graphEvidence: any = null
    let graphInjected = false
    let graphToolCalled = false

    if (!message) return json({ error: "Message is required" }, { status: 400 })

    // Check rate limit
    const rateLimitCheck = getRateLimit(userId)
    if (!rateLimitCheck.allowed) {
      return json(
        {
          error: "Rate limit exceeded",
          details: `Too many requests. Please wait ${rateLimitCheck.retryAfter}s before trying again`,
          retry_after: rateLimitCheck.retryAfter,
        },
        { status: 429, headers: { "Retry-After": String(rateLimitCheck.retryAfter || 60) } }
      )
    }

    type GatewayTriageMeta = {
      active: boolean
      ready_for_cta: boolean | null
      risk_level: string | null
      follow_up_questions: string[]
    }

    const normalizeQuestionList = (value: unknown) => {
      if (!Array.isArray(value)) return []
      return value
        .map((item) => String(item || "").trim())
        .filter(Boolean)
        .slice(0, 6)
    }

    const readGatewayTriageMeta = (metadata?: any): GatewayTriageMeta => {
      const rawMetadata = metadata && typeof metadata === "object" ? metadata : {}
      const rawTriage = rawMetadata?.triage && typeof rawMetadata.triage === "object" ? rawMetadata.triage : {}
      const metadataProfile = String(rawMetadata?.agent_profile || rawMetadata?.agent_profile_id || "").trim().toLowerCase()
      const riskLevel = String(rawTriage?.risk_level || rawMetadata?.risk_level || "").trim().toLowerCase() || null
      const followUpQuestions = normalizeQuestionList(
        rawTriage?.triage_follow_up_questions ?? rawTriage?.follow_up_questions ?? rawMetadata?.triage_follow_up_questions
      )
      return {
        active: metadataProfile === "triage" || agentProfile.id === "triage",
        ready_for_cta: typeof rawTriage?.ready_for_cta === "boolean" ? rawTriage.ready_for_cta : null,
        risk_level: riskLevel,
        follow_up_questions: followUpQuestions,
      }
    }

    const isEmergencyTriage = (triageMeta?: GatewayTriageMeta) =>
      Boolean(triageMeta?.active && triageMeta.risk_level === "emergency")

    const shouldHoldTriageCta = (triageMeta?: GatewayTriageMeta) =>
      Boolean(triageMeta?.active && !isEmergencyTriage(triageMeta) && triageMeta.ready_for_cta !== true)

    const buildTriageFollowUpPrompt = (triageMeta?: GatewayTriageMeta) => {
      const questions = triageMeta?.follow_up_questions || []
      if (questions.length) {
        return [
          "Để đánh giá an toàn hơn, bạn cho mình biết thêm:",
          ...questions.map((question) => `- ${question}`),
        ].join("\n")
      }
      return "Để đánh giá an toàn hơn, bạn cho mình biết thêm: triệu chứng chính, bắt đầu từ khi nào, mức độ hiện tại, sốt/khó thở/đau ngực có hay không, bệnh nền và thuốc đang dùng?"
    }

    const buildTriageMetadata = (triageMeta?: GatewayTriageMeta) => {
      if (!triageMeta?.active) return undefined
      return {
        ready_for_cta: triageMeta.ready_for_cta,
        risk_level: triageMeta.risk_level,
        triage_follow_up_questions: triageMeta.follow_up_questions,
      }
    }

    const isDoctorNavigationAction = (action: any) => {
      const type = String(action?.type || "").trim()
      if (!type) return false
      const feature = String(action?.args?.feature || "").trim().toLowerCase()
      const pathValue = String(action?.args?.path || "").trim().toLowerCase()
      const reason = String(action?.args?.reason || action?.args?.text || "").trim().toLowerCase()
      if (type === "ask_navigation" && feature === "bac-si") return true
      if (type === "navigate" && pathValue.startsWith("/bac-si")) return true
      return reason.includes("115") || reason.includes("bác sĩ") || reason.includes("đặt lịch")
    }

    const applyTriageActionGuard = (inputActions: any[], triageMeta?: GatewayTriageMeta) => {
      const actions = Array.isArray(inputActions) ? [...inputActions] : []
      if (!triageMeta?.active) return actions
      if (isEmergencyTriage(triageMeta)) {
        const hasEmergencyAction = actions.some((action) => isDoctorNavigationAction(action))
        if (hasEmergencyAction) return actions
        return [
          ...actions,
          {
            type: "ask_navigation",
            args: {
              feature: "bac-si",
              reason: "Đây có thể là tình huống khẩn cấp. Hãy gọi 115 ngay hoặc đến cơ sở y tế gần nhất. Bạn muốn mở mục Bác sĩ để xem hướng dẫn tiếp theo không?",
            },
          },
        ]
      }
      if (!shouldHoldTriageCta(triageMeta)) return actions
      return actions.filter((action) => !isDoctorNavigationAction(action))
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

    const ensureAssistantText = (raw: string, actions: any[], triageMeta?: GatewayTriageMeta) => {
      const t = String(raw || "").trim()
      if (t && t !== " " && t.length >= 20) return t
      const wantDoctor = intentFlags.doctor || agentProfile.id === "doctor_referral"
      const wantLookup = intentFlags.medication
      const wantPlan = intentFlags.plan
      const wantTherapy = intentFlags.therapy
      const wantTriage = intentFlags.triage
      const holdTriageCta = shouldHoldTriageCta(triageMeta)
      const emergencyTriage = isEmergencyTriage(triageMeta)
      const hints: string[] = []
      if (wantTriage || triageMeta?.active) hints.push(emergencyTriage ? "Mức ưu tiên: khẩn cấp." : "Mức ưu tiên: an toàn trước (triage).")
      if (wantDoctor && !holdTriageCta) hints.push("Nếu bạn muốn gặp bác sĩ, mình có thể gợi ý mở mục Bác sĩ/Đặt hẹn.")
      if (wantLookup) hints.push("Nếu cần tra cứu thuốc/bệnh, mình có thể gợi ý mở Tra cứu để kiểm chứng.")
      if (wantPlan) hints.push("Nếu bạn muốn theo dõi/kế hoạch, mình có thể gợi ý mở Kế hoạch.")
      if (wantTherapy) hints.push("Nếu bạn cần bài tập thư giãn, mình có thể gợi ý mở Trị liệu.")
      const followUp = holdTriageCta
        ? buildTriageFollowUpPrompt(triageMeta)
        : "Bạn cho mình biết thêm: tuổi/giới, triệu chứng chính, bắt đầu khi nào, mức độ, bệnh nền/thuốc đang dùng?"
      const actionLine = Array.isArray(actions) && actions.length ? "Mình cũng đã chuẩn bị nút/hành động phù hợp ở dưới." : ""
      return [hints.join(" "), actionLine, followUp].filter(Boolean).join("\n")
    }

    const buildGatewayFallbackActions = (triageMeta?: GatewayTriageMeta) => {
      const lower = message.toLowerCase()
      const ascii = lower.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      
      const hasEmergencyRedFlags = 
        lower.includes("đau ngực") || lower.includes("khó thở") || lower.includes("tự tử") || lower.includes("tự sát") ||
        ascii.includes("dau nguc") || ascii.includes("kho tho") || ascii.includes("tu tu") || ascii.includes("tu sat")

      if (hasEmergencyRedFlags) {
        return [{ type: "ask_navigation", args: { feature: "bac-si", reason: "Triệu chứng này có thể cần bác sĩ đánh giá sớm để loại trừ nguy cơ cấp cứu." } }]
      }

      if (isEmergencyTriage(triageMeta)) {
        return applyTriageActionGuard([{ type: "ask_navigation", args: { feature: "bac-si", reason: "Đây có thể là tình huống khẩn cấp. Hãy gọi 115 ngay hoặc đến cơ sở y tế gần nhất." } }], triageMeta)
      }
      if (triageMeta?.active) return []
      if (intentFlags.triage) {
        return [{ type: "ask_navigation", args: { feature: "bac-si", reason: "Triệu chứng này có thể cần bác sĩ đánh giá sớm để loại trừ nguy cơ cấp cứu." } }]
      }
      if (agentProfile.id === "medication") return [{ type: "ask_navigation", args: { feature: "tra-cuu", reason: "Mở tra cứu để xem thông tin thuốc/tương tác chính xác hơn." } }]
      if (agentProfile.id === "care_plan") return [{ type: "ask_navigation", args: { feature: "ke-hoach", reason: "Mở kế hoạch chăm sóc để lập lộ trình theo dõi cụ thể." } }]
      if (agentProfile.id === "therapy") return [{ type: "ask_navigation", args: { feature: "tri-lieu", reason: "Mở trị liệu để xem bài tập thở/grounding và kỹ thuật giảm căng thẳng." } }]
      if (agentProfile.id === "doctor_referral") return [{ type: "ask_navigation", args: { feature: "bac-si", reason: "Mở bác sĩ để xem hồ sơ và đặt hẹn." } }]
      if (lower.match(/(bác sĩ|đặt hẹn|đặt lịch|khám|tư vấn trực tiếp|hẹn khám)/) || ascii.match(/(bac si|dat hen|dat lich|kham|tu van truc tiep|hen kham)/)) {
        return [{ type: "ask_navigation", args: { feature: "bac-si", reason: "Mở bác sĩ để xem hồ sơ và đặt hẹn." } }]
      }
      if (lower.includes("sàng lọc") || ascii.includes("sang loc")) return [{ type: "navigate", args: { path: "/sang-loc" } }]
      if (lower.includes("trị liệu") || ascii.includes("tri lieu")) return [{ type: "navigate", args: { path: "/tri-lieu" } }]
      if (lower.includes("nhắc nhở") || ascii.includes("nhac nho")) return [{ type: "navigate", args: { path: "/nhac-nho" } }]
      if (lower.match(/(thuốc|tương tác|liều|uống.*thuốc|tác dụng phụ)/) || ascii.match(/(thuoc|tuong tac|lieu|uong.*thuoc|tac dung phu)/)) {
        return [{ type: "ask_navigation", args: { feature: "tra-cuu", reason: "Mở tra cứu để xem thông tin thuốc/tương tác chính xác hơn." } }]
      }
      if (lower.match(/(kế hoạch|lộ trình|theo dõi|mục tiêu|nhật ký|routine)/) || ascii.match(/(ke hoach|lo trinh|theo doi|muc tieu|nhat ky|routine)/)) {
        return [{ type: "ask_navigation", args: { feature: "ke-hoach", reason: "Mở kế hoạch chăm sóc để lập lộ trình theo dõi cụ thể." } }]
      }
      if (lower.match(/(lo âu|hoảng loạn|trầm cảm|mất ngủ|căng thẳng|stress|tự hại|tự sát)/) || ascii.match(/(lo au|hoang loan|tram cam|mat ngu|cang thang|stress|tu hai|tu sat)/)) {
        return [{ type: "ask_navigation", args: { feature: "sang-loc", reason: "Mở sàng lọc để đánh giá mức độ và chọn hướng hỗ trợ phù hợp." } }]
      }
      return []
    }

    const sos = assessSos(message, messages)
    if (sos.triggered) {
      const content = buildSosResponse(sos.hotlines)
      try {
        await persistChatTurn({ sessionId: conversation_id, kind: category === "friend" ? "friend" : "consultation", userText: message, assistantText: content })
      } catch {}
      appendMetric({ ts: new Date().toISOString(), mode: "cpu", provider: "sos", duration_ms: Date.now() - started })
      return json({
        response: content,
        messages: planResponseMessages(content, []),
        delivery: { mode: deliveryMode },
        actions: [],
        conversation_id,
        metadata: withSystemState({ mode: "cpu", provider: "server", sos: true, hotlines: sos.hotlines, reasons: sos.reasons, situation: "sos", agent_profile: agentProfile.id, duration_ms: Date.now() - started, intent: intentFlags }),
      })
    }

    const safetyHits = shouldBlock(message, messages)
    if (safetyHits.length) {
      const content = buildBlockResponse(safetyHits)
      try {
        await persistChatTurn({ sessionId: conversation_id, kind: category === "friend" ? "friend" : "consultation", userText: message, assistantText: content })
      } catch {}
      appendMetric({ ts: new Date().toISOString(), mode: "cpu", provider: "safety", duration_ms: Date.now() - started })
      return json({
        response: content,
        messages: planResponseMessages(content, []),
        delivery: { mode: deliveryMode },
        actions: [],
        conversation_id,
        metadata: withSystemState({ mode: "cpu", provider: "server", blocked: true, hits: safetyHits, situation: "safety", agent_profile: agentProfile.id, duration_ms: Date.now() - started, intent: intentFlags }),
      })
    }

    const graphEnabled =
      String(process.env.AGENT_GRAPH_EVIDENCE || "1").trim() !== "0" &&
      body?.graph_evidence !== false &&
      body?.disable_graph !== true

    if (graphEnabled) {
      try {
        graphToolCalled = true
        const out = await callMcp("graph.evidence", { query: message, limit: 80, entity_limit: 6 })
        graphEvidence = out?.result || null
        graphEndpoint = out?.metadata?.upstream ?? undefined
        graphStatusCode = out?.metadata?.status_code ?? undefined

        // Phase 3: Hallucination Guard — re-rank + sanitize + fallback logic
        const guardResult = guardGraphEvidence(graphEvidence, message, {
          maxEntities: 6,
          maxEdges: 80,
          sanitizeEvidence: true,
        })

        if (guardResult.hasEvidence && guardResult.sanitizedEvidence) {
          // Có bằng chứng tin cậy — inject vào prompt
          const evidenceStr = formatEvidenceForPrompt(guardResult.sanitizedEvidence, 6000)
          personaForLLM = buildSystemPrompt(agentProfile.id as any, conversationCtx, {
            includeJsonSchema: true,
            graphEvidence: evidenceStr,
          })
          graphInjected = true
          graphEvidence = guardResult.sanitizedEvidence
        } else {
          // Không có bằng chứng hoặc graph down — thêm warning explicit vào prompt
          graphReason = guardResult.reason
          graphInjected = false
          if (guardResult.fallbackWarning) {
            // Inject warning vào system prompt để LLM biết rõ: "không có bằng chứng"
            personaForLLM = [
              persona,
              guardResult.fallbackWarning,
            ].join("\n\n")
          }
          if (guardResult.stats.injectionAttemptsBlocked > 0) {
            console.warn(`[HallucinationGuard] ${guardResult.stats.injectionAttemptsBlocked} injection(s) blocked in graph evidence`)
          }
        }
      } catch (e: any) {
        graphEvidence = null
        graphInjected = false
        graphToolCalled = false
        graphReason = "graph_down"
        // Phase 3: Inject explicit warning khi graph down — tránh LLM bịa chứng
        personaForLLM = [persona, buildFallbackWarning("graph_down")].join("\n\n")
      }
    }

    const { target: originalTarget, gpuBaseUrl } = readRuntimeRouting()
    const allow = [...ALLOWED_PATH_PREFIXES]
    const cpuBase = (process.env.CPU_SERVER_URL || process.env.BACKEND_URL || "").trim().replace(/\/$/, "")
    const cpuUrl = (process.env.LOCAL_AGENT_URL || process.env.INTERNAL_LLM_URL || (cpuBase ? `${cpuBase}/v1/chat/completions` : "") || "http://127.0.0.1:8000/v1/chat/completions").trim()
    const gpuUrl = `${String(gpuBaseUrl || "").replace(/\/$/, "")}/v1/chat/completions`
    const gpuModel = (process.env.GPU_OPENAI_MODEL || process.env.GPU_LLM_MODEL || process.env.DEFAULT_GPU_MODEL || "").trim() || "default"
    const localModel = (process.env.LOCAL_AGENT_MODEL || process.env.LOCAL_LLM_MODEL || "").trim() || "local-agent"

    const normalizeOpenAiSchema = (schema: any): any => {
      if (!schema || typeof schema !== "object") return schema
      if (Array.isArray(schema)) return schema.map(normalizeOpenAiSchema)
      const t = String((schema as any)?.type || "")
      const mapped =
        t === "OBJECT" ? "object"
        : t === "STRING" ? "string"
        : t === "NUMBER" ? "number"
        : t === "ARRAY" ? "array"
        : t === "BOOLEAN" ? "boolean"
        : t
      const out: any = { ...schema }
      if (mapped) out.type = mapped
      if (out.properties) out.properties = Object.fromEntries(Object.entries(out.properties).map(([k, v]) => [k, normalizeOpenAiSchema(v)]))
      if (out.items) out.items = normalizeOpenAiSchema(out.items)
      return out
    }

    const runOpenAiJsonAgent = async (url: string, model: string) => {
      const left = remainingMs()
      if (left <= 0) return null
      const timeoutMs = Math.max(800, Math.min(agentLocalTimeoutMs, left))
      const out = await runLocalAgent({ url, model, message, history: messages, allowPaths: allow, persona: personaForLLM, timeoutMs }).catch(() => null)
      if (!out) return null
      const json = out.json
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
      const content = fromJson || out.text || (actions.length ? "Đã thực hiện yêu cầu." : "Mình chưa rõ bạn muốn mình thực hiện hành động nào.")
      return { content, actions, model: out.model, parsedJson: !!json }
    }

    const passOk = hasInternalDemoPass() ? isInternalDemoPass(accessPass) : false
    const systemKey = String(process.env.GEMINI_API_KEY || "").trim()
    const access = passOk ? "pass" : (accessPass ? "user_key" : "system_key")
    const keyToUse = passOk ? systemKey : (accessPass || systemKey)
    let providerUsed: "openai_like" | "gemini" | "foza" = "openai_like"
    let modeUsed: "cpu" | "gpu" | "cloud" = originalTarget
    let fallback: string | undefined

    const fozaToken = String(process.env.FOZA_TOKEN || process.env.FOZA_TOKEN_2 || "").trim()
    const fozaModelName = String(process.env.LLM_MODEL_NAME || "").trim()
    const shouldTryFoza = agentProvider === "foza" || (agentProvider === "auto" && !!(fozaToken && fozaModelName))
    if (shouldTryFoza) {
      const baseUrl = String(process.env.FOZA_BASE_URL || "").trim().replace(/\/$/, "") || "https://api.foza.ai/v1"
      if (fozaToken && fozaModelName) {
        const now = Date.now()
        const circuitFailThreshold = toInt(process.env.FOZA_CIRCUIT_FAIL_THRESHOLD, 3)
        const circuitOpenMs = toInt(process.env.FOZA_CIRCUIT_OPEN_MS, 10 * 60 * 1000)
        if (fozaCircuit.opened_until > now) {
          fallback = "foza_circuit_open"
          rootCause = fallback
          fallbackChain.push("skip_foza")
        } else {
        const toInt = (v: any, def: number) => {
          const n = Number.parseInt(String(v ?? "").trim(), 10)
          return Number.isFinite(n) && n > 0 ? n : def
        }
        const isTest = String(process.env.NODE_ENV || "").toLowerCase() === "test"
        const maxToolRounds = toInt(process.env.FOZA_TOOL_MAX_ROUNDS, 3)
        const maxToolCallsPerRound = toInt(process.env.FOZA_TOOL_MAX_CALLS, 3)
        const configuredFozaRequestTimeoutMs = toInt(process.env.FOZA_REQUEST_TIMEOUT_MS, 0)
        const fozaRequestTimeoutMs = isTest
          ? Math.max(configuredFozaRequestTimeoutMs || 0, 45000)
          : (configuredFozaRequestTimeoutMs || 20000)
        const mcpToolTimeoutMs = toInt(process.env.FOZA_MCP_TOOL_TIMEOUT_MS, 8000)
        const configuredOverallTimeoutMs = toInt(process.env.FOZA_AGENT_TIMEOUT_MS, 0)
        const overallTimeoutMs = isTest
          ? Math.max(configuredOverallTimeoutMs || 0, 90000)
          : (configuredOverallTimeoutMs || 35000)
        const deadline = Date.now() + overallTimeoutMs
        const remainingMs = () => Math.max(0, deadline - Date.now())

        const allowPaths = allow.join(", ")
        const featureList = ["sang-loc", "tri-lieu", "tra-cuu", "bac-si", "ke-hoach", "thong-ke"].join(", ")
        const jsonAgentSystem = [
          "Bạn là AI agent cho ứng dụng tư vấn y tế & tâm lý.",
          personaForLLM,
          "Nhiệm vụ: xuất ra một JSON object DUY NHẤT để UI có thể thực thi hành động.",
          "Không bọc markdown, không giải thích ngoài JSON.",
          "Nếu cần dữ liệu ngoài (nguồn web, YouTube), hãy gọi tool phù hợp. Sau khi nhận kết quả tool, bắt buộc trả về JSON theo schema dưới đây.",
          "Schema JSON:",
          "{",
          "  \"response\": \"string\",",
          "  \"actions\": [",
          "    { \"type\": \"navigate\", \"args\": { \"path\": \"/...\" } },",
          "    { \"type\": \"speak\", \"args\": { \"text\": \"...\" } },",
          "    { \"type\": \"embed\", \"args\": { \"feature\": \"...\", \"context\": {} } },",
          "    { \"type\": \"ask_navigation\", \"args\": { \"feature\": \"...\", \"reason\": \"...\", \"context\": {} } },",
          "    { \"type\": \"recommend_music\", \"args\": { \"recommendations\": [], \"mood\": \"...\", \"message\": \"...\" } },",
          "    { \"type\": \"play_music\", \"args\": { \"videoId\": \"...\", \"title\": \"...\", \"artist\": \"...\", \"autoplay\": true } }",
          "  ]",
          "}",
          "Quy tắc actions:",
          "- Nếu cần điều hướng, dùng type=navigate và path bắt đầu bằng /.",
          "- Chỉ dùng path nằm trong allowlist.",
          `Allowlist: ${allowPaths}`,
          `Embeddable features: ${featureList}`,
          "- Nếu không cần hành động, actions = [].",
        ].join("\n")

        const mcpToolDecl = [
          {
            name: "web.search",
            description: "Tìm kiếm web và trả về danh sách kết quả (title/url/snippet).",
            parameters: {
              type: "OBJECT",
              properties: {
                query: { type: "STRING" },
                num: { type: "NUMBER" },
              },
              required: ["query"],
            },
          },
          {
            name: "youtube.search",
            description: "Tìm video YouTube theo query hoặc mood (wellness).",
            parameters: {
              type: "OBJECT",
              properties: {
                query: { type: "STRING" },
                mood: { type: "STRING" },
                maxResults: { type: "NUMBER" },
              },
              required: [],
            },
          },
          {
            name: "youtube.video",
            description: "Lấy metadata chi tiết của một video YouTube theo videoId.",
            parameters: {
              type: "OBJECT",
              properties: {
                videoId: { type: "STRING" },
              },
              required: ["videoId"],
            },
          },
          {
            name: "youtube.recommend_music",
            description: "Gợi ý danh sách nhạc/âm thanh YouTube theo mood để dùng cho trị liệu âm nhạc.",
            parameters: {
              type: "OBJECT",
              properties: {
                mood: { type: "STRING" },
                maxResults: { type: "NUMBER" },
              },
              required: [],
            },
          },
          {
            name: "graph.status",
            description: "Kiểm tra trạng thái kết nối Graph (Neo4j/Memgraph) ở CPU server.",
            parameters: { type: "OBJECT", properties: {}, required: [] },
          },
          {
            name: "graph.evidence",
            description: "Truy vấn evidence subgraph theo query (tìm entity theo tên và lấy edges lân cận kèm provenance).",
            parameters: {
              type: "OBJECT",
              properties: {
                query: { type: "STRING" },
                limit: { type: "NUMBER" },
                entity_limit: { type: "NUMBER" },
                rel_types: { type: "ARRAY", items: { type: "STRING" } },
              },
              required: ["query"],
            },
          },
        ]
        const mcpToolNames = new Set(mcpToolDecl.map((t) => t.name))

        const runMcpTool = async (name: string, args: any) => {
          const left = remainingMs()
          if (left <= 0) throw new Error("timeout:overall")
          const timeoutMs = Math.max(500, Math.min(mcpToolTimeoutMs, left))
          const url = new URL("/api/mcp/call", req.url).toString()
          const controller = new AbortController()
          const t = setTimeout(() => controller.abort(), timeoutMs)
          const resp = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, args: args || {} }), signal: controller.signal }).finally(() => clearTimeout(t))
          const json = await resp.json().catch(() => null)
          if (!resp.ok) throw new Error(String(json?.error || `tool_error:${resp.status}`))
          return json
        }

        const toOpenAiTools = (decls: any[]) => {
          return decls.map((d) => ({
            type: "function",
            function: {
              name: String(d?.name || "").trim(),
              description: d?.description ? String(d.description) : undefined,
              parameters: normalizeOpenAiSchema(d?.parameters || { type: "object", properties: {} }),
            },
          }))
        }

        const fozaFetch = async (msgs: any[], includeTools: boolean, useResponseFormat: boolean) => {
          const left = remainingMs()
          if (left <= 0) throw new Error("timeout:overall")
          const timeoutMs = Math.max(800, Math.min(fozaRequestTimeoutMs, left))
          const url = `${baseUrl}/chat/completions`
          const controller = new AbortController()
          const t = setTimeout(() => controller.abort(), timeoutMs)
          const resp = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json", Accept: "application/json", "User-Agent": "govgraph-foza-client/1.0", Authorization: `Bearer ${fozaToken}` },
            body: JSON.stringify({
              model: fozaModelName,
              messages: msgs,
              ...(includeTools ? { tools: toOpenAiTools(mcpToolDecl) } : {}),
              ...(useResponseFormat ? { response_format: { type: "json_object" } } : {}),
              temperature: 0.2,
            }),
            signal: controller.signal,
          }).finally(() => clearTimeout(t))
          const raw = await resp.text().catch(() => "")
          if (!resp.ok) throw new Error(`Foza API error: ${resp.status} ${resp.statusText} ${raw}`)
          const json = JSON.parse(raw || "{}")
          const msg = json?.choices?.[0]?.message || {}
          const toolCalls = Array.isArray(msg?.tool_calls) ? msg.tool_calls : []
          const outCalls = toolCalls
            .map((c: any) => {
              const nm = String(c?.function?.name || "").trim()
              if (!nm) return null
              const id = String(c?.id || "").trim()
              const argRaw = c?.function?.arguments
              const args = (() => {
                if (argRaw && typeof argRaw === "object") return argRaw
                const s = String(argRaw || "").trim()
                if (!s) return {}
                try { return JSON.parse(s) } catch { return {} }
              })()
              return { id, name: nm, args }
            })
            .filter(Boolean)
          return { content: String(msg?.content || "").trim(), toolCalls: outCalls as any[], assistant: msg }
        }

        const baseHistory = (Array.isArray(messages) ? messages : []).map((m: any) => ({ role: String(m?.role || "user"), content: String(m?.content || "") }))
        const toolModeMessages = [
          { role: "system", content: jsonAgentSystem },
          ...baseHistory,
          { role: "user", content: message },
        ]
        const simpleModeMessages = [
          { role: "system", content: jsonAgentSystem },
          ...baseHistory,
          { role: "user", content: String(message || "").trim() },
        ]

        const parseJsonContent = (text: string) => {
          const s = String(text || "").trim()
          if (!s) return null
          try { return JSON.parse(s) } catch {}
          const block = firstJsonObject(s)
          if (!block) return null
          try { return JSON.parse(block) } catch {}
          return null
        }

        try {
          const sanitizeActions = (raw: unknown) => {
            const actions = normalizeActions(raw)
            return actions.map((a: any) => {
              if (a.type === "navigate") {
                const p = String(a?.args?.path || "").trim()
                if (!isAllowedPath(p)) return null
                return { type: "navigate", args: { path: p } }
              }
              if (a.type === "speak") {
                const t = String(a?.args?.text || "").trim()
                if (!t) return null
                const text = t.length > 800 ? t.slice(0, 800) : t
                return { type: "speak", args: { text } }
              }
              if (a.type === "play_music") {
                const videoId = String(a?.args?.videoId || "").trim()
                const title = String(a?.args?.title || "").trim()
                if (!videoId || !title) return null
                const artist = typeof a?.args?.artist === "string" ? String(a.args.artist).trim() : undefined
                const autoplay = typeof a?.args?.autoplay === "boolean" ? a.args.autoplay : undefined
                return { type: "play_music", args: { videoId, title, ...(artist ? { artist } : {}), ...(typeof autoplay === "boolean" ? { autoplay } : {}) } }
              }
              if (a.type === "recommend_music") {
                const mood = typeof a?.args?.mood === "string" ? String(a.args.mood).trim() : undefined
                const msg = typeof a?.args?.message === "string" ? String(a.args.message).trim() : undefined
                const recs = Array.isArray(a?.args?.recommendations) ? a.args.recommendations.slice(0, 10) : []
                return { type: "recommend_music", args: { recommendations: recs, ...(mood ? { mood } : {}), ...(msg ? { message: msg } : {}) } }
              }
              return a
            }).filter(Boolean) as any
          }

          const fozaTry = async (msgs: any[], includeTools: boolean) => {
            try {
              return await fozaFetch(msgs, includeTools, true)
            } catch (e: any) {
              const msg = String(e?.message || e || "")
              if (/response_format/i.test(msg)) {
                try {
                  return await fozaFetch(msgs, includeTools, false)
                } catch (e2: any) {
                  const msg2 = String(e2?.message || e2 || "")
                  if (includeTools && /(tools?|tool_calls?|function)/i.test(msg2)) {
                    try {
                      return await fozaFetch(msgs, false, true)
                    } catch (e3: any) {
                      const msg3 = String(e3?.message || e3 || "")
                      if (/response_format/i.test(msg3)) return fozaFetch(msgs, false, false)
                      throw e3
                    }
                  }
                  throw e2
                }
              }
              if (includeTools && /(tools?|tool_calls?|function)/i.test(msg)) {
                try {
                  return await fozaFetch(msgs, false, true)
                } catch (e2: any) {
                  const msg2 = String(e2?.message || e2 || "")
                  if (/response_format/i.test(msg2)) return fozaFetch(msgs, false, false)
                  throw e2
                }
              }
              throw e
            }
          }

          let msgs = toolModeMessages
          let content = ""
          let toolRounds = 0
          let toolCallsCount = 0
          let mcpToolCallsCount = 0
          const mcpToolNamesSeen: string[] = []

          const forceActions = String(process.env.AGENT_FORCE_ACTIONS || "1").trim() !== "0"
          if (!forceActions) {
            let r1: any | null = null
            for (let i = 0; i < 2; i++) {
              try {
                r1 = await fozaFetch(simpleModeMessages, false, false)
                break
              } catch (e: any) {
                const msg = String(e?.message || e || "")
                if (i === 0 && /aborted/i.test(msg)) continue
                throw e
              }
            }
            if (!r1) throw new Error("foza_no_response")
            content = r1.content
            const parsed = parseJsonContent(content)
            if (parsed && (typeof parsed?.response === "string" || Array.isArray(parsed?.actions))) {
              const actions = sanitizeActions(parsed?.actions)
              const rawText = (typeof parsed?.response === "string" && String(parsed.response).trim()) ? String(parsed.response).trim() : (content || " ")
              const finalText = ensureAssistantText(rawText, actions)
              fozaCircuit.failures = 0
              fozaCircuit.opened_until = 0
              fozaCircuit.last_error = ""
              appendMetric({ ts: new Date().toISOString(), mode: "cloud", provider: "foza", duration_ms: Date.now() - started })
              const out = AgentResponseSchema.parse({
                response: finalText,
                messages: planResponseMessages(finalText, actions),
                delivery: { mode: deliveryMode },
                actions,
                conversation_id,
                metadata: withSystemState({
                  mode: "cloud",
                  provider: "foza",
                  requested_provider: requestedProvider,
                  root_cause: rootCause,
                  fallback,
                  fallback_chain: fallbackChain,
                  model: fozaModelName,
                  demo_mode: passOk,
                  agent_profile: agentProfile.id,
                  agent_profile_source: agentProfileSource,
                  duration_ms: Date.now() - started,
                  intent: intentFlags,
                  llm_context: { provider: "foza", mode: "cloud", user_message: message, persona: personaForLLM, graph: graphEvidence, graph_injected: graphInjected, tool_calls_count: 0, mcp_tool_calls_count: 0, mcp_tool_names: [], graph_tool_called: graphToolCalled, graph_reason: graphReason, graph_status_code: graphStatusCode, graph_endpoint: graphEndpoint },
                  json_mode: true,
                  tool_rounds: 0,
                  tool_calls_count: 0,
                  mcp_tool_calls_count: 0,
                  mcp_tool_names: [],
                  tool_budget: { max_rounds: maxToolRounds, max_calls: maxToolCallsPerRound },
                  timeouts: { overall_ms: overallTimeoutMs, foza_ms: fozaRequestTimeoutMs, mcp_ms: mcpToolTimeoutMs },
                }),
              })
              return json(out)
            }

            const finalText = ensureAssistantText(content || "Mình chưa nhận được phản hồi từ FOZA.", [])
            fozaCircuit.failures = 0
            fozaCircuit.opened_until = 0
            fozaCircuit.last_error = ""
            appendMetric({ ts: new Date().toISOString(), mode: "cloud", provider: "foza", duration_ms: Date.now() - started })
            const out = AgentResponseSchema.parse({
              response: finalText,
              messages: planResponseMessages(finalText, []),
              delivery: { mode: deliveryMode },
              actions: [],
              conversation_id,
              metadata: withSystemState({
                mode: "cloud",
                provider: "foza",
                requested_provider: requestedProvider,
                root_cause: rootCause,
                fallback,
                fallback_chain: fallbackChain,
                model: fozaModelName,
                demo_mode: passOk,
                agent_profile: agentProfile.id,
                agent_profile_source: agentProfileSource,
                duration_ms: Date.now() - started,
                intent: intentFlags,
                llm_context: { provider: "foza", mode: "cloud", user_message: message, persona: personaForLLM, graph: graphEvidence, graph_injected: graphInjected, tool_calls_count: 0, mcp_tool_calls_count: 0, mcp_tool_names: [], graph_tool_called: graphToolCalled, graph_reason: graphReason, graph_status_code: graphStatusCode, graph_endpoint: graphEndpoint },
                json_mode: false,
                tool_rounds: 0,
                tool_calls_count: 0,
                mcp_tool_calls_count: 0,
                mcp_tool_names: [],
                tool_budget: { max_rounds: maxToolRounds, max_calls: maxToolCallsPerRound },
                timeouts: { overall_ms: overallTimeoutMs, foza_ms: fozaRequestTimeoutMs, mcp_ms: mcpToolTimeoutMs },
              }),
            })
            return json(out)
          }

          for (let i = 0; i < maxToolRounds; i++) {
            if (remainingMs() <= 0) break
            const r1 = await fozaTry(msgs, true)
            content = r1.content
            const toolCallsAll = Array.isArray(r1.toolCalls) ? r1.toolCalls : []
            toolCallsCount += toolCallsAll.length
            const mcpCalls = toolCallsAll.filter((c) => mcpToolNames.has(String(c?.name || "").trim()))
            if (mcpCalls.length) {
              mcpToolCallsCount += mcpCalls.length
              for (const c of mcpCalls) {
                const nm = String(c?.name || "").trim()
                if (nm && mcpToolNamesSeen.length < 20) mcpToolNamesSeen.push(nm)
              }
            }
            if (mcpCalls.length) {
              toolRounds++
              const toolMsgs: any[] = []
              for (const c of mcpCalls.slice(0, maxToolCallsPerRound)) {
                try {
                  const out = await runMcpTool(String(c.name).trim(), c.args || {})
                  toolMsgs.push({ role: "tool", tool_call_id: c.id, content: JSON.stringify(out?.result ?? out).slice(0, 9000) })
                } catch (e: any) {
                  toolMsgs.push({ role: "tool", tool_call_id: c.id, content: JSON.stringify({ ok: false, error: String(e?.message || e || "") }).slice(0, 9000) })
                }
              }
              msgs = [
                ...msgs,
                { role: "assistant", content: r1.content || "", tool_calls: (r1.assistant as any)?.tool_calls || [] },
                ...toolMsgs,
                { role: "user", content: "Trả về một JSON object DUY NHẤT theo schema. Không gọi tool nữa." },
              ]
              continue
            }

            const parsed = parseJsonContent(content)
            if (parsed && (typeof parsed?.response === "string" || Array.isArray(parsed?.actions))) {
              const actions = sanitizeActions(parsed?.actions)
              const rawText = (typeof parsed?.response === "string" && String(parsed.response).trim()) ? String(parsed.response).trim() : (content || " ")
              const finalText = ensureAssistantText(rawText, actions)
              fozaCircuit.failures = 0
              fozaCircuit.opened_until = 0
              fozaCircuit.last_error = ""
              appendMetric({ ts: new Date().toISOString(), mode: "cloud", provider: "foza", duration_ms: Date.now() - started })
              const out = AgentResponseSchema.parse({
                response: finalText,
                messages: planResponseMessages(finalText, actions),
                delivery: { mode: deliveryMode },
                actions,
                conversation_id,
                metadata: withSystemState({
                  mode: "cloud",
                  provider: "foza",
                  requested_provider: requestedProvider,
                  root_cause: rootCause,
                  fallback,
                  fallback_chain: fallbackChain,
                  model: fozaModelName,
                  demo_mode: passOk,
                  agent_profile: agentProfile.id,
                  agent_profile_source: agentProfileSource,
                  duration_ms: Date.now() - started,
                  intent: intentFlags,
                  llm_context: { provider: "foza", mode: "cloud", user_message: message, persona: personaForLLM, graph: graphEvidence, graph_injected: graphInjected, tool_calls_count: toolCallsCount, mcp_tool_calls_count: mcpToolCallsCount, mcp_tool_names: mcpToolNamesSeen, graph_tool_called: graphToolCalled, graph_reason: graphReason, graph_status_code: graphStatusCode, graph_endpoint: graphEndpoint },
                  json_mode: true,
                  tool_rounds: toolRounds,
                  tool_calls_count: toolCallsCount,
                  mcp_tool_calls_count: mcpToolCallsCount,
                  mcp_tool_names: mcpToolNamesSeen,
                  tool_budget: { max_rounds: maxToolRounds, max_calls: maxToolCallsPerRound },
                  timeouts: { overall_ms: overallTimeoutMs, foza_ms: fozaRequestTimeoutMs, mcp_ms: mcpToolTimeoutMs },
                }),
              })
              return json(out)
            }

            msgs = [
              ...msgs,
              ...(content ? [{ role: "assistant", content }] : []),
              { role: "user", content: "Chỉ trả về JSON object theo schema {response, actions}. Không dùng markdown." },
            ]
          }

          const finalText = ensureAssistantText(content || "Mình chưa nhận được JSON hợp lệ từ FOZA.", [])
          fozaCircuit.failures = 0
          fozaCircuit.opened_until = 0
          fozaCircuit.last_error = ""
          appendMetric({ ts: new Date().toISOString(), mode: "cloud", provider: "foza", duration_ms: Date.now() - started })
          const out = AgentResponseSchema.parse({
            response: finalText,
            messages: planResponseMessages(finalText, []),
            delivery: { mode: deliveryMode },
            actions: [],
            conversation_id,
            metadata: withSystemState({
              mode: "cloud",
              provider: "foza",
              requested_provider: requestedProvider,
              root_cause: rootCause,
              fallback,
              fallback_chain: fallbackChain,
              model: fozaModelName,
              demo_mode: passOk,
              agent_profile: agentProfile.id,
              agent_profile_source: agentProfileSource,
              duration_ms: Date.now() - started,
              intent: intentFlags,
              llm_context: { provider: "foza", mode: "cloud", user_message: message, persona: personaForLLM, graph: graphEvidence, graph_injected: graphInjected, tool_calls_count: toolCallsCount, mcp_tool_calls_count: mcpToolCallsCount, mcp_tool_names: mcpToolNamesSeen, graph_tool_called: graphToolCalled, graph_reason: graphReason, graph_status_code: graphStatusCode, graph_endpoint: graphEndpoint },
              json_mode: false,
              tool_rounds: toolRounds,
              tool_calls_count: toolCallsCount,
              mcp_tool_calls_count: mcpToolCallsCount,
              mcp_tool_names: mcpToolNamesSeen,
              tool_budget: { max_rounds: maxToolRounds, max_calls: maxToolCallsPerRound },
              timeouts: { overall_ms: overallTimeoutMs, foza_ms: fozaRequestTimeoutMs, mcp_ms: mcpToolTimeoutMs },
            }),
          })
          return json(out)
        } catch (e: any) {
          const errMsg = String(e?.message || e || "")
          console.error("[agent-chat] foza_failed:", errMsg)
          fozaCircuit.failures = Math.max(0, fozaCircuit.failures) + 1
          fozaCircuit.last_error = errMsg.slice(0, 500)
          const isTimeout = /aborted|524|timeout/i.test(errMsg)
          const opened = fozaCircuit.failures >= circuitFailThreshold
          if (opened) {
            fozaCircuit.opened_until = Date.now() + circuitOpenMs
          }
          if (!rootCause) rootCause = `foza_error:${fozaCircuit.last_error.slice(0, 80)}`
          fallbackChain.push(`foza_fail:${fozaCircuit.last_error.slice(0, 60)}`)
          fallback = opened ? "foza_circuit_opened" : (isTimeout ? "foza_timeout" : "foza_failed")
          rootCause = rootCause || fallback
          fallbackChain.push(fallback)
        }
        }
      } else {
        fallback = "foza_missing_env"
        rootCause = rootCause || fallback
        fallbackChain.push(fallback)
      }
    }

    let openaiLikeOut: Awaited<ReturnType<typeof runOpenAiJsonAgent>> | null = null
    if (originalTarget === "gpu") {
      openaiLikeOut = await runOpenAiJsonAgent(gpuUrl, gpuModel)
      if (!openaiLikeOut) {
        if (keyToUse) {
          providerUsed = "gemini"
          modeUsed = "gpu"
          fallback = "gpu_to_gemini"
        } else {
          openaiLikeOut = await runOpenAiJsonAgent(cpuUrl, localModel)
          if (openaiLikeOut) {
            providerUsed = "openai_like"
            modeUsed = "cpu"
            fallback = "gpu_to_cpu"
            const now = new Date().toISOString()
            appendEvent({ type: "fallback", from: "gpu", to: "cpu", ts: now, scope: "agent" })
            try {
              ensureDataDir()
              fs.writeFileSync(runtimeModePath, JSON.stringify({ target: "cpu", updated_at: now }, null, 2))
              appendEvent({ type: "mode_change", target: "cpu", ts: now, scope: "agent" })
            } catch {}
          }
        }
      } else {
        providerUsed = "openai_like"
        modeUsed = "gpu"
      }
    } else {
      openaiLikeOut = await runOpenAiJsonAgent(cpuUrl, localModel)
      if (!openaiLikeOut) {
        if (keyToUse) {
          providerUsed = "gemini"
          modeUsed = "cpu"
          fallback = "cpu_to_gemini"
        }
      } else {
        providerUsed = "openai_like"
        modeUsed = "cpu"
      }
    }

    if (providerUsed === "openai_like") {
      if (!openaiLikeOut) {
        const triageMeta = readGatewayTriageMeta()
        const actions = normalizeActions(applyTriageActionGuard(buildGatewayFallbackActions(triageMeta), triageMeta))
        const baseContent = shouldHoldTriageCta(triageMeta)
          ? "Mình chưa thể hoàn tất phân luồng lúc này, nhưng vẫn có thể hỏi thêm để đánh giá an toàn hơn."
          : "Mình gặp sự cố khi gọi agent. Bạn thử lại giúp mình."
        const content = ensureAssistantText(actions.length ? "Được, mình sẽ mở trang phù hợp." : baseContent, actions, triageMeta)
        try {
          await persistChatTurn({ sessionId: conversation_id, kind: category === "friend" ? "friend" : "consultation", userText: message, assistantText: content })
        } catch {}
        appendMetric({ ts: new Date().toISOString(), mode: modeUsed, provider: "openai_like", fallback: "rule_based", duration_ms: Date.now() - started })
        return json(
          AgentResponseSchema.parse({
            response: content,
            messages: planResponseMessages(content, actions),
            delivery: { mode: deliveryMode },
            actions,
            conversation_id,
            metadata: withSystemState({ mode: modeUsed, provider: "openai_like", requested_provider: requestedProvider, root_cause: rootCause, fallback: "rule_based", fallback_chain: fallbackChain, demo_mode: passOk, agent_profile: agentProfile.id, duration_ms: Date.now() - started, intent: intentFlags, cpu_proxy_error: cpuProxyError, triage: buildTriageMetadata(triageMeta), llm_context: { provider: "openai_like", mode: modeUsed, user_message: message, persona: personaForLLM, graph: graphEvidence, graph_injected: graphInjected, graph_reason: graphReason, graph_status_code: graphStatusCode, graph_endpoint: graphEndpoint } }),
          })
        )
      }

      const triageMeta = readGatewayTriageMeta()
      const actions = applyTriageActionGuard(openaiLikeOut.actions, triageMeta)
      const content = ensureAssistantText(openaiLikeOut.content, actions, triageMeta)
      try {
        await persistChatTurn({ sessionId: conversation_id, kind: category === "friend" ? "friend" : "consultation", userText: message, assistantText: content })
      } catch {}
      appendMetric({ ts: new Date().toISOString(), mode: modeUsed, provider: "openai_like", duration_ms: Date.now() - started })
      return json(
        AgentResponseSchema.parse({
          response: content,
          messages: planResponseMessages(content, actions),
          delivery: { mode: deliveryMode },
          actions,
          conversation_id,
          metadata: withSystemState({ mode: modeUsed, provider: "openai_like", requested_provider: requestedProvider, root_cause: rootCause, fallback, fallback_chain: fallbackChain, model: openaiLikeOut.model, parsed_json: openaiLikeOut.parsedJson, demo_mode: passOk, agent_profile: agentProfile.id, duration_ms: Date.now() - started, intent: intentFlags, triage: buildTriageMetadata(triageMeta), llm_context: { provider: "openai_like", mode: modeUsed, user_message: message, persona: personaForLLM, graph: graphEvidence, graph_injected: graphInjected, graph_reason: graphReason, graph_status_code: graphStatusCode, graph_endpoint: graphEndpoint } }),
        })
      )
    }

    if (!keyToUse) {
      const triageMeta = readGatewayTriageMeta()
      const actions = normalizeActions(applyTriageActionGuard(buildGatewayFallbackActions(triageMeta), triageMeta))
      const baseContent = shouldHoldTriageCta(triageMeta)
        ? "Mình chưa thể hoàn tất phân luồng lúc này, nhưng vẫn có thể hỏi thêm để đánh giá an toàn hơn."
        : "Thiếu cấu hình Gemini nên agent không thể chạy."
      const content = ensureAssistantText(actions.length ? "Được, mình sẽ mở trang phù hợp." : baseContent, actions, triageMeta)
      try {
        await persistChatTurn({ sessionId: conversation_id, kind: category === "friend" ? "friend" : "consultation", userText: message, assistantText: content })
      } catch {}
      appendMetric({ ts: new Date().toISOString(), mode: modeUsed, provider: "gemini", fallback: "missing_gemini_key", duration_ms: Date.now() - started })
      const out = AgentResponseSchema.parse({
        response: content,
        messages: planResponseMessages(content, actions),
        delivery: { mode: deliveryMode },
        actions,
        conversation_id,
        metadata: withSystemState({ mode: modeUsed, provider: "gemini", requested_provider: requestedProvider, root_cause: rootCause, fallback: "missing_gemini_key", fallback_chain: fallbackChain, demo_mode: passOk, agent_profile: agentProfile.id, duration_ms: Date.now() - started, intent: intentFlags, triage: buildTriageMetadata(triageMeta), llm_context: { provider: "gemini", mode: modeUsed, user_message: message, persona: personaForLLM, graph: graphEvidence, graph_injected: graphInjected, graph_reason: graphReason, graph_status_code: graphStatusCode, graph_endpoint: graphEndpoint } }),
      })
      return json(out)
    }

    const mcpToolDecl = [
      {
        name: "web.search",
        description: "Tìm kiếm web và trả về danh sách kết quả (title/url/snippet).",
        parameters: {
          type: "OBJECT",
          properties: {
            query: { type: "STRING" },
            num: { type: "NUMBER" },
          },
          required: ["query"],
        },
      },
      {
        name: "youtube.search",
        description: "Tìm video YouTube theo query hoặc mood (wellness).",
        parameters: {
          type: "OBJECT",
          properties: {
            query: { type: "STRING" },
            mood: { type: "STRING" },
            maxResults: { type: "NUMBER" },
          },
          required: [],
        },
      },
      {
        name: "youtube.video",
        description: "Lấy metadata chi tiết của một video YouTube theo videoId.",
        parameters: {
          type: "OBJECT",
          properties: {
            videoId: { type: "STRING" },
          },
          required: ["videoId"],
        },
      },
      {
        name: "youtube.recommend_music",
        description: "Gợi ý danh sách nhạc/âm thanh YouTube theo mood để dùng cho trị liệu âm nhạc.",
        parameters: {
          type: "OBJECT",
          properties: {
            mood: { type: "STRING" },
            maxResults: { type: "NUMBER" },
          },
          required: [],
        },
      },
      {
        name: "graph.status",
        description: "Kiểm tra trạng thái kết nối Graph (Neo4j/Memgraph) ở CPU server.",
        parameters: { type: "OBJECT", properties: {}, required: [] },
      },
      {
        name: "graph.evidence",
        description: "Truy vấn evidence subgraph theo query (tìm entity theo tên và lấy edges lân cận kèm provenance).",
        parameters: {
          type: "OBJECT",
          properties: {
            query: { type: "STRING" },
            limit: { type: "NUMBER" },
            entity_limit: { type: "NUMBER" },
            rel_types: { type: "ARRAY", items: { type: "STRING" } },
          },
          required: ["query"],
        },
      },
    ]

    const toolDecl = [...geminiToolDeclarations(), ...mcpToolDecl]

    const mcpToolNames = new Set(mcpToolDecl.map((t) => t.name))
    const runMcpTool = async (name: string, args: any) => {
      const left = remainingMs()
      if (left <= 0) throw new Error("timeout:overall")
      const timeoutMs = Math.max(500, Math.min(agentMcpTimeoutMs, left))
      const url = new URL("/api/mcp/call", req.url).toString()
      const controller = new AbortController()
      const t = setTimeout(() => controller.abort(), timeoutMs)
      const resp = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, args: args || {} }), signal: controller.signal }).finally(() => clearTimeout(t))
      const json = await resp.json().catch(() => null)
      if (!resp.ok) throw new Error(String(json?.error || `tool_error:${resp.status}`))
      return json
    }

    const consultationStylePrompt = ""

    const svc = keyToUse === String(process.env.GEMINI_API_KEY || "").trim() ? geminiService : new GeminiService(keyToUse)

    const callGemini = async (extraMessages?: Array<{ role?: string; content?: string }>) => {
      return retryWithBackoff(
        () =>
          svc.generateAgent({
            category,
            tier,
            question: message,
            messages: [...messages, ...(Array.isArray(extraMessages) ? extraMessages : [])],
            tools: toolDecl,
            persona: [personaForLLM, consultationStylePrompt ? `CONSULTATION_STYLE:\n${consultationStylePrompt}` : ""].filter(Boolean).join("\n\n"),
            timeoutMs: Math.max(800, Math.min(agentGeminiTimeoutMs, remainingMs())),
          }),
        { maxRetries: 3, initialDelayMs: 500, maxDelayMs: 5000, backoffMultiplier: 2 }
      )
    }

    let geminiErr: string | null = null
    let r: Awaited<ReturnType<typeof geminiService.generateAgent>> | null = null
    try {
      r = await callGemini()
      const toolCalls = Array.isArray(r?.toolCalls) ? r.toolCalls : []
      const mcpCalls = toolCalls.filter((c) => mcpToolNames.has(String(c?.name || "").trim()))
      if (mcpCalls.length) {
        const results: Array<{ name: string; result: any; ok: boolean; error?: string }> = []
        for (const c of mcpCalls.slice(0, agentMcpMaxCalls)) {
          const nm = String(c?.name || "").trim()
          try {
            const out = await runMcpTool(nm, c?.args || {})
            results.push({ name: nm, result: out?.result, ok: true })
          } catch (e: any) {
            results.push({ name: nm, result: null, ok: false, error: String(e?.message || e || "") })
          }
        }
        const summary = JSON.stringify(results).slice(0, 9000)
        r = await callGemini([{ role: "assistant", content: `KẾT QUẢ TOOL (tự động): ${summary}` }])
      }
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
        appendMetric({ ts: new Date().toISOString(), mode: modeUsed, provider: "gemini", rate_limited: true, duration_ms: Date.now() - started })
        const out = AgentResponseSchema.parse({
          response: content,
          messages: planResponseMessages(content, []),
          delivery: { mode: deliveryMode },
          actions: [],
          conversation_id,
          metadata: withSystemState({ mode: modeUsed, provider: "gemini", requested_provider: requestedProvider, root_cause: rootCause, fallback, fallback_chain: fallbackChain, access, rate_limited: true, retry_after_sec: retryAfter ?? undefined, gemini_error: geminiErr, demo_mode: passOk, agent_profile: agentProfile.id, duration_ms: Date.now() - started, intent: intentFlags, llm_context: { provider: "gemini", mode: modeUsed, user_message: message, persona: personaForLLM, graph: graphEvidence, graph_injected: graphInjected, graph_reason: graphReason, graph_status_code: graphStatusCode, graph_endpoint: graphEndpoint } }),
        })
        return json(out)
      }

      const triageMeta = readGatewayTriageMeta()
      const actions = normalizeActions(applyTriageActionGuard(buildGatewayFallbackActions(triageMeta), triageMeta))
      const safetyFallbackContent = shouldHoldTriageCta(triageMeta)
        ? "Mình chưa thể hoàn tất phân luồng lúc này, nhưng vẫn có thể hỏi thêm để đánh giá an toàn hơn."
        : (intentFlags?.triage || intentFlags?.medication
          ? "Mình hiện không kết nối được với AI. Trong lúc chờ, bạn nên: theo dõi triệu chứng và ghi lại mức độ; nếu sốt cao trên 39°C, khó thở, đau ngực, hoặc triệu chứng nặng hơn nhanh → gọi 115 hoặc đến cơ sở y tế gần nhất ngay. Lưu ý: thông tin này chỉ mang tính tham khảo, không thay thế tư vấn bác sĩ."
          : "Mình gặp sự cố khi gọi agent (Gemini). Bạn thử lại giúp mình.")
      const content = ensureAssistantText(actions.length ? "Được, mình sẽ mở trang phù hợp." : safetyFallbackContent, actions, triageMeta)
      try {
        await persistChatTurn({ sessionId: conversation_id, kind: category === "friend" ? "friend" : "consultation", userText: message, assistantText: content })
      } catch {}
      appendMetric({ ts: new Date().toISOString(), mode: modeUsed, provider: "gemini", fallback: "rule_based", duration_ms: Date.now() - started })
      const out = AgentResponseSchema.parse({
        response: content,
        messages: planResponseMessages(content, actions),
        delivery: { mode: deliveryMode },
        actions,
        conversation_id,
        metadata: withSystemState({ mode: modeUsed, provider: "gemini", requested_provider: requestedProvider, root_cause: rootCause, fallback: "rule_based", fallback_chain: fallbackChain, access, gemini_error: geminiErr, demo_mode: passOk, agent_profile: agentProfile.id, duration_ms: Date.now() - started, intent: intentFlags, cpu_proxy_error: cpuProxyError, triage: buildTriageMetadata(triageMeta), llm_context: { provider: "gemini", mode: modeUsed, user_message: message, persona: personaForLLM, graph: graphEvidence, graph_injected: graphInjected, graph_reason: graphReason, graph_status_code: graphStatusCode, graph_endpoint: graphEndpoint } }),
      })
      return json(out)
    }

    const actionsRaw = toolCallsToActions(r.toolCalls)
    // Also try to extract actions from text response (JSON format)
    let textActions: any[] = []
    let extractedResponse: string = ""
    let suggestedInvestigation: string = ""
    try {
      const block = firstJsonObject(r.text)
      if (block) {
        const parsed = JSON.parse(block)
        if (Array.isArray(parsed.actions)) {
          textActions = parsed.actions
        }
        if (typeof parsed.response === "string") {
          extractedResponse = parsed.response
        }
        if (typeof parsed.suggested_investigation === "string") {
          suggestedInvestigation = parsed.suggested_investigation
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
      hasExtractedResponse: !!extractedResponse,
      hasSuggestedInvestigation: !!suggestedInvestigation,
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
      
      // User asks about diseases/medicines AND symptoms
      if ((msg.includes('bệnh') || msg.includes('thuốc') || msg.includes('triệu chứng') || 
           msg.includes('đau') || msg.includes('sốt') || msg.includes('ho') || msg.includes('cảm') || msg.includes('cúm')) &&
          !msg.includes('liệu pháp')) {
        actions.push({
          type: 'ask_navigation',
          args: { feature: 'tra-cuu', reason: 'Bạn muốn tra cứu thêm thông tin chi tiết về triệu chứng này không?' }
        })
      }
      
      return actions.filter(a => a?.type)
    }
    
    const forceActionsEnabled = String(process.env.AGENT_FORCE_ACTIONS || "1").trim() !== "0"
    const forcedActions = forceActionsEnabled ? intelligentActionForcing() : []
    const directTriageMeta = readGatewayTriageMeta()
    const profileForcing = () => {
      const combined = [...actionsRaw, ...textActions, ...forcedActions].filter((a: any) => a?.type)
      const hasPrimary = combined.some((a: any) =>
        a?.type === "ask_navigation" || a?.type === "embed" || a?.type === "navigate" || a?.type === "recommend_music" || a?.type === "play_music"
      )
      if (hasPrimary) return []
      if (!agentProfile?.id) return []
      if (agentProfile.id === "therapy") {
        return [{ type: "ask_navigation", args: { feature: "tri-lieu", reason: "Đang bật chế độ Tâm lý trị liệu. Bạn muốn mở module Trị liệu để xem bài tập gợi ý không?" } }]
      }
      if (agentProfile.id === "triage") {
        return applyTriageActionGuard([], directTriageMeta)
      }
      if (agentProfile.id === "medication") {
        return [{ type: "ask_navigation", args: { feature: "tra-cuu", reason: "Đang bật chế độ Thuốc & Tương tác. Bạn muốn mở module Tra cứu để xem thông tin thuốc/bệnh không?" } }]
      }
      if (agentProfile.id === "care_plan") {
        return [{ type: "ask_navigation", args: { feature: "ke-hoach", reason: "Đang bật chế độ Kế hoạch chăm sóc. Bạn muốn mở module Kế hoạch để tạo plan theo mục tiêu không?" } }]
      }
      if (agentProfile.id === "doctor_referral" || agentProfile.id === "doctor") {
        return [{ type: "ask_navigation", args: { feature: "bac-si", reason: "Đang bật chế độ Bác sĩ & Đặt hẹn. Bạn muốn mở mục Bác sĩ để xem hồ sơ và đặt hẹn khám không?" } }]
      }
      return []
    }

    const profileActions = forceActionsEnabled ? profileForcing() : []
    const combinedActions = [...actionsRaw, ...textActions, ...forcedActions, ...profileActions]
    let actions = normalizeActions(combinedActions.filter(a => a?.type))
      .map((a) => {
        if (a.type === "open_screening") return { type: "ask_navigation", args: { feature: "sang-loc", reason: "Bạn muốn thử sàng lọc tâm lý để hiểu bản thân tốt hơn không?" } } as any
        if (a.type === "open_therapy") return { type: "ask_navigation", args: { feature: "tri-lieu", reason: "Bạn muốn xem các bài tập trị liệu được gợi ý không?" } } as any
        if (a.type === "open_reminders") return { type: "navigate", args: { path: "/nhac-nho" } } as any
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
        if (a.type === "recommend_music") {
          const recs = Array.isArray((a as any)?.args?.recommendations) ? (a as any).args.recommendations : []
          const capped = recs.slice(0, 10)
          return { ...a, args: { ...(a as any).args, recommendations: capped } } as any
        }
        if (a.type === "ask_navigation" || a.type === "embed" || a.type === "play_music") {
          return a
        }
        return null
      })
      .filter(Boolean) as any
    actions = applyTriageActionGuard(actions, directTriageMeta)

    const hydrateYouTubeEnabled = String(process.env.AGENT_HYDRATE_YOUTUBE || "").trim() !== "0"
    if (hydrateYouTubeEnabled) {
      const moodMap: Record<string, string> = {
        calm: "calming",
        uplifting: "motivation",
        meditation: "meditation",
        sleep: "sleep",
        focus: "breathing",
      }
      const next: any[] = []
      for (const a of actions) {
        if (a?.type !== "recommend_music") {
          next.push(a)
          continue
        }
        const recs = Array.isArray(a?.args?.recommendations) ? a.args.recommendations : []
        if (recs.length) {
          next.push(a)
          continue
        }
        const mood = String(a?.args?.mood || "calm").trim().toLowerCase()
        const key = moodMap[mood] || "calming"
        const videos = await youtubeService.searchWellnessVideos(key, 5).catch(() => [])
        const recommendations = videos.map((v) => ({
          videoId: v.videoId,
          title: String(v.title || "").trim().slice(0, 120),
          artist: String(v.channelTitle || "").trim().slice(0, 80) || undefined,
          thumbnail: String(v.thumbnailUrl || "").trim() || undefined,
          duration: v.duration ? formatSeconds(v.duration) : undefined,
          mood,
        }))
        next.push({ ...a, args: { ...a.args, recommendations } })
      }
      actions = next
    }

    const content = extractedResponse || r.text || (actions.length ? "Đã thực hiện yêu cầu." : "Mình chưa rõ bạn muốn mình thực hiện hành động nào.")
    
    // Include suggested investigation questions in the response if available
    const fullContent = suggestedInvestigation 
      ? `${content}\n\n❓ ${suggestedInvestigation}`
      : content
    const finalContent = appendMedicalDisclaimer(ensureAssistantText(fullContent, actions, directTriageMeta))

    try {
      await persistChatTurn({ sessionId: conversation_id, kind: category === "friend" ? "friend" : "consultation", userText: message, assistantText: finalContent })
    } catch {}

    const out = AgentResponseSchema.parse({
      response: finalContent,
      messages: planResponseMessages(finalContent, actions),
      delivery: { mode: deliveryMode },
      actions,
      conversation_id,
      metadata: withSystemState({ 
        mode: modeUsed, 
        provider: "gemini", 
        requested_provider: requestedProvider,
        root_cause: rootCause,
        fallback,
        fallback_chain: fallbackChain,
        access,
        demo_mode: passOk,
        model: r.model, 
        agent_profile: agentProfile.id,
        agent_profile_source: agentProfileSource,
        duration_ms: Date.now() - started, 
        intent: intentFlags,
        triage: buildTriageMetadata(directTriageMeta),
        hasInvestigation: !!suggestedInvestigation,
        tool_calls_count: Array.isArray((r as any)?.toolCalls) ? (r as any).toolCalls.length : 0,
        tool_call_names: Array.isArray((r as any)?.toolCalls) ? (r as any).toolCalls.map((c: any) => String(c?.name || "").trim()).filter(Boolean).slice(0, 20) : [],
        llm_context: { provider: "gemini", mode: modeUsed, user_message: message, persona: personaForLLM, graph: graphEvidence, graph_injected: graphInjected, graph_tool_called: graphToolCalled, tool_calls_count: Array.isArray((r as any)?.toolCalls) ? (r as any).toolCalls.length : 0, graph_reason: graphReason, graph_status_code: graphStatusCode, graph_endpoint: graphEndpoint },
      }),
    })
    appendMetric({ ts: new Date().toISOString(), mode: modeUsed, provider: "gemini", duration_ms: Date.now() - started })
    return json(out)
  } catch (e: any) {
    console.error("[agent-chat] internal_error", e)
    return json(
      AgentResponseSchema.parse({
        response: "Xin lỗi, agent đang gặp sự cố kỹ thuật. Bạn thử lại giúp mình.",
        messages: [{ content: "Xin lỗi, agent đang gặp sự cố kỹ thuật. Bạn thử lại giúp mình.", kind: "text", delay_ms: 0 }],
        delivery: { mode: "chunked" },
        actions: [],
        metadata: withSystemState({ mode: "cpu", provider: "agent", error: "internal_error", agent_profile: agentProfileIdForError, duration_ms: Date.now() - started }),
      }),
      { status: 200 }
    )
  }
}
