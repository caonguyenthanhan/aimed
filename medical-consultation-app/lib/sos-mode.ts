export type SosHotline = { label: string; number: string }

export type SosAssessment = {
  triggered: boolean
  score: number
  reasons: string[]
  hotlines: SosHotline[]
}

const HOTLINES: SosHotline[] = [
  { label: "Cấp cứu", number: "115" },
  { label: "Bảo vệ trẻ em", number: "111" },
]

const KEYWORDS: Array<{ re: RegExp; score: number; reason: string }> = [
  { re: /\b(tự\s*tử|tự\s*sát|tự\s*hại|tự\s*cắt|cắt\s*tay|rạch\s*tay)\b/i, score: 4, reason: "Từ khóa tự hại" },
  { re: /\b(muốn\s*chết|không\s*muốn\s*sống|kết\s*liễu|tôi\s*sẽ\s*chết|mình\s*sẽ\s*chết)\b/i, score: 4, reason: "Ý định tự tử" },
  { re: /\b(uống\s*quá\s*liều|overdose|nhảy\s*lầu|treo\s*cổ|dao|lưỡi\s*lam)\b/i, score: 3, reason: "Phương tiện/phương thức" },
  { re: /\b(giết\s*mình|giết\s*tôi|tự\s*kết\s*liễu)\b/i, score: 4, reason: "Ngôn ngữ tự kết liễu" },
  { re: /\b(muốn\s*giết|giết\s*người|đâm\s*ai|xâm\s*hại)\b/i, score: 3, reason: "Nguy cơ gây hại" },
]

export function assessSos(text: string, history?: any[]): SosAssessment {
  const parts: string[] = []
  const t = String(text || "")
  if (t) parts.push(t)
  if (Array.isArray(history)) {
    for (const m of history.slice(-6)) {
      const c = String((m as any)?.content || "")
      if (c) parts.push(c)
    }
  }
  const combined = parts.join("\n")
  let score = 0
  const reasons: string[] = []
  for (const k of KEYWORDS) {
    if (k.re.test(combined)) {
      score += k.score
      reasons.push(k.reason)
    }
  }
  return { triggered: score >= 4, score, reasons: Array.from(new Set(reasons)), hotlines: HOTLINES }
}

export function buildSosResponse(hotlines: SosHotline[]) {
  const lines = hotlines.map((h) => `- ${h.label}: ${h.number}`).join("\n")
  return [
    "Mình rất lo cho sự an toàn của bạn.",
    "Nếu bạn đang có ý nghĩ tự làm hại bản thân hoặc cảm thấy mất kiểm soát, hãy ưu tiên gọi hỗ trợ ngay bây giờ:",
    lines,
    "Nếu bạn đang ở một mình, hãy gọi cho người thân/bạn bè gần nhất và ở nơi an toàn (tránh ban công/dao/thuốc).",
    "Nếu bạn muốn, hãy trả lời: bạn có đang an toàn ngay lúc này không?",
  ]
    .filter(Boolean)
    .join("\n")
}

