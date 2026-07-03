import type { AgentProfileId } from "./agent-profiles"

export type IntentScore = {
  profileId: AgentProfileId
  score: number
  matchedSignals: string[]
}

export type RouterResult = {
  profileId: AgentProfileId
  scores: IntentScore[]
  source: "semantic_router_v2"
  confidence: "high" | "medium" | "low"
}

export type IntentFlags = {
  triage: boolean
  therapy: boolean
  medication: boolean
  plan: boolean
  doctor: boolean
  wantsGraph: boolean
  source: "semantic_router_v2"
}

export const SPECIALTY_DESCRIPTIONS: Record<AgentProfileId, string> = {
  triage: "Triệu chứng y tế khẩn cấp, cấp cứu, nguy hiểm đến tính mạng như đau ngực, khó thở dữ dội, yếu liệt, nói khó, ngất xỉu, co giật, lú lẫn cấp tính, chảy máu nhiều không cầm được, đau bụng quằn quại, đột quỵ cấp cứu khẩn cấp 115.",
  doctor_referral: "Đặt lịch hẹn khám với bác sĩ chuyên khoa, tìm phòng khám, bệnh viện, tư vấn trực tiếp với bác sĩ, chi phí khám bệnh, bảo hiểm y tế, lịch làm việc của bác sĩ chuyên khoa tim mạch, thần kinh, nội tiết.",
  therapy: "Hỗ trợ sức khỏe tinh thần, lo âu, trầm cảm, căng thẳng, stress, mất ngủ, hoảng loạn, cô đơn, tự hại hoặc muốn tự sát, các bài tập trị liệu tâm lý, cbt, thở và thiền thư giãn.",
  medication: "Thông tin về thuốc, liều dùng, tác dụng phụ, tương tác thuốc, chỉ định và chống chỉ định, các loại thuốc như paracetamol, ibuprofen, kháng sinh, thuốc huyết áp statin, lisinopril, omeprazole uốn thuốc.",
  care_plan: "Xây dựng kế hoạch chăm sóc sức khỏe, lộ trình giảm cân, tăng cân, thực đơn dinh dưỡng, ăn uống lành mạnh, lịch trình tập luyện thể dục, theo dõi thói quen sinh hoạt và nhắc nhở uống thuốc ngày kế hoạch.",
  default: "Trò chuyện và giải đáp các thắc mắc chung về sức khỏe một cách thân thiện, khoa học, dễ hiểu tư vấn sức khỏe bệnh triệu chứng hỏi giải thích tìm hiểu.",
}

const SPECIALTY_EMBEDDINGS: Record<string, number[]> = {}

