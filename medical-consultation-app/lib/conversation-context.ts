/**
 * Conversation Context — theo dõi trạng thái hội thoại qua nhiều lượt.
 *
 * Giải quyết vấn đề: hệ thống cũ stateless — mỗi tin nhắn xử lý độc lập,
 * không nhớ đã hỏi gì, người dùng đã cung cấp thông tin gì.
 *
 * Context object được build từ lịch sử messages[] và enriched per-turn.
 */

import type { AgentProfileId } from "./agent-profiles"

// ─── Types ─────────────────────────────────────────────────────────────────────

export type RiskLevel = "unknown" | "low" | "medium" | "high" | "emergency"

/** Thông tin thu thập được từ người dùng qua các lượt hội thoại */
export type CollectedPatientInfo = {
  age?: string
  gender?: string
  symptoms?: string[]
  onset?: string          // khi nào bắt đầu
  severity?: string       // mức độ (1-10 hoặc mô tả)
  comorbidities?: string[]// bệnh nền
  medications?: string[]  // thuốc đang dùng
  allergies?: string[]    // dị ứng
  pregnancy?: boolean
  lastUpdate?: string     // ISO timestamp
}

/** Trạng thái triage */
export type TriageState = {
  active: boolean
  riskLevel: RiskLevel
  readyForCta: boolean    // true khi đã đủ thông tin để đề xuất CTA
  followUpQuestions: string[]  // câu hỏi tiếp theo cần hỏi
  emergencyKeywordsDetected: string[]
}

/** Cấu trúc Context đầy đủ */
export type ConversationContext = {
  conversationId: string
  profileId: AgentProfileId
  turnCount: number
  collectedInfo: CollectedPatientInfo
  triageState: TriageState
  lastActionTypes: string[]     // track actions đã show để tránh duplicate
  lastProfileId?: AgentProfileId // profile của lượt trước
  sessionStarted: string        // ISO timestamp
}

// ─── Constants ─────────────────────────────────────────────────────────────────

const TRIAGE_FOLLOWUP_QUESTIONS = [
  "Bạn bao nhiêu tuổi và giới tính gì?",
  "Triệu chứng bắt đầu khi nào (vài giờ, vài ngày)?",
  "Mức độ khó chịu từ 1-10, 10 là đau nhất?",
  "Bạn có bệnh nền không (tim mạch, tiểu đường, cao huyết áp)?",
  "Bạn đang dùng thuốc gì không?",
]

const EMERGENCY_PATTERNS = [
  /dau nguc|đau ngực|kho tho|khó thở/i,
  /yeu liet|yếu liệt|noi kho|nói khó/i,
  /ngat xiu|ngất xỉu|co giat|co giật/i,
  /lu lan|lú lẫn|mat y thuc|mất ý thức/i,
  /chay mau nhieu|chảy máu nhiều/i,
  /cap cuu|cấp cứu|khan cap|khẩn cấp/i,
]

const AGE_PATTERN = /(\d{1,3})\s*(tuoi|tuổi|t\b)/i
const SYMPTOM_PATTERNS = [
  /dau|đau/i,
  /sot|sốt/i,
  /ho\b|ho khan|ho có đờm/i,
  /buon non|buồn nôn|non|nôn/i,
  /met|mệt/i,
]

// ─── Extractors ────────────────────────────────────────────────────────────────

/**
 * Trích xuất thông tin bệnh nhân từ text tin nhắn
 */
