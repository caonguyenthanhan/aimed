/**
 * Prompt Builder — tách system prompts ra khỏi code, hỗ trợ cấu hình động.
 *
 * Thay vì hardcode string trong agent-chat/route.ts, hàm buildSystemPrompt()
 * đọc từ prompt-config.json và inject context động.
 *
 * Cho phép:
 * - Chỉnh sửa prompt không cần redeploy (chỉ cần cập nhật JSON file)
 * - A/B testing prompt variants
 * - Sẵn sàng tích hợp DSPy optimization sau này
 */

import fs from "fs"
import path from "path"
import type { ConversationContext } from "./conversation-context"
import type { AgentProfileId } from "./agent-profiles"
import { getAgentProfile } from "./agent-profiles"

// ─── Types ─────────────────────────────────────────────────────────────────────

export type PromptProfileConfig = {
  /** System prompt cơ bản của profile */
  system?: string
  /** Instruction để LLM output JSON actions */
  json_schema_instruction?: string
  /** Câu hỏi triage follow-up */
  triage_questions?: string[]
  /** Prefix empathy cho therapy */
  opening_empathy?: string
  /** Phần disclaimer y tế */
  disclaimer?: string
}

export type PromptConfig = {
  version: string
  base_system: string
  profiles: Partial<Record<AgentProfileId, PromptProfileConfig>>
  json_action_schema: string
  safety_reminder: string
}

// ─── Config Loader ─────────────────────────────────────────────────────────────

let _cachedConfig: PromptConfig | null = null
let _cacheTime = 0
const CACHE_TTL_MS = 30_000 // reload sau 30 giây (cho hot-reload trong dev)

function loadPromptConfig(): PromptConfig {
  const now = Date.now()
  if (_cachedConfig && now - _cacheTime < CACHE_TTL_MS) return _cachedConfig

  try {
    const configPath = path.join(process.cwd(), "data", "prompt-config.json")
    const raw = fs.readFileSync(configPath, "utf-8")
    _cachedConfig = JSON.parse(raw) as PromptConfig
    _cacheTime = now
    return _cachedConfig
  } catch {
    // Fallback sang config mặc định nếu file không tồn tại
    return getDefaultPromptConfig()
  }
}

// ─── Main Builder ──────────────────────────────────────────────────────────────

/**
 * buildSystemPrompt — build system prompt đầy đủ cho LLM call.
 *
 * @param profileId - Agent profile ID
 * @param ctx - Conversation context hiện tại
 * @param opts - Options: graphEvidence, persona override
 */
export function buildSystemPrompt(
  profileId: AgentProfileId,
  ctx: ConversationContext,
  opts: {
    graphEvidence?: string | null
    personaOverride?: string
    includeJsonSchema?: boolean
    forGemini?: boolean
  } = {}
): string {
  const config = loadPromptConfig()
  const profile = getAgentProfile(profileId)
  const profileConfig = config.profiles[profileId] ?? {}

  const parts: string[] = []

  // 1. Base system + profile persona
  const baseSystem = profileConfig.system || config.base_system || ""
  const agentPersona = opts.personaOverride || profile.persona
  parts.push(`${baseSystem}\n\nAGENT_PROFILE:${profile.id}\n${agentPersona}`)

  // 2. Safety reminder
  if (config.safety_reminder) {
    parts.push(config.safety_reminder)
  }

  // 3. Context injection từ ConversationContext
  if (ctx.triageState.active) {
    const riskLabel = {
      emergency: "🔴 KHẨN CẤP",
      high: "🟠 NGUY CƠ CAO",
      medium: "🟡 TRUNG BÌNH",
      low: "🟢 THẤP",
      unknown: "⚪ CHƯA XÁC ĐỊNH",
    }[ctx.triageState.riskLevel] ?? "⚪ CHƯA XÁC ĐỊNH"

    parts.push(`\nTRIAGE_CONTEXT:\n- Mức độ nguy cơ: ${riskLabel}\n- Sẵn sàng CTA: ${ctx.triageState.readyForCta ? "Có" : "Chưa — tiếp tục hỏi"}`)

    if (ctx.triageState.followUpQuestions.length > 0) {
      parts.push(`- Cần hỏi thêm: ${ctx.triageState.followUpQuestions.join("; ")}`)
    }

    if (ctx.triageState.emergencyKeywordsDetected.length > 0) {
      parts.push(`- Từ khóa khẩn cấp phát hiện: ${ctx.triageState.emergencyKeywordsDetected.join(", ")}`)
    }
  }

  // 4. Thông tin bệnh nhân đã thu thập
  const { collectedInfo } = ctx
  const knownInfo: string[] = []
  if (collectedInfo.age) knownInfo.push(`Tuổi: ${collectedInfo.age}`)
  if (collectedInfo.gender) knownInfo.push(`Giới: ${collectedInfo.gender === "male" ? "Nam" : "Nữ"}`)
  if (collectedInfo.symptoms?.length) knownInfo.push(`Triệu chứng: ${collectedInfo.symptoms.join(", ")}`)
  if (collectedInfo.onset) knownInfo.push(`Khởi phát: ${collectedInfo.onset}`)
  if (collectedInfo.severity) knownInfo.push(`Mức độ: ${collectedInfo.severity}`)
  if (collectedInfo.comorbidities?.length) knownInfo.push(`Bệnh nền: ${collectedInfo.comorbidities.join(", ")}`)
  if (collectedInfo.medications?.length) knownInfo.push(`Thuốc đang dùng: ${collectedInfo.medications.join(", ")}`)
  if (collectedInfo.pregnancy) knownInfo.push("Đang mang thai: Có")

  if (knownInfo.length > 0) {
    parts.push(`\nPATIENT_INFO_COLLECTED:\n${knownInfo.map((i) => `- ${i}`).join("\n")}`)
    parts.push("(Sử dụng thông tin trên để đưa ra tư vấn phù hợp. Không hỏi lại thông tin đã biết.)")
  }

  // 5. Graph Evidence (RAG context)
  if (opts.graphEvidence) {
    parts.push(`\nGRAPH_EVIDENCE:\n${String(opts.graphEvidence).substring(0, 1500)}`)
    parts.push("(Sử dụng bằng chứng trên để hỗ trợ câu trả lời. Trích dẫn nguồn nếu có.)")
  }

  // 6. JSON Action Schema (chỉ khi cần)
  if (opts.includeJsonSchema) {
    const schemaInstruction = profileConfig.json_schema_instruction || config.json_action_schema || ""
    if (schemaInstruction) {
      parts.push(`\nJSON_ACTIONS_INSTRUCTION:\n${schemaInstruction}`)
    }
  }

  return parts.filter(Boolean).join("\n\n")
}

