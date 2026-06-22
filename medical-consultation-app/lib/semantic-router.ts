/**
 * Semantic Router — thay thế detectIntentFlags() + inferAgentProfileId()
 *
 * Thay vì if/else chuỗi, mỗi profile có một bảng tín hiệu (signals) với trọng số.
 * Router tính điểm cho từng profile → chọn profile cao nhất vượt ngưỡng.
 *
 * Lợi ích:
 * - Dễ thêm signal mới mà không phá vỡ luồng cũ
 * - Mỗi signal có thể test độc lập
 * - Sẵn sàng swap bằng LangGraph Python classifier sau này
 * - Hỗ trợ multi-turn: xét lịch sử hội thoại, không chỉ tin nhắn hiện tại
 */

import type { AgentProfileId } from "./agent-profiles"

// ─── Types ─────────────────────────────────────────────────────────────────────

export type RouterSignal = {
  /** Regex test trên text đã lowercase + bỏ dấu */
  pattern: RegExp
  /** Trọng số điểm khi khớp (1.0 = chuẩn, 2.0 = ưu tiên cao) */
  weight: number
  /** Mô tả cho debug/logging */
  label: string
}

export type RouterProfile = {
  id: AgentProfileId
  signals: RouterSignal[]
  /** Điểm tối thiểu để chọn profile này */
  threshold: number
  /** Mức độ ưu tiên khi điểm bằng nhau (cao hơn = ưu tiên hơn) */
  priority: number
}

export type IntentScore = {
  profileId: AgentProfileId
  score: number
  matchedSignals: string[]
}

export type RouterResult = {
  profileId: AgentProfileId
  scores: IntentScore[]
  source: "semantic_router_v1"
  confidence: "high" | "medium" | "low"
}

export type IntentFlags = {
  triage: boolean
  therapy: boolean
  medication: boolean
  plan: boolean
  doctor: boolean
  wantsGraph: boolean
  source: "semantic_router_v1"
}

// ─── Signal helpers ───────────────────────────────────────────────────────────