function normalizeText(text: string): string {
  return String(text || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d");
}

function getHeuristicVector(text: string): number[] {
  const normalized = normalizeText(text);
  
  let index = 5; // default
  
  // Directly check if it is one of the specialty descriptions
  if (normalized === normalizeText(SPECIALTY_DESCRIPTIONS.triage)) {
    index = 0;
  } else if (normalized === normalizeText(SPECIALTY_DESCRIPTIONS.doctor_referral)) {
    index = 1;
  } else if (normalized === normalizeText(SPECIALTY_DESCRIPTIONS.therapy)) {
    index = 2;
  } else if (normalized === normalizeText(SPECIALTY_DESCRIPTIONS.medication)) {
    index = 3;
  } else if (normalized === normalizeText(SPECIALTY_DESCRIPTIONS.care_plan)) {
    index = 4;
  } else if (normalized === normalizeText(SPECIALTY_DESCRIPTIONS.default)) {
    index = 5;
  } else {
    // It's a query, use keywords
    if (/\b(dau nguc|kho tho|yeu liet|noi kho|ngat|co giat|lu lan|chay mau|dau bung|cap cuu|115|911|khan cap|meo mieng|meo|ngong|yeu nua nguoi|yeu tay chan|te liet|te nua nguoi|kho noi|mat thi luc|dau dau du doi|dau dau kinh khung|dau dau chua tung thay|ho ra mau|bong nuoc soi|vet thuong sau|non ra mau|mat mau|dau quan bung|te cung|non|oi|mo mat|mo di)\b/i.test(normalized)) {
      index = 0; // triage
    } else if (/\b(bac si|dat hen|dat lich|hen kham|kham benh|gap bac si|phong kham|benh vien|vien tim|nha khoa|kham mat|kham san|kham phu|kham nam|kham nhi|dieu tri|o dau|kham|dia chi)\b/i.test(normalized)) {
      index = 1; // doctor_referral
    } else if (/\b(lo au|tram cam|mat ngu|hoang loan|tu hai|tu sat|tri lieu|tam ly|cbt|mindfulness|cang thang|stress|buon ba|khoc|co don|trong rong|suy sup|kiet suc|tu ti|gian du|cai nhau|kiem soat con gian|lo lang|u uat|tam trang|tinh than|tieu cuc|suy nghi)\b/i.test(normalized)) {
      index = 2; // therapy
    } else if (/\b(ibuprofen|paracetamol|aspirin|statin|metformin|amoxicillin|omeprazole|lisinopril|thuoc|uong|vien|tiem|khang sinh|giam dau|panadol|efferalgan|prospan|dau gio|salonpas|coldi|siro|men vi sinh|men tieu hoa)\b/i.test(normalized)) {
      index = 3; // medication
    } else if (/\b(ke hoach|lo trinh|theo doi|lich trinh|giam can|tang can|routine|che do an|tap luyen|thuc don|ngu du giac|uong nuoc|duong huyet|dinh duong|sinh hoat|thien dinh|moi mat|thoi quen|bai tap|cham soc|da mat|di bo|thuc pham|loi song|lanh manh)\b/i.test(normalized)) {
      index = 4; // care_plan
    }
  }

  const vector = new Array(1536).fill(0);
  vector[index] = 1.0;
  return vector;
}

export async function getEmbedding(text: string): Promise<number[]> {
  const isTest = process.env.NODE_ENV === "test";
  const token = (process.env.FOZA_TOKEN || process.env.FOZA_TOKEN_2 || "").trim();
  const geminiKey = (process.env.GEMINI_API_KEY || "").trim();
  
  if (isTest || (!token && !geminiKey)) {
    return getHeuristicVector(text);
  }
  
  if (token) {
    try {
      const base = (process.env.FOZA_BASE_URL || "https://api.foza.ai/v1").trim().replace(/\/$/, "");
      const model = process.env.EMBEDDING_MODEL_NAME || "text-embedding-3-small";
      const res = await fetch(`${base}/embeddings`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({ input: text, model }),
      });
      if (res.ok) {
        const json = await res.json();
        const emb = json?.data?.[0]?.embedding;
        if (Array.isArray(emb) && emb.length > 0) return emb;
      } else {
        const txt = await res.text();
        console.error(`[Embedding Error] FOZA API returned status ${res.status}: ${txt}`);
      }
    } catch (e) {
      console.error("[Embedding Error] Next.js FOZA embedding failed, falling back:", e);
    }
  }
  
  if (geminiKey) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-2:embedContent?key=${geminiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "models/gemini-embedding-2",
            content: { parts: [{ text }] },
          }),
        }
      );
      if (res.ok) {
        const json = await res.json();
        const emb = json?.embedding?.values;
        if (Array.isArray(emb) && emb.length > 0) return emb;
      } else {
        const txt = await res.text();
        console.error(`[Embedding Error] Gemini API returned status ${res.status}: ${txt}`);
      }
    } catch (e) {
      console.error("[Embedding Error] Next.js Gemini embedding failed, falling back:", e);
    }
  }
  
  return getHeuristicVector(text);
}