export function extractPatientInfo(text: string, current: CollectedPatientInfo = {}): Partial<CollectedPatientInfo> {
  const lower = String(text || "").toLowerCase()
  const ascii = lower.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
  const combined = `${lower} ${ascii}`

  const updates: Partial<CollectedPatientInfo> = {}

  // Tuổi
  if (!current.age) {
    const ageMatch = combined.match(AGE_PATTERN)
    if (ageMatch) {
      const age = parseInt(ageMatch[1], 10)
      if (age > 0 && age < 120) {
        updates.age = `${age}`
      }
    }
  }

  // Giới tính
  if (!current.gender) {
    if (/\b(nam|con trai|ong|anh|chong|bo|toi la nam)\b/i.test(combined)) {
      updates.gender = "male"
    } else if (/\b(nu|con gai|ba|chi|vo|me|toi la nu)\b/i.test(combined)) {
      updates.gender = "female"
    }
  }

  // Thai kỳ
  if (current.pregnancy === undefined) {
    if (/mang thai|có thai|thai ky|bau|pregnant/i.test(combined)) {
      updates.pregnancy = true
    }
  }

  // Triệu chứng (append, không overwrite)
  const newSymptoms: string[] = []
  for (const pattern of SYMPTOM_PATTERNS) {
    if (pattern.test(combined)) {
      const match = combined.match(pattern)
      if (match && match[0]) newSymptoms.push(match[0])
    }
  }
  if (newSymptoms.length > 0) {
    const existingSymptoms = current.symptoms || []
    const merged = Array.from(new Set([...existingSymptoms, ...newSymptoms]))
    if (merged.length > existingSymptoms.length) {
      updates.symptoms = merged
    }
  }

  // Thời gian khởi phát
  if (!current.onset) {
    const onsetMatch = combined.match(/(tu hom qua|hom qua|may ngay|\d+\s*ngay|may gio|\d+\s*gio|sang nay|toi nay|tu sang|moi day)/i)
    if (onsetMatch) updates.onset = onsetMatch[0]
  }

  // Mức độ (severity 1-10)
  if (!current.severity) {
    const sevMatch = combined.match(/\b([1-9]|10)\s*\/\s*10\b|\bmuc\s*(\d)\b/i)
    if (sevMatch) updates.severity = sevMatch[0]
  }

  if (Object.keys(updates).length > 0) {
    updates.lastUpdate = new Date().toISOString()
  }

  return updates
}

/**
 * Kiểm tra tín hiệu emergency từ text
 */
export function detectEmergencySignals(text: string): string[] {
  const lower = String(text || "").toLowerCase()
  const combined = `${lower} ${lower.normalize("NFD").replace(/[\u0300-\u036f]/g, "")}`
  const detected: string[] = []
  for (const pattern of EMERGENCY_PATTERNS) {
    const match = combined.match(pattern)
    if (match) detected.push(match[0])
  }
  return detected
}

/**
 * Xác định xem context đã sẵn sàng để hiện CTA chưa
 */
export function isContextReadyForCta(ctx: ConversationContext): boolean {
  const { collectedInfo, triageState, turnCount } = ctx

  // Emergency luôn sẵn sàng CTA
  if (triageState.riskLevel === "emergency") return true

  // Triage: cần có ít nhất tuổi + 1 triệu chứng
  if (triageState.active) {
    const hasAge = Boolean(collectedInfo.age)
    const hasSymptoms = (collectedInfo.symptoms?.length ?? 0) > 0
    return hasAge && hasSymptoms
  }

  // Non-triage: sau >=2 lượt hoặc có thông tin cơ bản
  return turnCount >= 2 || Boolean(collectedInfo.age || collectedInfo.symptoms?.length)
}

/**
 * Lấy danh sách câu hỏi follow-up còn thiếu theo thứ tự ưu tiên
 */
export function getFollowUpQuestions(ctx: ConversationContext): string[] {
  const { collectedInfo } = ctx
  const missing: string[] = []

  if (!collectedInfo.age) missing.push(TRIAGE_FOLLOWUP_QUESTIONS[0])
  if (!collectedInfo.onset) missing.push(TRIAGE_FOLLOWUP_QUESTIONS[1])
  if (!collectedInfo.severity) missing.push(TRIAGE_FOLLOWUP_QUESTIONS[2])
  if (!collectedInfo.comorbidities?.length) missing.push(TRIAGE_FOLLOWUP_QUESTIONS[3])
  if (!collectedInfo.medications?.length) missing.push(TRIAGE_FOLLOWUP_QUESTIONS[4])

  return missing.slice(0, 2) // Hỏi tối đa 2 câu một lúc
}

// ─── Context Builder ───────────────────────────────────────────────────────────

