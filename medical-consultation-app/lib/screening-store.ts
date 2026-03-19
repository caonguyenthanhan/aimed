export type ScreeningResult = {
  assessment_id: string
  title: string
  score: number
  level: string
  description?: string
  recommendations?: string[]
  ts: number
}

const LAST_SCREENING_KEY = "mcs_last_screening_v1"
const SCREENING_HISTORY_KEY = "mcs_screening_history_v1"
const PENDING_SCREENING_CONTEXT_KEY = "mcs_pending_screening_context_v1"
const CARE_PLAN_KEY = "mcs_care_plan_v1"

export type CarePlan = {
  severity: "low" | "medium" | "high"
  focus: string
  screening: { assessment_id: string; title: string; score: number; level: string; ts: number }
  suggestedArticles: string[]
  suggestedTherapy: Array<{ title: string; desc: string; href?: string }>
  suggestedReminders: Array<{ id: string; time: string; message: string; enabled: boolean }>
  generated_at: number
}

function safeJsonParse<T>(raw: string | null): T | null {
  if (!raw) return null
  try {
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

export function getLastScreening(): ScreeningResult | null {
  try {
    return safeJsonParse<ScreeningResult>(localStorage.getItem(LAST_SCREENING_KEY))
  } catch {
    return null
  }
}

export function getScreeningHistory(): ScreeningResult[] {
  try {
    const arr = safeJsonParse<any[]>(localStorage.getItem(SCREENING_HISTORY_KEY))
    if (!Array.isArray(arr)) return []
    return arr
      .map((x) => ({
        assessment_id: String(x?.assessment_id || ""),
        title: String(x?.title || ""),
        score: Number(x?.score || 0),
        level: String(x?.level || ""),
        description: typeof x?.description === "string" ? x.description : undefined,
        recommendations: Array.isArray(x?.recommendations) ? x.recommendations.map((s: any) => String(s || "")).filter(Boolean) : undefined,
        ts: Number(x?.ts || 0),
      }))
      .filter((x) => x.assessment_id && x.title && Number.isFinite(x.score) && x.ts > 0)
      .sort((a, b) => (b.ts || 0) - (a.ts || 0))
  } catch {
    return []
  }
}

function isNegativeLevel(level: string) {
  const s = String(level || "").toLowerCase()
  return s.includes("nặng") || s.includes("trung bình") || s.includes("cao") || s.includes("nguy cơ")
}

function deriveCarePlan(result: ScreeningResult): CarePlan {
  const lvl = String(result.level || "").trim()
  const negative = isNegativeLevel(lvl)
  const severity: CarePlan["severity"] = negative ? "high" : lvl ? "medium" : "low"
  const focus =
    severity === "high"
      ? "Ổn định cảm xúc và giảm căng thẳng"
      : severity === "medium"
        ? "Củng cố thói quen và theo dõi"
        : "Duy trì sức khỏe tinh thần"

  const suggestedArticles = (() => {
    if (severity === "high") {
      return [
        "kỹ thuật thở giảm lo âu",
        "vệ sinh giấc ngủ",
        "thiền định mindfulness",
        "cách giảm stress",
        "khi nào cần gặp chuyên gia tâm lý",
      ]
    }
    if (severity === "medium") {
      return [
        "kỹ thuật thư giãn",
        "thói quen ngủ tốt",
        "vận động nhẹ mỗi ngày",
        "dinh dưỡng hỗ trợ tâm lý",
        "tư vấn sức khỏe tinh thần",
      ]
    }
    return ["dinh dưỡng và vận động", "y tế cộng đồng", "khuyến cáo y khoa mới", "phòng bệnh", "giấc ngủ và sức khỏe"]
  })()

  const suggestedTherapy = (() => {
    if (severity === "high") {
      return [
        { title: "Check-in tâm trạng (mỗi ngày)", desc: "Ghi lại tâm trạng để nhìn xu hướng và tác nhân.", href: "/tri-lieu" },
        { title: "Nhật ký 3 dòng", desc: "Viết ngắn: hôm nay thấy gì, điều gì khó, một điều nhỏ mình làm được.", href: "/tri-lieu" },
        { title: "Tâm sự với AI", desc: "Bắt đầu bằng kết quả sàng lọc và nói về điều khó nhất.", href: "/tam-su" },
      ]
    }
    return [
      { title: "Check-in tâm trạng", desc: "Ghi nhanh tâm trạng và 1-2 tag.", href: "/tri-lieu" },
      { title: "Nhật ký", desc: "Ghi chú các suy nghĩ chính để giảm quá tải.", href: "/tri-lieu" },
    ]
  })()

  const suggestedReminders = (() => {
    const base = [
      {
        id: "daily_selfcare",
        time: "20:30",
        message: "Đến giờ làm 1 việc nhỏ cho bản thân: đi bộ 10 phút, dọn bàn, hoặc nhắn tin cho người thân.",
        enabled: true,
      },
    ]
    if (severity === "high") {
      return [
        { id: "daily_checkin", time: "09:00", message: "Check-in tâm trạng: bạn đang thấy thế nào sáng nay?", enabled: true },
        ...base,
      ]
    }
    if (severity === "medium") {
      return [
        { id: "daily_checkin", time: "21:00", message: "Nhắc nhẹ: ghi 1 dòng cảm xúc hôm nay để theo dõi.", enabled: true },
        ...base,
      ]
    }
    return base
  })()

  return {
    severity,
    focus,
    screening: {
      assessment_id: result.assessment_id,
      title: result.title,
      score: result.score,
      level: result.level,
      ts: result.ts,
    },
    suggestedArticles,
    suggestedTherapy,
    suggestedReminders,
    generated_at: Date.now(),
  }
}

export function getCarePlan(): CarePlan | null {
  try {
    const p = safeJsonParse<CarePlan>(localStorage.getItem(CARE_PLAN_KEY))
    if (!p) return null
    if (!p?.screening?.ts) return null
    return p
  } catch {
    return null
  }
}

function saveCarePlan(plan: CarePlan) {
  try {
    localStorage.setItem(CARE_PLAN_KEY, JSON.stringify(plan))
  } catch {}
}

export function saveScreeningResult(result: ScreeningResult) {
  try {
    localStorage.setItem(LAST_SCREENING_KEY, JSON.stringify(result))
  } catch {}
  try {
    const prev = getScreeningHistory()
    const next = [result, ...prev].slice(0, 100)
    localStorage.setItem(SCREENING_HISTORY_KEY, JSON.stringify(next))
  } catch {}
  try {
    saveCarePlan(deriveCarePlan(result))
  } catch {}
}

export function setPendingScreeningContext(result: ScreeningResult) {
  try {
    sessionStorage.setItem(PENDING_SCREENING_CONTEXT_KEY, JSON.stringify(result))
  } catch {
    try {
      localStorage.setItem(PENDING_SCREENING_CONTEXT_KEY, JSON.stringify(result))
    } catch {}
  }
}

export function consumePendingScreeningContext(): ScreeningResult | null {
  try {
    const raw = sessionStorage.getItem(PENDING_SCREENING_CONTEXT_KEY)
    sessionStorage.removeItem(PENDING_SCREENING_CONTEXT_KEY)
    const parsed = safeJsonParse<ScreeningResult>(raw)
    if (parsed) return parsed
  } catch {}
  try {
    const raw = localStorage.getItem(PENDING_SCREENING_CONTEXT_KEY)
    localStorage.removeItem(PENDING_SCREENING_CONTEXT_KEY)
    return safeJsonParse<ScreeningResult>(raw)
  } catch {
    return null
  }
}