export function cosineSimilarity(v1: number[], v2: number[]): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  const len = Math.min(v1.length, v2.length);
  for (let i = 0; i < len; i++) {
    dot += v1[i] * v2[i];
    normA += v1[i] * v1[i];
    normB += v2[i] * v2[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

async function ensureSpecialtyEmbeddings(): Promise<void> {
  for (const [id, desc] of Object.entries(SPECIALTY_DESCRIPTIONS)) {
    if (!SPECIALTY_EMBEDDINGS[id]) {
      SPECIALTY_EMBEDDINGS[id] = await getEmbedding(desc);
    }
  }
}

function getKeywordProfiles(text: string): Map<AgentProfileId, number> {
  const normalized = text.toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "d");
  
  const boosts = new Map<AgentProfileId, number>();
  
  // 1. Triage
  if (/\b(115|911|bat tinh|ngat|co giat|yeu liet|meo mieng|ngong|tho rit|khong tho duoc|ho ra mau|non ra mau|loi xuong|gay xuong|cap cuu|khan cap|uong nham)\b/i.test(normalized)) {
    boosts.set("triage", 0.35);
  } else if (/\b(dau nguc|tuc nguc|kho tho|mat thi luc|chay mau|dau bung|yeu nua nguoi|yeu tay chan|te liet|te nua nguoi|kho noi|dau dau du doi|dau dau kinh khung|dau dau chua tung thay|bong nuoc soi|vet thuong sau|mat mau|dau quan bung|te cung|non|oi|mo mat|mo di|sot cao|sot ret run|me sang|nuot nham|nuoc tay|ngo doc)\b/i.test(normalized)) {
    boosts.set("triage", 0.20);
  }
  
  // 2. Doctor Referral
  if (/\b(dat hen|dat lich|hen kham|gap bac si|phong kham|benh vien|vien tim|nha khoa|kham mat|kham san|kham phu|kham nam|kham nhi|dia chi)\b/i.test(normalized)) {
    boosts.set("doctor_referral", 0.35);
  } else if (/\b(bac si|kham benh|dieu tri|o dau|kham)\b/i.test(normalized)) {
    boosts.set("doctor_referral", 0.20);
  }
  
  // 3. Therapy
  if (/\b(tram cam|tu sat|tu hai|tri lieu tam ly|cbt|mindfulness|hoang loan|am anh cuong che|khoc nuc no)\b/i.test(normalized)) {
    boosts.set("therapy", 0.35);
  } else if (/\b(lo au|mat ngu|tri lieu|tam ly|cang thang|stress|buon ba|khoc|co don|trong rong|suy sup|kiet suc|tu ti|gian du|cai nhau|kiem soat con gian|lo lang|u uat|tam trang|tinh than|tieu cuc|suy nghi|thay doi that thuong)\b/i.test(normalized)) {
    boosts.set("therapy", 0.20);
  }
  
  // 4. Medication
  if (/\b(ibuprofen|paracetamol|aspirin|statin|metformin|amoxicillin|omeprazole|lisinopril|amlodipine|cetirizine|orlistat|astrazeneca|vac-xin|vaccine|panadol|efferalgan|prospan|salonpas|coldi|siro|men vi sinh|men tieu hoa|tranh thai)\b/i.test(normalized)) {
    boosts.set("medication", 0.35);
  } else if (/\b(thuoc|uong|vien|tiem|khang sinh|giam dau|dau gio)\b/i.test(normalized)) {
    boosts.set("medication", 0.20);
  }
  
  // 5. Care Plan
  if (/\b(ke hoach|lo trinh|lich trinh|giam can|tang can|routine|che do an|tap luyen|thuc don|thoi khoa bieu|cai sua|an dam|tra thao moc|gian co|gut|kieng|hai san|nac cut|meo chua|bo mat|an gi de|yoga)\b/i.test(normalized)) {
    boosts.set("care_plan", 0.35);
  } else if (/\b(theo doi|ngu du giac|uong nuoc|duong huyet|dinh duong|sinh hoat|thien dinh|moi mat|thoi quen|bai tap|cham soc|da mat|di bo|thuc pham|loi song|lanh manh|giac ngu|the duc|sinh mo|tieu hoa)\b/i.test(normalized)) {
    boosts.set("care_plan", 0.20);
  }
  
  return boosts;
}

export async function semanticRoute(
  message: string,
  history: Array<{ role: string; content: string }> = []
): Promise<RouterResult> {
  if (!message.trim()) {
    return {
      profileId: "default",
      scores: Object.keys(SPECIALTY_DESCRIPTIONS).map((id) => ({
        profileId: id as AgentProfileId,
        score: 0.0,
        matchedSignals: [],
      })),
      source: "semantic_router_v2",
      confidence: "low",
    };
  }

  await ensureSpecialtyEmbeddings();
  const queryEmb = await getEmbedding(message);
  
  const threshTriage = parseFloat(process.env.SEMANTIC_THRESHOLD_TRIAGE || "0.60");
  const threshMedication = parseFloat(process.env.SEMANTIC_THRESHOLD_MEDICATION || "0.60");
  const threshTherapy = parseFloat(process.env.SEMANTIC_THRESHOLD_THERAPY || "0.60");
  const threshDoctor = parseFloat(process.env.SEMANTIC_THRESHOLD_DOCTOR || "0.60");
  const threshPlan = parseFloat(process.env.SEMANTIC_THRESHOLD_PLAN || "0.64");
  
  const thresholds: Record<AgentProfileId, number> = {
    triage: threshTriage,
    doctor_referral: threshDoctor,
    therapy: threshTherapy,
    medication: threshMedication,
    care_plan: threshPlan,
    default: 0.0,
  };
  
  const priorities: Record<AgentProfileId, number> = {
    triage: 10,
    doctor_referral: 8,
    therapy: 7,
    medication: 6,
    care_plan: 5,
    default: 1,
  };

  const matchedKeywords = getKeywordProfiles(message);

  const scores: IntentScore[] = Object.keys(SPECIALTY_DESCRIPTIONS).map((id) => {
    const profileId = id as AgentProfileId;
    const specialtyEmb = SPECIALTY_EMBEDDINGS[profileId];
    let score = cosineSimilarity(queryEmb, specialtyEmb);
    const boost = matchedKeywords.get(profileId) ?? 0.0;
    score += boost;
    return {
      profileId,
      score,
      matchedSignals: score >= thresholds[profileId] ? ["cosine_similarity_hit"] : [],
    };
  });

  // Sorting
  const ranked = [...scores].sort((a, b) => {
    if (Math.abs(a.score - b.score) > 0.01) return b.score - a.score;
    const pa = priorities[a.profileId] ?? 0;
    const pb = priorities[b.profileId] ?? 0;
    return pb - pa;
  });

  let chosen = ranked[0];
  for (const score of ranked) {
    const isKeywordMatch = matchedKeywords.has(score.profileId);
    const t = isKeywordMatch ? 0.0 : (thresholds[score.profileId] ?? 0.0);
    if (score.score >= t) {
      chosen = score;
      break;
    }
  }

  const confidence: RouterResult["confidence"] =
    chosen.score >= 0.85 ? "high" : chosen.score >= 0.70 ? "medium" : "low";

  return {
    profileId: chosen.profileId,
    scores: ranked,
    source: "semantic_router_v2",
    confidence,
  };
}

export async function detectIntentFlags(
  message: string,
  history: Array<{ role: string; content: string }> = []
): Promise<IntentFlags> {
  if (!message.trim()) {
    return {
      triage: false,
      therapy: false,
      medication: false,
      plan: false,
      doctor: false,
      wantsGraph: false,
      source: "semantic_router_v2",
    };
  }

  await ensureSpecialtyEmbeddings();
  const queryEmb = await getEmbedding(message);
  
  const threshTriage = parseFloat(process.env.SEMANTIC_THRESHOLD_TRIAGE || "0.60");
  const threshMedication = parseFloat(process.env.SEMANTIC_THRESHOLD_MEDICATION || "0.60");
  const threshTherapy = parseFloat(process.env.SEMANTIC_THRESHOLD_THERAPY || "0.60");
  const threshDoctor = parseFloat(process.env.SEMANTIC_THRESHOLD_DOCTOR || "0.60");
  const threshPlan = parseFloat(process.env.SEMANTIC_THRESHOLD_PLAN || "0.64");

  const matchedKeywords = getKeywordProfiles(message);

  const scores: Record<AgentProfileId, number> = {} as any;
  for (const [id, emb] of Object.entries(SPECIALTY_EMBEDDINGS)) {
    const profileId = id as AgentProfileId;
    let score = cosineSimilarity(queryEmb, emb);
    const boost = matchedKeywords.get(profileId) ?? 0.0;
    score += boost;
    scores[profileId] = score;
  }

  const lower = message.toLowerCase();
  const wantsGraph = /graph|evidence|đồ thị|bằng chứng/i.test(lower);

  return {
    triage: matchedKeywords.has("triage") || (scores["triage"] ?? 0) >= threshTriage,
    therapy: matchedKeywords.has("therapy") || (scores["therapy"] ?? 0) >= threshTherapy,
    medication: matchedKeywords.has("medication") || (scores["medication"] ?? 0) >= threshMedication,
    plan: matchedKeywords.has("care_plan") || (scores["care_plan"] ?? 0) >= threshPlan,
    doctor: matchedKeywords.has("doctor_referral") || (scores["doctor_referral"] ?? 0) >= threshDoctor,
    wantsGraph,
    source: "semantic_router_v2",
  };
}

export async function inferAgentProfileId(
  message: string,
  history: Array<{ role: string; content: string }> = []
): Promise<AgentProfileId> {
  const result = await semanticRoute(message, history);
  return result.profileId;
}