/** Chuẩn hóa text: lowercase + bỏ dấu tiếng Việt */
function normalize(text: string): string {
  return String(text || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
}

/** Gộp text gốc + bỏ dấu để test cả hai */
function expandText(text: string): string {
  const lower = String(text || "").toLowerCase()
  const ascii = normalize(lower)
  return `${lower} ${ascii}`
}

// ─── Routing Table ─────────────────────────────────────────────────────────────
// Mỗi profile có nhiều signals với trọng số khác nhau.
// Các signal có weight 2.0+ là "red flags" hoặc "strong indicator".

export const ROUTER_PROFILES: RouterProfile[] = [
  // ── 1. Triage (Emergency / Red flags) ──────────────────────────────────────
  {
    id: "triage",
    threshold: 1.5,
    priority: 10, // highest — safety first
    signals: [
      { pattern: /dau nguc|kho tho|yeu liet|noi kho|ngat xiu|ngat|co giat|lu lan|dau bung du doi|cap cuu|911|115|khan cap/i, weight: 2.5, label: "emergency_keywords" },
      { pattern: /đau ngực|khó thở|yếu liệt|nói khó|ngất|co giật|lú lẫn|đau bụng dữ dội|cấp cứu|khẩn cấp/i, weight: 2.5, label: "emergency_keywords_vn" },
      { pattern: /chay mau nhieu|chảy máu nhiều|mat nuoc nang|mất nước nặng|nguy hiem|nguy hiểm/i, weight: 2.0, label: "danger_signs" },
      { pattern: /sang loc|sàng lọc|muc do nang|mức độ nặng|trieu chung|triệu chứng.*nang/i, weight: 1.0, label: "triage_intent" },
      { pattern: /sot cao|sốt cao|nhip tim nhanh|nhịp tim nhanh|kho nuot|khó nuốt/i, weight: 1.5, label: "urgent_vitals" },
    ],
  },

  // ── 2. Doctor Referral ──────────────────────────────────────────────────────
  {
    id: "doctor_referral",
    threshold: 1.5,
    priority: 8,
    signals: [
      { pattern: /bac si|bác sĩ|dat hen|đặt hẹn|dat lich|đặt lịch|hen kham|hẹn khám|kham benh|khám bệnh/i, weight: 2.0, label: "appointment_intent" },
      { pattern: /tu van truc tiep|tư vấn trực tiếp|gap bac si|gặp bác sĩ|phong kham|phòng khám/i, weight: 2.0, label: "direct_consultation" },
      { pattern: /chuyen khoa|chuyên khoa|tim mach|tim mạch|than kinh|thần kinh|noi tiet|nội tiết/i, weight: 1.5, label: "specialty_reference" },
      { pattern: /chi phi kham|chi phi khám|bao hiem|bảo hiểm|vien phi|viện phí/i, weight: 1.0, label: "appointment_logistics" },
    ],
  },

  // ── 3. Therapy (Mental health) ─────────────────────────────────────────────
  {
    id: "therapy",
    threshold: 1.0,
    priority: 7,
    signals: [
      { pattern: /lo au|lo âu|tram cam|trầm cảm|mat ngu|mất ngủ|hoang loan|hoảng loạn|tu hai|tự hại|tu sat|tự sát/i, weight: 2.0, label: "mental_health_core" },
      { pattern: /cang thang|căng thẳng|stress|am anh|ám ảnh|buon lon|buồn lòng|that vong|thất vọng/i, weight: 1.5, label: "emotional_distress" },
      { pattern: /tri lieu|trị liệu|tam ly|tâm lý|cbt|mindfulness|thien|thiền|bai tho|bài thở|grounding/i, weight: 1.5, label: "therapy_intent" },
      { pattern: /khoc|khóc|co don|cô đơn|vo nghia|vô nghĩa|met moi|mệt mỏi tinh than|tinh than/i, weight: 1.0, label: "emotional_state" },
      { pattern: /ngu khong duoc|ngủ không được|thuc khuya|thức khuya|giac ngu|giấc ngủ/i, weight: 1.0, label: "sleep_issues" },
    ],
  },

  // ── 4. Medication ──────────────────────────────────────────────────────────
  {
    id: "medication",
    threshold: 1.0,
    priority: 6,
    signals: [
      { pattern: /ibuprofen|paracetamol|aspirin|statin|metformin|amoxicillin|omeprazole|lisinopril/i, weight: 2.5, label: "drug_name" },
      { pattern: /khang sinh|kháng sinh|thuoc ha sot|thuốc hạ sốt|thuoc giam dau|thuốc giảm đau|thuoc ngu|thuốc ngủ/i, weight: 2.0, label: "drug_category" },
      { pattern: /tuong tac|tương tác|tac dung phu|tác dụng phụ|chong chi dinh|chống chỉ định|lieu dung|liều dùng/i, weight: 2.0, label: "pharmacology" },
      { pattern: /thuoc|thuốc|uong|uống|vien|viên|tiem|tiêm|lieu|liều/i, weight: 1.0, label: "medication_general" },
      { pattern: /nen uong thuoc gi|nên uống thuốc gì|thuoc nao|thuốc nào|dung thuoc|dùng thuốc/i, weight: 1.5, label: "medication_query" },
    ],
  },

  // ── 5. Care Plan ───────────────────────────────────────────────────────────
  {
    id: "care_plan",
    threshold: 1.0,
    priority: 5,
    signals: [
      { pattern: /ke hoach|kế hoạch|lo trinh|lộ trình|theo doi|theo dõi|lich trinh|lịch trình/i, weight: 2.0, label: "planning_intent" },
      { pattern: /giam can|giảm cân|tang can|tăng cân|tap luyen|tập luyện|an uong|ăn uống|che do an|chế độ ăn/i, weight: 1.5, label: "lifestyle_planning" },
      { pattern: /muc tieu|mục tiêu|nhat ky|nhật ký|routine|thoi quen|thói quen|tien trinh|tiến trình/i, weight: 1.5, label: "goal_tracking" },
      { pattern: /nhac nho|nhắc nhở|reminder|lich kham|lịch khám|nhac|nhắc/i, weight: 1.0, label: "reminder_intent" },
    ],
  },

  // ── 6. Default (General consultation) ─────────────────────────────────────
  {
    id: "default",
    threshold: 0, // always matches as fallback
    priority: 1,
    signals: [
      { pattern: /tu van|tư vấn|suc khoe|sức khỏe|benh|bệnh|trieu chung|triệu chứng/i, weight: 0.5, label: "general_health" },
      { pattern: /hoi|hỏi|can biet|cần biết|giai thich|giải thích|tim hieu|tìm hiểu/i, weight: 0.3, label: "general_query" },
    ],
  },
]

// ─── Scorer ────────────────────────────────────────────────────────────────────

/** Tính điểm cho một profile dựa trên text */
export function scoreProfile(text: string, profile: RouterProfile): IntentScore {
  const expanded = expandText(text)
  let score = 0
  const matchedSignals: string[] = []

  for (const signal of profile.signals) {
    if (signal.pattern.test(expanded)) {
      score += signal.weight
      matchedSignals.push(signal.label)
    }
  }

  return { profileId: profile.id, score, matchedSignals }
}

// ─── Main Router ───────────────────────────────────────────────────────────────

/**
 * semanticRoute — định tuyến tin nhắn sang AgentProfileId phù hợp nhất.
 *
 * @param message - Tin nhắn người dùng hiện tại
 * @param history - Lịch sử hội thoại (optional, dùng cho context boosting)
 * @returns RouterResult với profile được chọn và điểm số đầy đủ
 */
export function semanticRoute(message: string, history: Array<{ role: string; content: string }> = []): RouterResult {
  const scores: IntentScore[] = ROUTER_PROFILES.map((p) => scoreProfile(message, p))

  // Context boosting: nếu có lịch sử, tăng nhẹ điểm cho profile đã được dùng gần đây
  if (history.length > 0) {
    const recentAssistant = history
      .filter((m) => m.role === "assistant")
      .slice(-3)
      .map((m) => String(m.content || "").substring(0, 200))
      .join(" ")

    if (recentAssistant) {
      for (const score of scores) {
        const profile = ROUTER_PROFILES.find((p) => p.id === score.profileId)
        if (!profile) continue
        // Nhỏ bonus nếu context gần đây cũng có signal của profile này
        const contextScore = scoreProfile(recentAssistant, profile)
        if (contextScore.score > 0) {
          score.score += contextScore.score * 0.2 // 20% bonus từ context
          if (contextScore.matchedSignals.length) {
            score.matchedSignals.push(`ctx:${contextScore.matchedSignals[0]}`)
          }
        }
      }
    }
  }

  // Sắp xếp: điểm cao nhất, ưu tiên cao hơn khi điểm bằng nhau
  const ranked = [...scores].sort((a, b) => {
    if (Math.abs(a.score - b.score) > 0.01) return b.score - a.score
    const pa = ROUTER_PROFILES.find((p) => p.id === a.profileId)?.priority ?? 0
    const pb = ROUTER_PROFILES.find((p) => p.id === b.profileId)?.priority ?? 0
    return pb - pa
  })

  // Chọn profile đầu tiên vượt ngưỡng
  let chosen = ranked[0]
  for (const score of ranked) {
    const profile = ROUTER_PROFILES.find((p) => p.id === score.profileId)!
    if (score.score >= profile.threshold) {
      chosen = score
      break
    }
  }

  // Xác định độ tin cậy
  const confidence: RouterResult["confidence"] =
    chosen.score >= 2.0 ? "high" : chosen.score >= 1.0 ? "medium" : "low"

  return {
    profileId: chosen.profileId,
    scores: ranked,
    source: "semantic_router_v1",
    confidence,
  }
}

/**
 * detectIntentFlags — tính toán tất cả flag song song từ router scores.
 * Thay thế hàm detectIntentFlags() cũ trong agent-chat/route.ts.
 */
export function detectIntentFlags(message: string, history: Array<{ role: string; content: string }> = []): IntentFlags {
  const expanded = expandText(message)
  const scores = ROUTER_PROFILES.reduce<Record<string, number>>((acc, profile) => {
    acc[profile.id] = scoreProfile(message, profile).score
    return acc
  }, {})

  return {
    triage: (scores["triage"] ?? 0) >= 1.5,
    therapy: (scores["therapy"] ?? 0) >= 1.0,
    medication: (scores["medication"] ?? 0) >= 1.0,
    plan: (scores["care_plan"] ?? 0) >= 1.0,
    doctor: (scores["doctor_referral"] ?? 0) >= 1.5,
    wantsGraph: /graph|evidence/i.test(expanded),
    source: "semantic_router_v1",
  }
}

/**
 * inferAgentProfileId — wrapper đơn giản cho backward compatibility.
 * Code cũ gọi inferAgentProfileId(message) → vẫn hoạt động.
 */
export function inferAgentProfileId(message: string, history: Array<{ role: string; content: string }> = []): AgentProfileId {
  return semanticRoute(message, history).profileId
}