/**
 * buildContext — xây dựng ConversationContext từ lịch sử hội thoại.
 * Gọi mỗi lần nhận message mới, trước khi gọi LLM.
 */
export function buildContext(
  conversationId: string,
  profileId: AgentProfileId,
  messages: Array<{ role: string; content: string }>,
  previousContext?: Partial<ConversationContext>
): ConversationContext {
  const userMessages = messages.filter((m) => m.role === "user")
  const turnCount = userMessages.length

  // Khởi tạo thông tin đã thu thập
  let collectedInfo: CollectedPatientInfo = previousContext?.collectedInfo ?? {}

  // Trích xuất thông tin từ các tin nhắn của user
  for (const msg of userMessages) {
    const updates = extractPatientInfo(msg.content, collectedInfo)
    collectedInfo = { ...collectedInfo, ...updates }
  }

  // Phát hiện emergency signals trong toàn bộ lịch sử
  const allText = userMessages.map((m) => m.content).join(" ")
  const emergencySignals = detectEmergencySignals(allText)
  const isEmergency = emergencySignals.length > 0

  // Build triage state
  const isTriageActive =
    profileId === "triage" ||
    isEmergency ||
    (previousContext?.triageState?.active ?? false)

  const riskLevel: RiskLevel = isEmergency
    ? "emergency"
    : isTriageActive
    ? (previousContext?.triageState?.riskLevel ?? "unknown")
    : "unknown"

  const ctx: ConversationContext = {
    conversationId: conversationId || crypto.randomUUID(),
    profileId,
    turnCount,
    collectedInfo,
    triageState: {
      active: isTriageActive,
      riskLevel,
      readyForCta: false, // sẽ tính ngay sau
      followUpQuestions: [],
      emergencyKeywordsDetected: emergencySignals,
    },
    lastActionTypes: previousContext?.lastActionTypes ?? [],
    lastProfileId: previousContext?.profileId,
    sessionStarted: previousContext?.sessionStarted ?? new Date().toISOString(),
  }

  // Cập nhật readyForCta và followUpQuestions
  ctx.triageState.readyForCta = isContextReadyForCta(ctx)
  ctx.triageState.followUpQuestions = isTriageActive && !ctx.triageState.readyForCta
    ? getFollowUpQuestions(ctx)
    : []

  return ctx
}

/**
 * mergeContextWithGatewayMeta — merge gateway triage metadata từ FastAPI
 * vào context hiện tại (backward compat với architecture cũ)
 */
export function mergeContextWithGatewayMeta(
  ctx: ConversationContext,
  gatewayMeta?: {
    active?: boolean
    ready_for_cta?: boolean | null
    risk_level?: string | null
    follow_up_questions?: string[]
  }
): ConversationContext {
  if (!gatewayMeta?.active) return ctx

  const riskMap: Record<string, RiskLevel> = {
    emergency: "emergency", high: "high", medium: "medium", low: "low", unknown: "unknown",
  }

  return {
    ...ctx,
    triageState: {
      ...ctx.triageState,
      active: true,
      riskLevel: riskMap[String(gatewayMeta.risk_level || "").toLowerCase()] ?? ctx.triageState.riskLevel,
      readyForCta: gatewayMeta.ready_for_cta === true,
      followUpQuestions: Array.isArray(gatewayMeta.follow_up_questions)
        ? gatewayMeta.follow_up_questions
        : ctx.triageState.followUpQuestions,
    },
  }
}

// ─── Context serialization (cho API response metadata) ────────────────────────

/** Serialize context thành object an toàn để trả về trong metadata */
export function serializeContext(ctx: ConversationContext): Record<string, unknown> {
  return {
    profile_id: ctx.profileId,
    turn_count: ctx.turnCount,
    triage_active: ctx.triageState.active,
    risk_level: ctx.triageState.riskLevel,
    ready_for_cta: ctx.triageState.readyForCta,
    collected_fields: Object.keys(ctx.collectedInfo).filter(
      (k) => ctx.collectedInfo[k as keyof CollectedPatientInfo] !== undefined
    ),
  }
}