/**
 * buildFallbackActions — build danh sách actions cho rule-based fallback.
 * Thay thế buildGatewayFallbackActions() trong agent-chat/route.ts.
 * Dùng khi LLM không sinh ra actions hợp lệ.
 */
export function buildFallbackActions(
  profileId: AgentProfileId,
  ctx: ConversationContext
): Array<{ type: string; args: Record<string, unknown> }> {
  const { triageState } = ctx

  // Emergency → luôn show bac-si
  if (triageState.riskLevel === "emergency") {
    return [{
      type: "ask_navigation",
      args: { feature: "bac-si", reason: "Đây có thể là tình huống khẩn cấp. Hãy gọi 115 ngay hoặc đến cơ sở y tế gần nhất." },
    }]
  }

  // Triage active nhưng chưa đủ thông tin → không show CTA
  if (triageState.active && !triageState.readyForCta) return []

  // Mapping profile → feature
  const profileFeatureMap: Partial<Record<AgentProfileId, string>> = {
    medication: "tra-cuu",
    care_plan: "ke-hoach",
    therapy: "tri-lieu",
    doctor_referral: "bac-si",
    triage: "bac-si",
  }

  const profileReasonMap: Partial<Record<AgentProfileId, string>> = {
    medication: "Mở tra cứu để xem thông tin thuốc/tương tác chính xác hơn.",
    care_plan: "Mở kế hoạch chăm sóc để lập lộ trình theo dõi cụ thể.",
    therapy: "Mở trị liệu để xem bài tập thở/grounding và kỹ thuật giảm căng thẳng.",
    doctor_referral: "Mở bác sĩ để xem hồ sơ và đặt hẹn.",
    triage: "Triệu chứng này có thể cần bác sĩ đánh giá sớm để loại trừ nguy cơ cấp cứu.",
  }

  const feature = profileFeatureMap[profileId]
  if (feature) {
    const reason = profileReasonMap[profileId] ?? "Mở tính năng phù hợp."
    return [{ type: "ask_navigation", args: { feature, reason } }]
  }

  return []
}

// ─── Default Config ─────────────────────────────────────────────────────────────

/** Config mặc định khi file prompt-config.json không tồn tại */
function getDefaultPromptConfig(): PromptConfig {
  return {
    version: "1.0-default",
    base_system: [
      "Bạn là Trợ lý Y tế AI (AiMed). Nhiệm vụ: cung cấp thông tin y tế hữu ích, chính xác, an toàn bằng Tiếng Việt.",
      "NGUYÊN TẮC: An toàn là trên hết. Luôn khuyến cáo đi khám bác sĩ khi có dấu hiệu nghiêm trọng.",
      "Không chẩn đoán khẳng định. Không kê đơn thuốc thay bác sĩ.",
    ].join("\n"),
    safety_reminder: "Nếu người dùng có dấu hiệu khẩn cấp, hãy khuyến nghị gọi 115 hoặc đến cơ sở y tế ngay.",
    json_action_schema: [
      "Khi cần gợi ý người dùng sử dụng tính năng, hãy trả về JSON actions:",
      '{"actions": [{"type": "ask_navigation", "args": {"feature": "<feature_id>", "reason": "<lý do bằng tiếng Việt>"}}]}',
      "Feature IDs hợp lệ: sang-loc, tri-lieu, tra-cuu, bac-si, ke-hoach, thong-ke",
    ].join("\n"),
    profiles: {},
  }
}
